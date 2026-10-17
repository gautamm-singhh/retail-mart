import { FormEvent, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  isRequired,
  isValid,
  validateIndianPhone,
  normalizeIndianPhone,
  isValidIndianPincode,
} from "@/utils/validation";
import { lookupPincode } from "@/services/api/pincode";
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

export function AddressForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [values, setValues] = useState<AddressFormValues>(
    initialValues ?? defaultValues(),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<{
    type: "success" | "info" | "none";
    message: string;
  }>({ type: "none", message: "" });

  const lastLookedUpPin = useRef("");

  useEffect(() => {
    const cleanPin = values.postalCode ? values.postalCode.trim() : "";

    if (cleanPin.length !== 6) {
      if (pincodeFeedback.type !== "none") {
        setPincodeFeedback({ type: "none", message: "" });
      }
      return;
    }

    if (!isValidIndianPincode(cleanPin)) {
      setPincodeFeedback({
        type: "info",
        message: "Indian PIN codes must be 6 digits (100000–999999).",
      });
      return;
    }

    if (lastLookedUpPin.current === cleanPin) {
      return;
    }

    let isMounted = true;
    const timeout = setTimeout(async () => {
      setPincodeLoading(true);
      setPincodeFeedback({ type: "none", message: "" });

      try {
        const result = await lookupPincode(cleanPin);
        if (!isMounted) return;

        if (result) {
          lastLookedUpPin.current = cleanPin;
          setValues((prev) => ({
            ...prev,
            city: result.city || prev.city,
            state: result.state || prev.state,
          }));
          setErrors((prev) => ({ ...prev, city: undefined, state: undefined, postalCode: undefined }));
          setPincodeFeedback({
            type: "success",
            message: `✓ Auto-filled: ${result.city}, ${result.state}`,
          });
        } else {
          lastLookedUpPin.current = cleanPin;
          setPincodeFeedback({
            type: "info",
            message: "PIN lookup unavailable. You can enter City and State manually.",
          });
        }
      } catch {
        if (isMounted) {
          setPincodeFeedback({
            type: "info",
            message: "You can enter City and State manually.",
          });
        }
      } finally {
        if (isMounted) setPincodeLoading(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [values.postalCode, pincodeFeedback.type]);

  function validate(candidate: AddressFormValues): FormErrors {
    const errs: FormErrors = {
      line1: isRequired(candidate.line1),
      city: isRequired(candidate.city),
      state: isRequired(candidate.state),
      postalCode: isRequired(candidate.postalCode),
    };

    if (candidate.postalCode.trim() && !isValidIndianPincode(candidate.postalCode)) {
      errs.postalCode = "Enter a valid 6-digit Indian PIN code.";
    }

    if (candidate.phone && candidate.phone.trim()) {
      const phoneErr = validateIndianPhone(candidate.phone, false);
      if (phoneErr) errs.phone = phoneErr;
    }

    return errs;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    const payload: AddressFormValues = {
      ...values,
      phone: values.phone ? normalizeIndianPhone(values.phone) : "",
    };

    onSubmit(payload);
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
        placeholder="House/Flat number, Street name"
        value={values.line1}
        onChange={(e) => {
          setValues((v) => ({ ...v, line1: e.target.value }));
          if (errors.line1) setErrors((prev) => ({ ...prev, line1: undefined }));
        }}
        error={errors.line1}
        required
      />
      <Input
        label="Address line 2"
        placeholder="Apartment, Landmark, Area (optional)"
        value={values.line2}
        onChange={(e) => setValues((v) => ({ ...v, line2: e.target.value }))}
      />

      <div>
        <div className="relative">
          <Input
            label="Postal Code (PIN) *"
            placeholder="e.g. 846004, 110001"
            maxLength={6}
            value={values.postalCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setValues((v) => ({ ...v, postalCode: val }));
              if (errors.postalCode) setErrors((prev) => ({ ...prev, postalCode: undefined }));
            }}
            error={errors.postalCode}
            required
          />
          {pincodeLoading && (
            <span className="absolute right-3 top-8.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <span>Verifying PIN...</span>
            </span>
          )}
        </div>

        {pincodeFeedback.type === "success" && (
          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {pincodeFeedback.message}
          </p>
        )}
        {pincodeFeedback.type === "info" && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {pincodeFeedback.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City *"
          placeholder="City or District"
          value={values.city}
          onChange={(e) => {
            setValues((v) => ({ ...v, city: e.target.value }));
            if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
          }}
          error={errors.city}
          required
        />
        <Input
          label="State *"
          placeholder="State"
          value={values.state}
          onChange={(e) => {
            setValues((v) => ({ ...v, state: e.target.value }));
            if (errors.state) setErrors((prev) => ({ ...prev, state: undefined }));
          }}
          error={errors.state}
          required
        />
      </div>

      <Input
        label="Phone number (optional)"
        type="tel"
        placeholder="e.g. +91 98765 43210"
        value={values.phone}
        onChange={(e) => {
          setValues((v) => ({ ...v, phone: e.target.value }));
          if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
        }}
        error={errors.phone}
      />

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
