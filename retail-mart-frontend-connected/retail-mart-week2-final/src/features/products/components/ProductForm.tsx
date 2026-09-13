import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  isRequired,
  isPositiveNumber,
  isNonNegativeInteger,
  isValid,
} from "@/utils/validation";
import type { ProductFormValues } from "@/types";

interface ProductFormProps {
  initialValues?: ProductFormValues;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  /**
   * Active categories to offer in the dropdown, from useCategories(). Falls
   * back to a single placeholder option so this component still renders
   * sensibly when used without a categories fetch behind it (e.g. in
   * isolated component tests).
   */
  categoryOptions?: { label: string; value: string }[];
}

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Out of stock", value: "out-of-stock" },
];

const FALLBACK_CATEGORY_OPTIONS = [{ label: "Uncategorized", value: "Uncategorized" }];

function defaultValues(categoryOptions: { label: string; value: string }[]): ProductFormValues {
  return {
    name: "",
    sku: "",
    category: categoryOptions[0]?.value ?? "",
    description: "",
    price: 0,
    stock: 0,
    status: "draft",
    imageUrl: null,
  };
}

// Raw string state for the two numeric fields (so the input can be
// temporarily empty while typing) and for imageUrl (so "no image" is a
// plain empty string in the input rather than null).
interface FormState extends Omit<ProductFormValues, "price" | "stock" | "imageUrl"> {
  price: string;
  stock: string;
  imageUrl: string;
}

function toFormState(values: ProductFormValues): FormState {
  return { ...values, price: String(values.price), stock: String(values.stock), imageUrl: values.imageUrl ?? "" };
}

type FormErrors = Partial<Record<keyof ProductFormValues, string>>;

export function ProductForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  categoryOptions = FALLBACK_CATEGORY_OPTIONS,
}: ProductFormProps) {
  const [values, setValues] = useState<FormState>(
    toFormState(initialValues ?? defaultValues(categoryOptions)),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(candidate: FormState): FormErrors {
    return {
      name: isRequired(candidate.name),
      sku: isRequired(candidate.sku),
      category: isRequired(candidate.category),
      price: isPositiveNumber(Number(candidate.price)),
      stock: isNonNegativeInteger(Number(candidate.stock)),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    onSubmit({
      ...values,
      price: Number(values.price),
      stock: Number(values.stock),
      imageUrl: values.imageUrl.trim() === "" ? null : values.imageUrl.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Product name *"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        error={errors.name}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="SKU *"
          value={values.sku}
          onChange={(e) => setValues((v) => ({ ...v, sku: e.target.value }))}
          error={errors.sku}
          required
        />
        <Select
          label="Category *"
          options={categoryOptions}
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          error={errors.category}
        />
      </div>
      <Textarea
        label="Description"
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        placeholder="Short description shown to the catalog team."
      />
      <Input
        label="Image URL"
        type="url"
        value={values.imageUrl}
        onChange={(e) => setValues((v) => ({ ...v, imageUrl: e.target.value }))}
        placeholder="https://example.com/product-photo.jpg"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Price (₹) *"
          type="number"
          min="0"
          step="1"
          value={values.price}
          onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
          error={errors.price}
          required
        />
        <Input
          label="Stock quantity *"
          type="number"
          min="0"
          step="1"
          value={values.stock}
          onChange={(e) => setValues((v) => ({ ...v, stock: e.target.value }))}
          error={errors.stock}
          required
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={(e) =>
            setValues((v) => ({ ...v, status: e.target.value as FormState["status"] }))
          }
        />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
