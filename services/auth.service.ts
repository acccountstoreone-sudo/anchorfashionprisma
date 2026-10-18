import { authClient } from "@/lib/auth/client";
import {
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
} from "@/schemas/auth.schema";

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterFormValues) {
    const { data: authData, error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: `${data.firstName} ${data.lastName}`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return authData;
  }

  /**
   * Login with email and password
   */
  static async login(data: LoginFormValues) {
    const { data: authData, error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return authData;
  }

  /**
   * Login with magic link
   */
  static async loginWithMagicLink(email: string) {
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Login with OAuth Provider
   */
  static async loginWithProvider(
    provider: "google" | "github" | "facebook" | "apple"
  ) {
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "localhost:3000";

    const { data, error } = await authClient.signIn.social({
      provider,
      callbackURL: `${protocol}://${host}/api/auth/callback`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Log out the current user
   */
  static async logout() {
    const { error } = await authClient.signOut();

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Reset Password Request (Forgot Password)
   */
  static async requestPasswordReset(email: string) {
    const { error } = await (authClient as any).forgetPassword({
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Update Password (Reset Password Flow)
   */
  static async updatePassword(data: ResetPasswordFormValues) {
    // Note: Assuming newPassword exists for this operation in Neon Auth
    const { error } = await authClient.resetPassword({
      newPassword: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Get the current user session
   */
  static async getSession() {
    const { data, error } = await authClient.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get the current user
   */
  static async getUser() {
    const { data, error } = await authClient.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return data?.user || null;
  }
}
