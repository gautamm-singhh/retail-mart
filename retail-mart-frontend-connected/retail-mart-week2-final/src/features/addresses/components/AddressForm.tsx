import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { isRequired, isValid } from "@/utils/validation";
import type { AddressFormValues } from "@/types";

interface AddressFormProps {
  initialValues?: AddressFormValues;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => void;
  onCancel?: () => void;
}

function defaultValues(): AddressFormValues {
  return {
    label: "Home",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    isDefault: false,
  };
}

type FormErrors = Partial<Record<keyof AddressFormValues, string>>;

export function AddressForm({ initialValues, submitLabel, onSubmit, onCancel }: AddressFormProps) {
  const [values, setValues] = useState<AddressFormValues>(initialValues ?? defaultValues());
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(candidate: AddressFormValues): FormErrors {
    return {
      line1: isRequired(candidate.line1),
      city: isRequired(candidate.city),
      state: isRequired(candidate.state),
      postalCode: isRequired(candidate.postalCode),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Label"
        placeholder="Home, Work, etc."
        value={values.label}
        onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
      />
      <Input
        label="Address line 1 *"
        value={values.line1}
        onChange={(e) => setValues((v) => ({ ...v, line1: e.target.value }))}
        error={errors.line1}
        required
      />
      <Input
        label="Address line 2"
        value={values.line2}
        onChange={(e) => setValues((v) => ({ ...v, line2: e.target.value }))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City *"
          value={values.city}
          onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
          error={errors.city}
          required
        />
        <Input
          label="State *"
          value={values.state}
          onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
          error={errors.state}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Postal code *"
          value={values.postalCode}
          onChange={(e) => setValues((v) => ({ ...v, postalCode: e.target.value }))}
          error={errors.postalCode}
          required
        />
        <Input
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
        />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
