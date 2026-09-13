export type CategoryStatus = "active" | "inactive";

export interface Category {
  id: string;
  name: string;
  productCount: number;
  status: CategoryStatus;
  createdAt: string;
}
