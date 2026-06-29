// Input/output DTOs for service-catalog application service use-cases.
import { z } from "zod";
import {
  ServiceSchema,
  CreateServiceSchema,
  UpdateServiceSchema,
} from "@veritas/contracts";

/** Input DTO for publishing a new priced CAP service. */
export const CreateServiceInputSchema = CreateServiceSchema;
export type CreateServiceInput = z.infer<typeof CreateServiceInputSchema>;

/** Input DTO for updating an existing service entry. */
export const UpdateServiceInputSchema = UpdateServiceSchema;
export type UpdateServiceInput = z.infer<typeof UpdateServiceInputSchema>;

/** Query options for listing catalog services. */
export const ListServicesInputSchema = z.object({
  activeOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListServicesInput = z.infer<typeof ListServicesInputSchema>;

/** Output DTO: a single service record. */
export const ServiceOutputSchema = ServiceSchema;
export type ServiceOutput = z.infer<typeof ServiceOutputSchema>;

/** Output DTO: paginated list of services. */
export const ServiceListOutputSchema = z.object({
  items: z.array(ServiceSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type ServiceListOutput = z.infer<typeof ServiceListOutputSchema>;

/** Input DTO for toggling a service's active flag. */
export const SetServiceActiveInputSchema = z.object({
  serviceId: z.string().min(1),
  active: z.boolean(),
});
export type SetServiceActiveInput = z.infer<typeof SetServiceActiveInputSchema>;
