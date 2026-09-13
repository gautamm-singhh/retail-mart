import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { isRequired, isPositiveNumber, isValid } from "@/utils/validation";
import type { CampaignFormValues } from "@/types";

interface CampaignFormProps {
  initialValues?: CampaignFormValues;
  submitLabel: string;
  onSubmit: (values: CampaignFormValues) => void;
  onCancel: () => void;
}

const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage off", value: "percentage" },
  { label: "Flat amount off", value: "flat" },
];

const STATUS_OPTIONS = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Active", value: "active" },
  { label: "Ended", value: "ended" },
];

interface FestivalPreset {
  id: string;
  label: string;
  name: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minPurchase: number | null;
}

const FESTIVAL_PRESETS: FestivalPreset[] = [
  {
    id: "diwali",
    label: "🪔 Diwali Mega Sale (Festival of Lights)",
    name: "Diwali Mega Festive Sale",
    description: "Celebrate the Festival of Lights with spectacular discounts across electronics, home decor, and fashion! Retail Mart wishes you and your family abundant joy and prosperity.",
    discountType: "percentage",
    discountValue: 30,
    minPurchase: 1499,
  },
  {
    id: "holi",
    label: "🎨 Holi Festival Dhamaka (Festival of Colors)",
    name: "Holi Festival Dhamaka",
    description: "Add colors of joy to your celebrations! Enjoy special festival discounts on seasonal favorites and home essentials. Happy Holi from Retail Mart!",
    discountType: "percentage",
    discountValue: 25,
    minPurchase: 999,
  },
  {
    id: "newyear",
    label: "✨ New Year Bonanza",
    name: "New Year Mega Bonanza",
    description: "Ring in the New Year with massive savings! Fresh arrivals and exclusive member discounts to start your year with delight.",
    discountType: "flat",
    discountValue: 250,
    minPurchase: 1000,
  },
  {
    id: "independence",
    label: "🇮🇳 Independence Day Freedom Sale",
    name: "Independence Day Freedom Sale",
    description: "Freedom to save more! Exclusive patriotic discounts on top Indian brands and daily essentials.",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 799,
  },
  {
    id: "eid",
    label: "🌙 Eid Mubarak Special",
    name: "Eid Special Celebration Sale",
    description: "Warm festive wishes on Eid! Special curated discounts and festive gifts for you and your loved ones.",
    discountType: "percentage",
    discountValue: 25,
    minPurchase: 1200,
  },
  {
    id: "seasonal",
    label: "☀️ Seasonal Clearance Sale",
    name: "End of Season Clearance",
    description: "Limited-time clearance deals! Huge discounts across apparel, footwear, and seasonal accessories while stocks last.",
    discountType: "percentage",
    discountValue: 40,
    minPurchase: 1500,
  },
];

function defaultValues(): CampaignFormValues {
  return {
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    minPurchase: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    status: "scheduled",
  };
}

interface FormState extends Omit<CampaignFormValues, "discountValue" | "minPurchase" | "endDate"> {
  discountValue: string;
  minPurchase: string;
  endDate: string;
}

function toFormState(values: CampaignFormValues): FormState {
  return {
    ...values,
    discountValue: String(values.discountValue),
    minPurchase: values.minPurchase === null || values.minPurchase === undefined ? "" : String(values.minPurchase),
    endDate: values.endDate ?? "",
  };
}

type FormErrors = Partial<Record<keyof CampaignFormValues, string>>;

export function CampaignForm({ initialValues, submitLabel, onSubmit, onCancel }: CampaignFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [values, setValues] = useState<FormState>(toFormState(initialValues ?? defaultValues()));
  const [errors, setErrors] = useState<FormErrors>({});

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    if (templateId === "custom") return;

    const preset = FESTIVAL_PRESETS.find((p) => p.id === templateId);
    if (preset) {
      setValues((v) => ({
        ...v,
        name: preset.name,
        description: preset.description,
        discountType: preset.discountType,
        discountValue: String(preset.discountValue),
        minPurchase: preset.minPurchase !== null ? String(preset.minPurchase) : "",
      }));
    }
  }

  function validate(candidate: FormState): FormErrors {
    return {
      name: isRequired(candidate.name),
      discountValue: isPositiveNumber(Number(candidate.discountValue)),
      startDate: isRequired(candidate.startDate),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    onSubmit({
      ...values,
      discountValue: Number(values.discountValue),
      minPurchase: values.minPurchase === "" ? null : Number(values.minPurchase),
      endDate: values.endDate === "" ? null : values.endDate,
    });
  }

  const templateOptions = [
    { label: "— Custom Campaign (Blank) —", value: "custom" },
    ...FESTIVAL_PRESETS.map((p) => ({ label: p.label, value: p.id })),
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {!initialValues && (
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3">
          <Select
            label="Festival / Occasion Template"
            options={templateOptions}
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Select a festival to pre-fill campaign copy and discounts, or customize freely below.
          </p>
        </div>
      )}

      <Input
        label="Campaign name *"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        error={errors.name}
        required
      />
      <Textarea
        label="Promotional Message / Email Body"
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        placeholder="Shown to customers in the campaign blast email."
        rows={3}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Discount type *"
          options={DISCOUNT_TYPE_OPTIONS}
          value={values.discountType}
          onChange={(e) =>
            setValues((v) => ({ ...v, discountType: e.target.value as CampaignFormValues["discountType"] }))
          }
        />
        <Input
          label="Discount value *"
          type="number"
          min={0}
          step="0.01"
          value={values.discountValue}
          onChange={(e) => setValues((v) => ({ ...v, discountValue: e.target.value }))}
          error={errors.discountValue}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Min. purchase amount"
          type="number"
          min={0}
          step="0.01"
          placeholder="None"
          value={values.minPurchase}
          onChange={(e) => setValues((v) => ({ ...v, minPurchase: e.target.value }))}
        />
        <Input
          label="Start date *"
          type="date"
          value={values.startDate}
          onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
          error={errors.startDate}
          required
        />
        <Input
          label="End date"
          type="date"
          value={values.endDate}
          onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))}
        />
      </div>
      <Select
        label="Status *"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as CampaignFormValues["status"] }))}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
