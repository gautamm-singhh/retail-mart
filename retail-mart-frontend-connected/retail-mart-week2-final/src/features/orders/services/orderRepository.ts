import { fetchOrders, fetchOrder, updateOrderStatus, downloadOrderInvoice } from "@/services/api/orders";
import type { Order, OrderStatus } from "@/types";

export const orderRepository = {
  list: (): Promise<Order[]> => fetchOrders(),
  getById: (id: string): Promise<Order> => fetchOrder(id),

  updateStatus: (id: string, nextStatus: OrderStatus): Promise<Order> =>
    updateOrderStatus(id, nextStatus),

  downloadInvoice: (id: string): Promise<void> => downloadOrderInvoice(id),
};
