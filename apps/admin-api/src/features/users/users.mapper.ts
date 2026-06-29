// Maps UserOutput domain objects to user HTTP response shapes.
import type { UserOutput } from "@veritas/services";

export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly status: "ACTIVE" | "SUSPENDED" | "DELETED";
  readonly lastLoginAt: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UserListResponse {
  readonly items: UserResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Convert a single UserOutput to a UserResponse. */
export function toUserResponse(user: UserOutput): UserResponse {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    metadata: user.metadata as Record<string, unknown> | undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Convert a paginated user list to a UserListResponse. */
export function toUserListResponse(result: {
  items: UserOutput[];
  nextCursor: string | null;
  total: number;
}): UserListResponse {
  return {
    items: result.items.map(toUserResponse),
    nextCursor: result.nextCursor,
    total: result.total,
  };
}
