import { PaymentProviderCode } from "@/types/payment.types";
import { BasePaymentProvider } from "./providers/base.provider";
import { SSLCommerzProvider } from "./providers/sslcommerz.provider";
import { BKashProvider } from "./providers/bkash.provider";
import { NagadProvider } from "./providers/nagad.provider";
import { RocketProvider } from "./providers/rocket.provider";
import { VisaProvider } from "./providers/visa.provider";
import { MasterCardProvider } from "./providers/mastercard.provider";
import { CODProvider } from "./providers/cod.provider";

export class PaymentProviderFactory {
  /**
   * Create an instance of a payment provider.
   * @param providerCode The unique code of the provider.
   * @param config The provider's configuration.
   * @returns An instance of BasePaymentProvider.
   */
  static createProvider(
    providerCode: PaymentProviderCode,
    config: Record<string, any>
  ): BasePaymentProvider {
    switch (providerCode) {
      case "sslcommerz":
        return new SSLCommerzProvider(config);
      case "bkash":
        return new BKashProvider(config);
      case "nagad":
        return new NagadProvider(config);
      case "rocket":
        return new RocketProvider(config);
      case "visa":
        return new VisaProvider(config);
      case "mastercard":
        return new MasterCardProvider(config);
      case "cod":
        return new CODProvider(config);
      default:
        throw new Error(`Unsupported payment provider: ${providerCode}`);
    }
  }
}
