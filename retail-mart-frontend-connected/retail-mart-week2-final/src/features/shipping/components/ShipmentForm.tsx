import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { isRequired, isValid } from "@/utils/validation";
import { fetchCouriers } from "@/services/api/couriers";
import type { Courier, ShipmentFormValues } from "@/types";

interface ShipmentFormProps {
  submitLabel: string;
  onSubmit: (values: ShipmentFormValues) => void;
  onCancel: () => void;
}

type FormErrors = Partial<Record<keyof ShipmentFormValues, string>>;

export function ShipmentForm({ submitLabel, onSubmit, onCancel }: ShipmentFormProps) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [customCourier, setCustomCourier] = useState<string>("");

  const [values, setValues] = useState<ShipmentFormValues>({
    orderId: "",
    courier: "",
    courierId: null,
    trackingNumber: "",
    expectedDelivery: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchCouriers(true)
      .then((data) => {
        setCouriers(data);
        if (data.length > 0) {
          setSelectedCourierId(data[0].id);
          setValues((v) => ({ ...v, courier: data[0].name, courierId: data[0].id }));
        }
      })
      .catch(() => {
        // Best effort fallback to free-text
      });
  }, []);

  function handleCourierSelect(courierId: string) {
    setSelectedCourierId(courierId);
    if (courierId === "custom") {
      setValues((v) => ({ ...v, courierId: null, courier: customCourier }));
    } else {
      const found = couriers.find((c) => c.id === courierId);
      if (found) {
        setValues((v) => ({ ...v, courierId: found.id, courier: found.name }));
      }
    }
  }

  function handleCustomCourierChange(name: string) {
    setCustomCourier(name);
    setValues((v) => ({ ...v, courierId: null, courier: name }));
  }

  function validate(candidate: ShipmentFormValues): FormErrors {
    return {
      orderId: isRequired(candidate.orderId),
      courier: isRequired(candidate.courier),
      expectedDelivery: isRequired(candidate.expectedDelivery),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    onSubmit({
      ...values,
      orderId: values.orderId.trim(),
      courier: values.courier.trim(),
      courierId: values.courierId || null,
      trackingNumber: values.trackingNumber?.trim() || "",
      expectedDelivery: values.expectedDelivery || "",
    });
  }

  const courierOptions = [
    ...couriers.map((c) => ({
      label: `${c.name} (${c.code})`,
      value: c.id,
    })),
    { label: "Other / Custom Courier", value: "custom" },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Order ID *"
        placeholder="ORD-12345"
        value={values.orderId}
        onChange={(e) => setValues((v) => ({ ...v, orderId: e.target.value }))}
        error={errors.orderId}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {couriers.length > 0 ? (
          <div>
            <Select
              label="Registered Courier Partner *"
              options={courierOptions}
              value={selectedCourierId}
              onChange={(e) => handleCourierSelect(e.target.value)}
              error={errors.courier}
            />
            {selectedCourierId === "custom" && (
              <div className="mt-2">
                <Input
                  label="Courier Name *"
                  placeholder="Enter courier name"
                  value={customCourier}
                  onChange={(e) => handleCustomCourierChange(e.target.value)}
                  error={errors.courier}
                  required
                />
              </div>
            )}
          </div>
        ) : (
          <Input
            label="Courier *"
            placeholder="BlueDart, DTDC, etc."
            value={values.courier}
            onChange={(e) => setValues((v) => ({ ...v, courier: e.target.value, courierId: null }))}
            error={errors.courier}
            required
          />
        )}

        <div>
          <Input
            label="Tracking Number (Auto-generated if blank)"
            placeholder="Auto-assigned carrier AWB"
            value={values.trackingNumber || ""}
            onChange={(e) => setValues((v) => ({ ...v, trackingNumber: e.target.value }))}
            error={errors.trackingNumber}
          />
          <p className="mt-1 text-xs text-slate-500">
            Registered couriers assign a verified carrier AWB format (e.g. BD..., DEL..., EKT...) automatically.
          </p>
        </div>
      </div>

      <Input
        label="Expected Delivery Date *"
        type="date"
        value={values.expectedDelivery}
        onChange={(e) => setValues((v) => ({ ...v, expectedDelivery: e.target.value }))}
        error={errors.expectedDelivery}
        required
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
