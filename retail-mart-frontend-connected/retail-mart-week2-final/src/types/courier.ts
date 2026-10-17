export interface Courier {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  trackingUrlTemplate: string | null;
  isActive: boolean;
}

export type CourierFormValues = Omit<Courier, "id">;
