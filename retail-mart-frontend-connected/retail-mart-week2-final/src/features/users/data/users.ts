import { User } from "@/types";

// Mock data only - stands in for a future GET /users response from Sorav's
// backend / Authorization Management module. Kept out of the page
// component so swapping this for a real API call later doesn't touch any
// JSX. See src/features/users/services/userRepository.ts for how the UI
// workflow (add/edit/deactivate) operates on this list in memory.
export const mockUsers: User[] = [
  {
    id: "u-001",
    name: "Gautam Sharma",
    email: "gautam@retailmart.dev",
    role: "Admin",
    status: "active",
    createdAt: "2025-11-01",
  },
  {
    id: "u-002",
    name: "Sorav Kapoor",
    email: "sorav@retailmart.dev",
    role: "Admin",
    status: "active",
    createdAt: "2025-11-01",
  },
  {
    id: "u-003",
    name: "Neha Joshi",
    email: "neha.joshi@retailmart.dev",
    role: "Manager",
    status: "active",
    createdAt: "2025-11-10",
  },
  {
    id: "u-004",
    name: "Rohit Desai",
    email: "rohit.desai@retailmart.dev",
    role: "Manager",
    status: "active",
    createdAt: "2025-11-14",
  },
  {
    id: "u-005",
    name: "Farah Khan",
    email: "farah.khan@retailmart.dev",
    role: "Staff",
    status: "active",
    createdAt: "2025-12-02",
  },
  {
    id: "u-006",
    name: "Aditya Nair",
    email: "aditya.nair@retailmart.dev",
    role: "Staff",
    status: "inactive",
    createdAt: "2025-12-05",
  },
  {
    id: "u-007",
    name: "Ishita Bose",
    email: "ishita.bose@retailmart.dev",
    role: "Staff",
    status: "active",
    createdAt: "2026-01-20",
  },
];
