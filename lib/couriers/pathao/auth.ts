import { CourierAuthError, CourierNotConfiguredError } from "../errors";

export interface PathaoCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId?: string;
}

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// In-memory cache per clientId to preserve tokens across requests in server lifecycle
const tokenStore = new Map<string, TokenCache>();

export class PathaoAuthManager {
  private readonly baseUrl: string;
  private readonly creds: PathaoCredentials;

  constructor(baseUrl: string, creds: PathaoCredentials) {
    this.baseUrl = baseUrl;
    this.creds = creds;
  }

  isConfigured(): boolean {
    return Boolean(
      this.creds.clientId?.trim() &&
        this.creds.clientSecret?.trim() &&
        this.creds.username?.trim() &&
        this.creds.password?.trim()
    );
  }

  /**
   * Retrieves a valid Bearer token, refreshing or fetching anew as needed.
   */
  async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("pathao");
    }

    const cacheKey = `${this.creds.clientId}:${this.creds.username}`;
    const cached = tokenStore.get(cacheKey);

    // If token exists and is valid for at least 60 more seconds, reuse it
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    // Attempt refresh if refresh_token is available
    if (cached?.refreshToken) {
      try {
        const refreshed = await this.refreshToken(cached.refreshToken);
        if (refreshed) {
          tokenStore.set(cacheKey, refreshed);
          return refreshed.accessToken;
        }
      } catch {
        // Fall back to full re-authentication
      }
    }

    // Authenticate with password grant
    const newToken = await this.issueTokenPassword();
    tokenStore.set(cacheKey, newToken);
    return newToken.accessToken;
  }

  private async issueTokenPassword(): Promise<TokenCache> {
    try {
      const response = await fetch(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: this.creds.clientId,
          client_secret: this.creds.clientSecret,
          username: this.creds.username,
          password: this.creds.password,
          grant_type: "password",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        throw new CourierAuthError(
          "pathao",
          data.message || data.error_description || `HTTP ${response.status} failed to issue token`
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || "",
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      };
    } catch (err: any) {
      if (err instanceof CourierAuthError) throw err;
      throw new CourierAuthError("pathao", `Network error during token issue: ${err.message}`);
    }
  }

  private async refreshToken(refreshToken: string): Promise<TokenCache | null> {
    const response = await fetch(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token) return null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
  }

  clearCache(): void {
    const cacheKey = `${this.creds.clientId}:${this.creds.username}`;
    tokenStore.delete(cacheKey);
  }
}
