
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRequired(value: string): string | undefined {
  return value.trim().length === 0 ? "This field is required." : undefined;
}

export function isValidEmail(value: string): string | undefined {
  if (value.trim().length === 0) return "This field is required.";
  return EMAIL_PATTERN.test(value.trim()) ? undefined : "Enter a valid email address.";
}

export function isPositiveNumber(value: number): string | undefined {
  if (Number.isNaN(value)) return "Enter a valid number.";
  return value > 0 ? undefined : "Must be greater than 0.";
}

export function isNonNegativeInteger(value: number): string | undefined {
  if (Number.isNaN(value)) return "Enter a valid number.";
  if (!Number.isInteger(value)) return "Must be a whole number.";
  return value >= 0 ? undefined : "Cannot be negative.";
}

export function hasMinLength(value: string, min: number): string | undefined {
  return value.trim().length >= min ? undefined : `Must be at least ${min} characters.`;
}

export function normalizeIndianPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim().replace(/[\s\-().]/g, "");
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(3);
  }
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(2);
  }
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export function validateIndianPhone(phone: string, required = false): string | undefined {
  const trimmed = phone ? phone.trim() : "";
  if (!trimmed) {
    return required ? "Mobile number is required." : undefined;
  }

  if (!/^[+\d\s\-().]+$/.test(trimmed)) {
    return "Phone number can only contain digits, spaces, and +91 prefix.";
  }

  const normalized = normalizeIndianPhone(trimmed);
  if (!/^\d+$/.test(normalized) || normalized.length !== 10) {
    return "Enter a valid 10-digit Indian mobile number.";
  }

  if (!/^[6-9]/.test(normalized)) {
    return "Indian mobile numbers must start with 6, 7, 8, or 9.";
  }

  return undefined;
}

export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode) return false;
  return /^[1-9]\d{5}$/.test(pincode.trim());
}

export function isValid(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).every((error) => !error);
}
