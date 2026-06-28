// Resource descriptor — describes the entity producing telemetry (service, host, process).

import { z } from "zod";
import { ResourceAttributes } from "./attributes.js";

/** Schema for resource configuration. */
export const ResourceConfigSchema = z.object({
  serviceName: z.string().min(1),
  serviceVersion: z.string().min(1).default("0.0.0"),
  serviceNamespace: z.string().optional(),
  serviceInstanceId: z.string().optional(),
  deploymentEnvironment: z.string().optional(),
  /** Extra arbitrary attributes merged into the resource. */
  extraAttributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;

/** Immutable bag of key-value attributes identifying the telemetry source. */
export interface Resource {
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  /** Returns a new Resource merged with the given attributes (right-wins). */
  merge(extra: Record<string, string | number | boolean>): Resource;
}

class ResourceImpl implements Resource {
  readonly attributes: Readonly<Record<string, string | number | boolean>>;

  constructor(attrs: Record<string, string | number | boolean>) {
    this.attributes = Object.freeze({ ...attrs });
  }

  merge(extra: Record<string, string | number | boolean>): Resource {
    return new ResourceImpl({ ...this.attributes, ...extra });
  }
}

/** Build a Resource from a validated config object. */
export function createResource(config: ResourceConfig): Resource {
  const parsed = ResourceConfigSchema.parse(config);

  const attrs: Record<string, string | number | boolean> = {
    [ResourceAttributes.SERVICE_NAME]: parsed.serviceName,
    [ResourceAttributes.SERVICE_VERSION]: parsed.serviceVersion,
    [ResourceAttributes.TELEMETRY_SDK_NAME]: "@veritas/otel",
    [ResourceAttributes.TELEMETRY_SDK_LANGUAGE]: "nodejs",
  };

  if (parsed.serviceNamespace !== undefined) {
    attrs[ResourceAttributes.SERVICE_NAMESPACE] = parsed.serviceNamespace;
  }
  if (parsed.serviceInstanceId !== undefined) {
    attrs[ResourceAttributes.SERVICE_INSTANCE_ID] = parsed.serviceInstanceId;
  }
  if (parsed.deploymentEnvironment !== undefined) {
    attrs[ResourceAttributes.DEPLOYMENT_ENVIRONMENT] = parsed.deploymentEnvironment;
  }
  if (typeof process !== "undefined") {
    attrs[ResourceAttributes.HOST_NAME] = (
      typeof process.env["HOSTNAME"] === "string"
        ? process.env["HOSTNAME"]
        : "unknown"
    );
    attrs[ResourceAttributes.PROCESS_PID] = process.pid;
  }
  if (parsed.extraAttributes) {
    Object.assign(attrs, parsed.extraAttributes);
  }

  return new ResourceImpl(attrs);
}

/** An empty resource with no attributes. */
export const emptyResource: Resource = new ResourceImpl({});

/** Detect service name from NODE_ENV / npm_package_name environment variables. */
export function detectResource(): Resource {
  const serviceName =
    process.env["OTEL_SERVICE_NAME"] ??
    process.env["npm_package_name"] ??
    "unknown_service";

  const serviceVersion =
    process.env["OTEL_SERVICE_VERSION"] ??
    process.env["npm_package_version"] ??
    "0.0.0";

  const deploymentEnvironment =
    process.env["DEPLOYMENT_ENV"] ??
    process.env["NODE_ENV"] ??
    "development";

  return createResource({ serviceName, serviceVersion, deploymentEnvironment });
}
