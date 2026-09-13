export type CampaignDiscountType = "percentage" | "flat";
export type CampaignStatus = "scheduled" | "active" | "ended";

export interface Campaign {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  minPurchase: number | null;
  startDate: string;
  endDate: string | null;
  status: CampaignStatus;
}

/** Fields collected by CampaignForm when creating or editing a campaign. */
export type CampaignFormValues = Pick<
  Campaign,
  "name" | "description" | "discountType" | "discountValue" | "minPurchase" | "startDate" | "endDate" | "status"
> & { code?: string };
