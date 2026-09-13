/** Registered courier / shipping partner. Matches app/models/courier.py -> Courier.to_dict() */
export interface Courier {
  id: string;
  name: string;
  /** Uppercase alphanumeric code, e.g. "BLUEDART" */
  code: string;
  contactEmail: string | null;
  /**
   * External carrier URL template. Contains the literal placeholder
   * `{tracking_number}` which the backend replaces before returning
   * the final URL from GET /api/shipments/<id>/track.
   */
  trackingUrlTemplate: string | null;
  isActive: boolean;
}

export type CourierFormValues = Omit<Courier, "id">;
