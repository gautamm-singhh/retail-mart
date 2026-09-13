import { request } from "@/services/api/client";

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  sent: boolean;
}

export interface OrderConfirmationResponse {
  sent: boolean;
}

export function sendGenericEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  return request<SendEmailResponse>("/communications/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendOrderConfirmation(orderId: string): Promise<OrderConfirmationResponse> {
  return request<OrderConfirmationResponse>(`/communications/orders/${orderId}/confirmation`, {
    method: "POST",
  });
}
