import { fetchOrders, fetchOrder, updateOrderStatus, downloadOrderInvoice } from "@/services/api/orders";
import type { Order, OrderStatus } from "@/types";

export const orderRepository = {
  list: (): Promise<Order[]> => fetchOrders(),
  getById: (id: string): Promise<Order> => fetchOrder(id),

  /**
   * Moves an order to `nextStatus`. The backend (see
   * PATCH /orders/<id>/status) enforces ORDER_STATUS_TRANSITIONS and
   * responds 409 if the transition isn't allowed - callers should catch
   * ApiError and check `.status === 409` for that case.
   */
  updateStatus: (id: string, nextStatus: OrderStatus): Promise<Order> =>
    updateOrderStatus(id, nextStatus),

  /** Triggers a browser download of the order's invoice PDF. */
  downloadInvoice: (id: string): Promise<void> => downloadOrderInvoice(id),
};
