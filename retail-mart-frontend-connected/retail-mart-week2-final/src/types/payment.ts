export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";
export type PaymentMethod =
  "Card" | "UPI" | "Net Banking" | "Cash on Delivery" | "Wallet";

export interface PaymentStatusEvent {
  status: PaymentStatus;
  date: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customer: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  history: PaymentStatusEvent[];
}
