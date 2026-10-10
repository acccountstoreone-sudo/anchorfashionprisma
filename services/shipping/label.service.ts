// ============================================================================
// Label Service
// ============================================================================

import { ShipmentRepository } from "@/repositories/shipment.repository";
import { CourierGatewayService } from "@/services/courier/courier-gateway.service";
import { ManifestEntry } from "@/types/shipping.types";

export class LabelService {
  private shipmentRepo: ShipmentRepository;

  constructor() {
    this.shipmentRepo = new ShipmentRepository();
  }

  /**
   * Generate a shipping label for a single shipment.
   * Returns the label URL or null.
   */
  async generateLabel(
    shipmentId: string,
    generatedBy?: string
  ): Promise<{ labelUrl: string; labelData?: string } | null> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) return null;

    if (!shipment.courier_provider_code || !shipment.consignment_id) {
      throw new Error("Shipment has no courier assigned or no consignment ID");
    }

    const result = await CourierGatewayService.generateLabel(
      shipment.courier_provider_code,
      shipment.consignment_id
    );

    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? "Failed to generate label");
    }

    const { labelUrl, labelData } = result.data;

    // Save label record
    await this.shipmentRepo.saveLabel(shipmentId, {
      label_type: "pdf",
      label_url: labelUrl,
      label_data: labelData ?? null,
    });

    // Update shipment
    await this.shipmentRepo.updateShipment(shipmentId, {
      label_url: labelUrl,
      label_generated_at: new Date().toISOString(),
    });

    return { labelUrl, labelData };
  }

  /**
   * Record that a label was printed and increment print count.
   */
  async recordPrint(shipmentId: string): Promise<void> {
    const labels = await this.shipmentRepo.getLabels(shipmentId);
    const latest = labels[0];
    if (!latest) return;

    await this.shipmentRepo.incrementLabelPrintCount(latest.id);
  }

  /**
   * Generate a manifest for multiple shipments (for handover to courier).
   * Returns structured manifest data — PDF generation is a future enhancement.
   */
  async generateManifest(shipmentIds: string[]): Promise<ManifestEntry[]> {
    const entries: ManifestEntry[] = [];

    for (const id of shipmentIds) {
      const details = await this.shipmentRepo.getShipmentWithDetails(id);
      if (!details) continue;

      entries.push({
        shipmentNumber: details.shipment_number,
        orderNumber: details.order_number ?? "",
        trackingNumber: details.tracking_number,
        recipientName: details.recipient_name,
        recipientPhone: details.recipient_phone,
        recipientAddress: details.recipient_address,
        weight: details.weight_kg,
        codAmount: details.cod_amount,
        isCOD: details.is_cod,
      });
    }

    return entries;
  }
}
