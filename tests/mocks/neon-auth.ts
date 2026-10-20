export function createAuthClient() {
  return {
    signOut: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    getSession: async () => ({ data: null, error: null }),
  };
}

export class AuthError extends Error {}
export class AuthApiError extends Error {}
export const isAuthError = () => false;
export const isAuthApiError = () => false;
