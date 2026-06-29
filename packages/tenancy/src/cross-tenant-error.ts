// Error thrown when an operation crosses tenant isolation boundaries
import { AppError } from "@veritas/core";

export class CrossTenantError extends AppError {
  constructor(message = "Cross-tenant access is not permitted") {
    super("FORBIDDEN", 403, "Cross-tenant access is not permitted", { message });
    this.name = "CrossTenantError";
  }
}
