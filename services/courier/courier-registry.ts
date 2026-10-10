// ============================================================================
// Courier Registry — Singleton Provider Registry
// Replaces the switch-case factory with a proper registry pattern
// ============================================================================

import { ICourierProvider, CourierProviderCode } from "@/types/shipping.types";
import { SteadfastProvider } from "./providers/steadfast.provider";
import { PathaoProvider } from "./providers/pathao.provider";
import { RedXProvider } from "./providers/redx.provider";
import { PaperflyProvider } from "./providers/paperfly.provider";
import { SundarbanProvider } from "./providers/sundarban.provider";
import { ECourierProvider } from "./providers/ecourier.provider";
import { DHLProvider } from "./providers/dhl.provider";
import { FedExProvider } from "./providers/fedex.provider";
import { UPSProvider } from "./providers/ups.provider";
import { SandboxProvider } from "./providers/sandbox.provider";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { decryptCredentialsObject } from "@/utils/encryption.util";

type ProviderFactory = (
  config: Record<string, any>,
  isSandbox: boolean
) => ICourierProvider;

const PROVIDER_FACTORIES: Record<CourierProviderCode, ProviderFactory> = {
  steadfast: (c, s) => new SteadfastProvider(c, s),
  pathao: (c, s) => new PathaoProvider(c, s),
  redx: (c, s) => new RedXProvider(c, s),
  paperfly: (c, s) => new PaperflyProvider(c, s),
  sundarban: (c, s) => new SundarbanProvider(c, s),
  ecourier: (c, s) => new ECourierProvider(c, s),
  dhl: (c, s) => new DHLProvider(c, s),
  fedex: (c, s) => new FedExProvider(c, s),
  ups: (c, s) => new UPSProvider(c, s),
  sandbox: (c, s) => new SandboxProvider(c, s),
};

export class CourierRegistry {
  private static instance: CourierRegistry;

  /** Cache: code → instantiated provider */
  private providers: Map<CourierProviderCode, ICourierProvider> = new Map();

  /** Ordered list of active provider codes (by priority ASC) */
  private activeProviders: CourierProviderCode[] = [];

  /** Fallback provider used when the primary fails */
  private fallbackCode: CourierProviderCode | null = null;

  private lastLoadedAt: number = 0;
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

  private constructor() {}

  static getInstance(): CourierRegistry {
    if (!CourierRegistry.instance) {
      CourierRegistry.instance = new CourierRegistry();
    }
    return CourierRegistry.instance;
  }

  /**
   * Load active providers from DB. Caches for TTL_MS milliseconds.
   */
  async load(forceRefresh = false): Promise<void> {
    const now = Date.now();
    if (
      !forceRefresh &&
      now - this.lastLoadedAt < this.TTL_MS &&
      this.providers.size > 0
    ) {
      return;
    }

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("courier_providers")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (error) throw error;

      this.providers.clear();
      this.activeProviders = [];

      for (const row of data ?? []) {
        const code = row.code as CourierProviderCode;
        const factory = PROVIDER_FACTORIES[code];
        if (!factory) continue;

        const decryptedCreds = decryptCredentialsObject(row.credentials ?? {});
        const provider = factory(
          decryptedCreds,
          row.is_sandbox ?? false
        );
        this.providers.set(code, provider);
        this.activeProviders.push(code);
      }

      // Sandbox is always the default fallback in development
      if (!this.providers.has("sandbox")) {
        const sandbox = new SandboxProvider({}, true);
        this.providers.set("sandbox", sandbox);
      }

      this.fallbackCode = "sandbox";
      this.lastLoadedAt = now;
    } catch (err) {
      console.error("[CourierRegistry] Failed to load providers from DB:", err);
      // Ensure sandbox always available as emergency fallback
      if (!this.providers.has("sandbox")) {
        this.providers.set("sandbox", new SandboxProvider({}, true));
      }
    }
  }

  /**
   * Get a provider by code. Throws if not found.
   */
  async get(code: CourierProviderCode): Promise<ICourierProvider> {
    await this.load();

    const provider = this.providers.get(code);
    if (!provider) {
      throw new Error(
        `[CourierRegistry] Provider '${code}' is not registered or inactive.`
      );
    }
    return provider;
  }

  /**
   * Get all active providers in priority order.
   */
  async getActive(): Promise<ICourierProvider[]> {
    await this.load();
    return this.activeProviders
      .map((code) => this.providers.get(code)!)
      .filter(Boolean);
  }

  /**
   * Get the configured fallback provider.
   */
  async getFallback(): Promise<ICourierProvider | null> {
    if (!this.fallbackCode) return null;
    return this.providers.get(this.fallbackCode) ?? null;
  }

  /**
   * Set the fallback provider code.
   */
  setFallback(code: CourierProviderCode): void {
    this.fallbackCode = code;
  }

  /**
   * Register a provider manually (useful for tests).
   */
  register(code: CourierProviderCode, provider: ICourierProvider): void {
    this.providers.set(code, provider);
    if (!this.activeProviders.includes(code)) {
      this.activeProviders.push(code);
    }
  }

  /**
   * Check if a provider is registered.
   */
  async has(code: CourierProviderCode): Promise<boolean> {
    await this.load();
    return this.providers.has(code);
  }

  /**
   * Invalidate the cache to force a fresh DB load.
   */
  invalidate(): void {
    this.lastLoadedAt = 0;
  }

  /** For testing only */
  reset(): void {
    this.providers.clear();
    this.activeProviders = [];
    this.lastLoadedAt = 0;
    this.fallbackCode = null;
  }
}
