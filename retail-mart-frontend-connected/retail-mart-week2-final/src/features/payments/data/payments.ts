import { Payment } from "@/types";

// Mock data only - stands in for a future GET /payments response from
// Sorav's backend. `history` exists so the Payment Details workflow has
// something realistic to render.
export const mockPayments: Payment[] = [
  {
    id: "PAY-90211",
    orderId: "ORD-58421",
    customer: "Ananya Rao",
    amount: 3298,
    method: "UPI",
    status: "Paid",
    date: "2026-08-14",
    history: [
      { status: "Pending", date: "2026-08-14" },
      { status: "Paid", date: "2026-08-14" },
    ],
  },
  {
    id: "PAY-90212",
    orderId: "ORD-58422",
    customer: "Vikram Shah",
    amount: 899,
    method: "Card",
    status: "Paid",
    date: "2026-08-14",
    history: [
      { status: "Pending", date: "2026-08-14" },
      { status: "Paid", date: "2026-08-14" },
    ],
  },
  {
    id: "PAY-90213",
    orderId: "ORD-58423",
    customer: "Priya Menon",
    amount: 5498,
    method: "Net Banking",
    status: "Pending",
    date: "2026-08-15",
    history: [{ status: "Pending", date: "2026-08-15" }],
  },
  {
    id: "PAY-90214",
    orderId: "ORD-58424",
    customer: "Rahul Verma",
    amount: 1499,
    method: "Card",
    status: "Paid",
    date: "2026-08-15",
    history: [
      { status: "Pending", date: "2026-08-15" },
      { status: "Paid", date: "2026-08-15" },
    ],
  },
  {
    id: "PAY-90215",
    orderId: "ORD-58425",
    customer: "Sneha Iyer",
    amount: 2499,
    method: "Card",
    status: "Failed",
    date: "2026-08-16",
    history: [
      { status: "Pending", date: "2026-08-16" },
      { status: "Failed", date: "2026-08-16" },
    ],
  },
  {
    id: "PAY-90216",
    orderId: "ORD-58426",
    customer: "Karan Malhotra",
    amount: 799,
    method: "Cash on Delivery",
    status: "Paid",
    date: "2026-08-16",
    history: [{ status: "Paid", date: "2026-08-16" }],
  },
  {
    id: "PAY-90217",
    orderId: "ORD-58427",
    customer: "Divya Nair",
    amount: 4198,
    method: "Wallet",
    status: "Paid",
    date: "2026-08-17",
    history: [
      { status: "Pending", date: "2026-08-17" },
      { status: "Paid", date: "2026-08-17" },
    ],
  },
  {
    id: "PAY-90218",
    orderId: "ORD-58428",
    customer: "Arjun Kapoor",
    amount: 649,
    method: "UPI",
    status: "Refunded",
    date: "2026-08-17",
    history: [
      { status: "Pending", date: "2026-08-17" },
      { status: "Paid", date: "2026-08-17" },
      { status: "Refunded", date: "2026-08-18" },
    ],
  },
];
