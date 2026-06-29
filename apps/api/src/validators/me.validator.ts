// Zod validators for /me endpoint request bodies and params
import { z } from "zod";
import { UpdateUserSchema } from "@veritas/contracts";

export const UpdateMeSchema = UpdateUserSchema;

export type UpdateMeBody = z.infer<typeof UpdateMeSchema>;

export const MeParamsSchema = z.object({});

export type MeParams = z.infer<typeof MeParamsSchema>;
