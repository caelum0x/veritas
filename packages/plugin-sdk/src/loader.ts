// Plugin loader port — dynamic import abstraction for loading plugin modules.
import { ok, err, type Result } from "@veritas/core";
import type { VerifierPlugin } from "./plugin.js";
import { safeParseManifest } from "./manifest.js";
import { PluginLoadError } from "./errors.js";

/**
 * Port interface for loading a plugin by module specifier.
 * Production implementations resolve ESM modules; tests inject in-memory mocks.
 */
export interface PluginLoaderPort {
  /**
   * Load and return a VerifierPlugin from the given specifier.
   * The specifier may be a package name, file path, or URL string.
   */
  load(specifier: string): Promise<Result<VerifierPlugin>>;
}

/** Descriptor for a plugin load request. */
export interface PluginLoadRequest {
  /** Module specifier (package name, file:// URL, or relative path). */
  readonly specifier: string;
  /** Optional override config merged into the plugin context at activation time. */
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * In-memory loader that resolves plugins from a pre-registered map.
 * Used in tests and embedded environments where dynamic import is unavailable.
 */
export class InMemoryPluginLoader implements PluginLoaderPort {
  private readonly plugins: Map<string, VerifierPlugin>;

  constructor(plugins: ReadonlyArray<VerifierPlugin> = []) {
    this.plugins = new Map(plugins.map((p) => [p.id, p]));
  }

  /** Register an additional plugin with this loader (mutates the internal map). */
  register(plugin: VerifierPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  async load(specifier: string): Promise<Result<VerifierPlugin>> {
    const plugin = this.plugins.get(specifier);
    if (plugin === undefined) {
      return err(
        new PluginLoadError(
          specifier,
          "No plugin registered in InMemoryPluginLoader for this specifier",
        ),
      );
    }
    const parsed = safeParseManifest(plugin.manifest);
    if (!parsed.success) {
      return err(
        new PluginLoadError(
          specifier,
          `Invalid manifest: ${parsed.error.message}`,
        ),
      );
    }
    return ok(plugin);
  }
}

/**
 * Load a plugin using the provided loader port and validate its manifest.
 * Returns a typed Result so callers can handle load errors without throwing.
 */
export async function loadPlugin(
  loader: PluginLoaderPort,
  request: PluginLoadRequest,
): Promise<Result<VerifierPlugin>> {
  try {
    const result = await loader.load(request.specifier);
    if (!result.ok) return result;

    const parsed = safeParseManifest(result.value.manifest);
    if (!parsed.success) {
      return err(
        new PluginLoadError(
          request.specifier,
          `Manifest validation failed: ${parsed.error.message}`,
        ),
      );
    }

    return ok(result.value);
  } catch (e) {
    return err(
      new PluginLoadError(
        request.specifier,
        `Unexpected error: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}
