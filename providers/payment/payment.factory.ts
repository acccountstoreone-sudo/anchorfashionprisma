import { IPaymentProvider } from "./payment.interface";
import { paymentRepository } from "@/repositories/payment.repository";
import { MockProvider } from "./mock.provider";
import { CodProvider } from "./cod.provider";
import { BKashPaymentProvider } from "./bkash.provider";
import { SSLCommerzPaymentProvider } from "./sslcommerz.provider";

export class PaymentProviderFactory {
  private static instance: PaymentProviderFactory;
  private providers: Map<string, IPaymentProvider> = new Map();

  private constructor() {
    this.registerProvider(new SSLCommerzPaymentProvider("sslcommerz"));
    this.registerProvider(new BKashPaymentProvider());
    this.registerProvider(new MockProvider("nagad"));
    this.registerProvider(new MockProvider("rocket"));
    this.registerProvider(new SSLCommerzPaymentProvider("visa"));
    this.registerProvider(new SSLCommerzPaymentProvider("mastercard"));
    this.registerProvider(new CodProvider());
  }

  public static getInstance(): PaymentProviderFactory {
    if (!PaymentProviderFactory.instance) {
      PaymentProviderFactory.instance = new PaymentProviderFactory();
    }
    return PaymentProviderFactory.instance;
  }

  private registerProvider(provider: IPaymentProvider) {
    this.providers.set(provider.getCode(), provider);
  }

  public getProvider(code: string): IPaymentProvider {
    const provider = this.providers.get(code);
    if (!provider) {
      throw new Error(`Payment provider not found for code: ${code}`);
    }
    return provider;
  }

  public async getActiveProvider(code: string): Promise<IPaymentProvider> {
    const dbProvider = await paymentRepository.getProviderByCode(code);
    if (!dbProvider || dbProvider.status !== "active") {
      throw new Error(`Provider ${code} is not active or does not exist`);
    }
    return this.getProvider(code);
  }

  public async getFallbackProvider(): Promise<IPaymentProvider> {
    const dbProvider = await paymentRepository.getFallbackProvider();
    if (!dbProvider) {
      throw new Error("No fallback payment provider configured");
    }
    return this.getProvider(dbProvider.code);
  }
}

export const paymentFactory = PaymentProviderFactory.getInstance();
