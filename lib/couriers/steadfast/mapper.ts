import { TrackingResult } from "../types";

export type SteadfastNormalizedStatus = TrackingResult["currentStatusNormalized"];

/**
 * Maps Steadfast order/delivery status strings to normalized shipment statuses
 */
export function mapSteadfastStatus(status: string | undefined): SteadfastNormalizedStatus {
  if (!status) return "unknown";

  const s = status.toLowerCase().replace(/[\s_-]+/g, "");

  switch (s) {
    case "inreview":
    case "pending":
      return "created";
    case "hold":
    case "pendingpickup":
      return "pickup_requested";
    case "pickedup":
    case "pickuppending":
      return "picked_up";
    case "intransit":
    case "transit":
    case "atdestination":
      return "in_transit";
    case "outfordelivery":
      return "out_for_delivery";
    case "delivered":
    case "partialdelivered":
      return "delivered";
    case "cancelled":
    case "ordercancelled":
      return "cancelled";
    case "cancelledbycustomer":
    case "failed":
      return "delivery_failed";
    case "return":
    case "returned":
    case "returntoorigin":
      return "returned_to_origin";
    default:
      return "unknown";
  }
}
