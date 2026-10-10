import { Metadata } from "next";
import { StoreSettingsClient } from "./store-client";
import { ShippingSettingsClient } from "./ShippingSettingsClient";
import { getStoreConfig } from "@/lib/actions/settings.actions";
import { getDeliveryZonesWithRates } from "@/lib/actions/shipping.actions";

export const metadata: Metadata = {
  title: "Store Settings | Admin",
};

export default async function StoreSettingsPage() {
  const [storeConfig, zonesResult] = await Promise.all([
    getStoreConfig(),
    getDeliveryZonesWithRates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your store's basic information, localization, and shipping rates.
        </p>
      </div>

      <StoreSettingsClient initialConfig={storeConfig} />

      <ShippingSettingsClient zones={zonesResult.data ?? []} />
    </div>
  );
}
