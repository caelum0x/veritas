// Utility to send a structured ApiFailure JSON response with appropriate status code.
import type { Response } from "express";
import type { ErrorDetails } from "@veritas/core";

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, details: details ?? null },
  });
}
