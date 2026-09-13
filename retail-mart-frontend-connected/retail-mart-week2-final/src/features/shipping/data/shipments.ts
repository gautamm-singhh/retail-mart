import { Shipment } from "@/types";

// Mock data only - stands in for a future GET /shipments response from
// Sorav's backend. `trackingHistory` exists so the Shipment Details
// tracking timeline has something realistic to render, the same way
// Orders' statusHistory and Payments' history do.
export const mockShipments: Shipment[] = [
  {
    id: "SHP-77001",
    orderId: "ORD-58422",
    customer: "Vikram Shah",
    courier: "Bluedart",
    trackingNumber: "BD3391827",
    status: "Shipped",
    expectedDelivery: "2026-08-19",
    trackingHistory: [
      { status: "Pending", date: "2026-08-14" },
      { status: "Packed", date: "2026-08-15" },
      { status: "Shipped", date: "2026-08-16" },
    ],
  },
  {
    id: "SHP-77002",
    orderId: "ORD-58424",
    customer: "Rahul Verma",
    courier: "Delhivery",
    trackingNumber: "DL8827311",
    status: "Delivered",
    expectedDelivery: "2026-08-17",
    trackingHistory: [
      { status: "Pending", date: "2026-08-15" },
      { status: "Packed", date: "2026-08-15" },
      { status: "Shipped", date: "2026-08-16" },
      { status: "Out for Delivery", date: "2026-08-17" },
      { status: "Delivered", date: "2026-08-17" },
    ],
  },
  {
    id: "SHP-77003",
    orderId: "ORD-58421",
    customer: "Ananya Rao",
    courier: "Ekart",
    trackingNumber: "EK1120984",
    status: "Packed",
    expectedDelivery: "2026-08-20",
    trackingHistory: [
      { status: "Pending", date: "2026-08-14" },
      { status: "Packed", date: "2026-08-15" },
    ],
  },
  {
    id: "SHP-77004",
    orderId: "ORD-58426",
    customer: "Karan Malhotra",
    courier: "Delhivery",
    trackingNumber: "DL8827455",
    status: "Delivered",
    expectedDelivery: "2026-08-16",
    trackingHistory: [
      { status: "Pending", date: "2026-08-16" },
      { status: "Packed", date: "2026-08-16" },
      { status: "Shipped", date: "2026-08-16" },
      { status: "Delivered", date: "2026-08-16" },
    ],
  },
  {
    id: "SHP-77005",
    orderId: "ORD-58427",
    customer: "Divya Nair",
    courier: "Bluedart",
    trackingNumber: "BD3392015",
    status: "Out for Delivery",
    expectedDelivery: "2026-08-19",
    trackingHistory: [
      { status: "Pending", date: "2026-08-17" },
      { status: "Packed", date: "2026-08-17" },
      { status: "Shipped", date: "2026-08-18" },
      { status: "Out for Delivery", date: "2026-08-19" },
    ],
  },
  {
    id: "SHP-77006",
    orderId: "ORD-58423",
    customer: "Priya Menon",
    courier: "Ekart",
    trackingNumber: "—",
    status: "Pending",
    expectedDelivery: "2026-08-22",
    trackingHistory: [{ status: "Pending", date: "2026-08-15" }],
  },
];
