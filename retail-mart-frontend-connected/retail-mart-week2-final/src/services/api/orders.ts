import { request, downloadFile } from "@/services/api/client";
import type { Order, OrderStatus } from "@/types";

export function fetchOrders(): Promise<Order[]> {
  return request<Order[]>("/orders");
}

export function fetchOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export interface CreateOrderItem {
  productName: string;
  quantity: number;
  price: number;
}

export function createOrder(values: {
  customer: string;
  customerEmail: string;
  items: CreateOrderItem[];
}): Promise<Order> {
  return request<Order>("/orders", { method: "POST", body: JSON.stringify(values) });
}

export function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return request<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function downloadOrderInvoice(id: string): Promise<void> {
  return downloadFile(`/orders/${id}/invoice`, `invoice-${id}.pdf`);
}
