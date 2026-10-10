import { TrackingResult } from "../types";

export type PathaoNormalizedStatus = TrackingResult["currentStatusNormalized"];

/**
 * Maps Pathao order statuses to normalized shipment statuses
 */
export function mapPathaoStatus(status: string | undefined): PathaoNormalizedStatus {
  if (!status) return "unknown";

  const s = status.toLowerCase().replace(/[\s_-]+/g, "");

  switch (s) {
    case "pending":
    case "ordercreated":
      return "created";
    case "pickuprequested":
      return "pickup_requested";
    case "pickedup":
    case "assignforpickup":
      return "picked_up";
    case "intransit":
    case "transit":
    case "attransferhub":
    case "receivedatdeliveryhub":
      return "in_transit";
    case "outfordelivery":
    case "assignfordelivery":
      return "out_for_delivery";
    case "delivered":
    case "partialdelivered":
      return "delivered";
    case "failed":
    case "deliveryfailed":
    case "hold":
    case "onhold":
      return "delivery_failed";
    case "return":
    case "returned":
    case "returntoorigin":
    case "returnedtoorigin":
      return "returned_to_origin";
    case "cancelled":
    case "ordercancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}
