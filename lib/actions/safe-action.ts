import { z } from "zod";
import { auth, getServerSession } from "@/lib/auth/server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export type ActionState<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[] | undefined>; // Form validation errors
};

type ProtectedActionContext = {
  user: any; // Better Auth user type
};

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Creates a public server action with Zod validation.
 */
export function createSafeAction<Input, Output>(
  schema: z.Schema<Input>,
  handler: (parsedInput: Input) => Promise<Output>
) {
  return async (input: Input): Promise<ActionState<Output>> => {
    try {
      const parsedInput = schema.parse(input);
      const data = await handler(parsedInput);
      return { success: true, data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: "Validation failed",
          errors: error.flatten().fieldErrors,
        };
      }
      if (error instanceof DatabaseError) {
        return { success: false, error: error.message };
      }
      console.error("[Action Error]:", error);
      return { success: false, error: "An unexpected error occurred." };
    }
  };
}

/**
 * Creates an authenticated server action.
 * Automatically verifies the user's session before executing the handler.
 */
export function createProtectedAction<Input, Output>(
  schema: z.Schema<Input>,
  handler: (parsedInput: Input, ctx: ProtectedActionContext) => Promise<Output>
) {
  return async (input: Input): Promise<ActionState<Output>> => {
    try {
      const { user } = await getServerSession();

      if (!user) {
        return { success: false, error: "Unauthorized. Please log in." };
      }

      const parsedInput = schema.parse(input);
      const data = await handler(parsedInput, { user });
      return { success: true, data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: "Validation failed",
          errors: error.flatten().fieldErrors,
        };
      }
      if (error instanceof DatabaseError) {
        return { success: false, error: error.message };
      }
      console.error("[Protected Action Error]:", error);
      return { success: false, error: "An unexpected error occurred." };
    }
  };
}

/**
 * Creates an admin-only server action.
 * Verifies that the authenticated user possesses an 'admin' or 'manager' role.
 */
export function createAdminAction<Input, Output>(
  schema: z.Schema<Input>,
  handler: (parsedInput: Input, ctx: ProtectedActionContext) => Promise<Output>
) {
  return async (input: Input): Promise<ActionState<Output>> => {
    try {
      const { user } = await getServerSession();

      if (!user) {
        return { success: false, error: "Unauthorized. Please log in." };
      }

      // Normalize role checking and safely resolve user role
      let role = String((user as any).role || (user as any).user_metadata?.role || "").trim().toUpperCase();

      if (!role || role === "CUSTOMER") {
        const isUuid =
          user.id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            user.id
          );
        const profile = await prisma.profile.findFirst({
          where: {
            OR: [
              ...(isUuid ? [{ id: user.id }] : []),
              ...(user.email ? [{ email: user.email }] : []),
            ],
          },
          include: { role: true },
        });
        if (profile?.role?.name) {
          role = profile.role.name.trim().toUpperCase();
        }
      }

      const normalizedRole = role.replace(/[\s_-]+/g, "");
      const isAllowed = [
        "ADMIN",
        "SUPERADMIN",
        "MANAGER",
        "WAREHOUSEMANAGER",
        "MARKETINGMANAGER",
        "FINANCEMANAGER",
        "MARKETING",
        "STAFF",
        "SUPPORT",
        "OPERATIONS",
      ].includes(normalizedRole);

      if (!isAllowed) {
        console.warn(`[Admin Action] Access denied for user ${user.id} with role: ${role}`);
        return { success: false, error: "Forbidden. Insufficient permissions." };
      }

      const parsedInput = schema.parse(input);
      const data = await handler(parsedInput, { user });
      return { success: true, data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        const firstError = Object.values(fieldErrors)[0]?.[0];
        return {
          success: false,
          error: firstError || "Validation failed. Please check the form fields.",
          errors: fieldErrors,
        };
      }
      if (error instanceof DatabaseError) {
        return { success: false, error: error.message };
      }
      // Surface the real error message for debugging instead of hiding it
      const message = error?.message || "An unexpected error occurred.";
      console.error("[Admin Action Error]:", error);
      return { success: false, error: message };
    }
  };
}
