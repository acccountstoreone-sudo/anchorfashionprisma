// ============================================================================
// Rate Calculator Service
// ============================================================================

import { DeliveryZoneRepository } from "@/repositories/delivery-zone.repository";
import {
  ShippingChargeCalculation,
  DeliveryZone,
  ShippingRate,
} from "@/types/shipping.types";

export class RateCalculatorService {
  private zoneRepo: DeliveryZoneRepository;

  constructor() {
    this.zoneRepo = new DeliveryZoneRepository();
  }

  /**
   * Resolve the delivery zone from a customer's district or city.
   */
  async getZoneByAddress(
    district: string,
    city?: string
  ): Promise<DeliveryZone | null> {
    return this.zoneRepo.getZoneByAddress(district, city);
  }

  /**
   * Calculate shipping charge for given parameters.
   */
  async calculateShippingCharge(
    zoneId: string,
    weightKg: number,
    orderValue: number,
    isCOD: boolean
  ): Promise<ShippingChargeCalculation> {
    const zone = await this.zoneRepo.getZoneById(zoneId);
    const rates = await this.zoneRepo.getShippingRates(zoneId);

    const applicableRates = rates.filter(
      (r) =>
        r.is_active &&
        r.is_cod_rate === isCOD &&
        weightKg >= r.min_weight_kg &&
        (r.max_weight_kg === null || weightKg <= r.max_weight_kg)
    );

    if (applicableRates.length === 0) {
      return {
        baseRate: 0,
        weightCharge: 0,
        codCharge: 0,
        total: 0,
        isFreeShipping: false,
        zone,
        rate: null,
      };
    }

    // Pick cheapest applicable rate
    const rate = applicableRates.reduce((a, b) =>
      a.base_rate <= b.base_rate ? a : b
    );

    // Check free shipping threshold
    const isFreeShipping =
      rate.free_shipping_above !== null &&
      orderValue >= rate.free_shipping_above;

    if (isFreeShipping) {
      return {
        baseRate: 0,
        weightCharge: 0,
        codCharge: isCOD ? rate.cod_charge : 0,
        total: isCOD ? rate.cod_charge : 0,
        isFreeShipping: true,
        zone,
        rate,
      };
    }

    const baseRate = rate.base_rate;
    const weightCharge = weightKg * rate.per_kg_rate;
    const codCharge = isCOD ? rate.cod_charge : 0;
    const total = baseRate + weightCharge + codCharge;

    return {
      baseRate,
      weightCharge,
      codCharge,
      total,
      isFreeShipping: false,
      zone,
      rate,
    };
  }

  /**
   * Check if COD is available in a zone.
   */
  async isCODAvailable(zoneId: string): Promise<boolean> {
    const zone = await this.zoneRepo.getZoneById(zoneId);
    return zone?.is_cod_available ?? false;
  }

  /**
   * Check if free shipping applies.
   */
  async isFreeShipping(
    zoneId: string,
    orderValue: number,
    isCOD: boolean
  ): Promise<boolean> {
    const rates = await this.zoneRepo.getShippingRates(zoneId);
    return rates.some(
      (r) =>
        r.is_active &&
        r.is_cod_rate === isCOD &&
        r.free_shipping_above !== null &&
        orderValue >= r.free_shipping_above
    );
  }

  /**
   * Get all active delivery zones.
   */
  async getActiveZones(): Promise<DeliveryZone[]> {
    return this.zoneRepo.getAllActiveZones();
  }
}
