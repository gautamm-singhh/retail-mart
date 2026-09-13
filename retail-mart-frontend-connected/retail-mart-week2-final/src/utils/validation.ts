// Lightweight, dependency-free validation helpers for client-side form validation.

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

/** True if every value in an errors record is undefined. */
export function isValid(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).every((error) => !error);
}
