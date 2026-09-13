import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { RoleSelect } from "@/features/users/components/RoleSelect";
import { isRequired, isValidEmail, isValid } from "@/utils/validation";
import type { UserFormValues } from "@/types";

interface UserFormProps {
  initialValues?: UserFormValues;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const DEFAULT_VALUES: UserFormValues = {
  name: "",
  email: "",
  role: "Staff",
  status: "active",
};

type FormErrors = Partial<Record<keyof UserFormValues, string>>;

/**
 * One form component for both "Add User" and "Edit User" - the caller
 * decides which by passing (or omitting) initialValues and a submitLabel.
 * Keeping this in its own file (rather than inline in UsersPage) is what
 * lets UserDetailsPage reuse the exact same form for its "Edit" action.
 */
export function UserForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(initialValues ?? DEFAULT_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(candidate: UserFormValues): FormErrors {
    return {
      name: isRequired(candidate.name),
      email: isValidEmail(candidate.email),
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
        label="Full name *"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        error={errors.name}
        required
      />
      <Input
        label="Email *"
        type="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
        required
      />
      <RoleSelect
        value={values.role}
        onChange={(e) =>
          setValues((v) => ({ ...v, role: e.target.value as UserFormValues["role"] }))
        }
      />
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={(e) =>
          setValues((v) => ({ ...v, status: e.target.value as UserFormValues["status"] }))
        }
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
