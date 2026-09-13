import { fetchShipments, createShipment, updateShipmentStatus } from "@/services/api/shipping";
import type { Shipment, ShipmentFormValues } from "@/types";

export const shipmentRepository = {
  list: (): Promise<Shipment[]> => fetchShipments(),
  create: (values: ShipmentFormValues): Promise<Shipment> => createShipment(values),
  updateStatus: (id: string, status: string, location?: string, note?: string): Promise<Shipment> =>
    updateShipmentStatus(id, status, location, note),
};
