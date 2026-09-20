import { describe, it, expect } from "vitest";
import {
  normalizeIndianPhone,
  validateIndianPhone,
  isValidIndianPincode,
  isValidEmail,
  isRequired,
} from "./validation";

describe("Validation utilities", () => {
  describe("normalizeIndianPhone", () => {
    it("preserves standard 10-digit Indian numbers", () => {
      expect(normalizeIndianPhone("9876543210")).toBe("9876543210");
    });

    it("strips +91 country prefix", () => {
      expect(normalizeIndianPhone("+91 9876543210")).toBe("9876543210");
      expect(normalizeIndianPhone("+91-9876543210")).toBe("9876543210");
      expect(normalizeIndianPhone("+919876543210")).toBe("9876543210");
    });

    it("strips 91 prefix", () => {
      expect(normalizeIndianPhone("91 9876543210")).toBe("9876543210");
      expect(normalizeIndianPhone("919876543210")).toBe("9876543210");
    });

    it("strips trunk 0 prefix", () => {
      expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
    });

    it("removes internal formatting spaces and hyphens", () => {
      expect(normalizeIndianPhone("+91 98765 43210")).toBe("9876543210");
      expect(normalizeIndianPhone("9876-543-210")).toBe("9876543210");
      expect(normalizeIndianPhone("(98765) 43210")).toBe("9876543210");
    });
  });

  describe("validateIndianPhone", () => {
    it("accepts valid 10-digit Indian numbers starting with 6, 7, 8, 9", () => {
      expect(validateIndianPhone("9876543210")).toBeUndefined();
      expect(validateIndianPhone("8876543210")).toBeUndefined();
      expect(validateIndianPhone("7876543210")).toBeUndefined();
      expect(validateIndianPhone("6876543210")).toBeUndefined();
      expect(validateIndianPhone("+91 9876543210")).toBeUndefined();
      expect(validateIndianPhone("+91-8876543210")).toBeUndefined();
    });

    it("rejects invalid starting digit", () => {
      expect(validateIndianPhone("5876543210")).toBe("Indian mobile numbers must start with 6, 7, 8, or 9.");
      expect(validateIndianPhone("1876543210")).toBe("Indian mobile numbers must start with 6, 7, 8, or 9.");
      expect(validateIndianPhone("2876543210")).toBe("Indian mobile numbers must start with 6, 7, 8, or 9.");
    });

    it("rejects invalid lengths", () => {
      expect(validateIndianPhone("98765")).toBe("Enter a valid 10-digit Indian mobile number.");
      expect(validateIndianPhone("987654321000")).toBe("Enter a valid 10-digit Indian mobile number.");
    });

    it("rejects non-numeric characters", () => {
      expect(validateIndianPhone("98765abcde")).toBe("Phone number can only contain digits, spaces, and +91 prefix.");
      expect(validateIndianPhone("98765@43210")).toBe("Phone number can only contain digits, spaces, and +91 prefix.");
    });

    it("handles required check properly", () => {
      expect(validateIndianPhone("", false)).toBeUndefined();
      expect(validateIndianPhone("", true)).toBe("Mobile number is required.");
    });
  });

  describe("isValidIndianPincode", () => {
    it("accepts valid 6-digit Indian PIN codes", () => {
      expect(isValidIndianPincode("846004")).toBe(true);
      expect(isValidIndianPincode("110001")).toBe(true);
      expect(isValidIndianPincode("560001")).toBe(true);
      expect(isValidIndianPincode("400001")).toBe(true);
    });

    it("rejects codes starting with 0 or non-6 digits", () => {
      expect(isValidIndianPincode("012345")).toBe(false);
      expect(isValidIndianPincode("84600")).toBe(false);
      expect(isValidIndianPincode("8460045")).toBe(false);
      expect(isValidIndianPincode("84600A")).toBe(false);
      expect(isValidIndianPincode("")).toBe(false);
    });
  });

  describe("isRequired", () => {
    it("returns error for empty or whitespace-only strings", () => {
      expect(isRequired("")).toBe("This field is required.");
      expect(isRequired("   ")).toBe("This field is required.");
    });

    it("returns undefined for non-empty values", () => {
      expect(isRequired("hello")).toBeUndefined();
    });
  });

  describe("isValidEmail", () => {
    it("returns error for empty string", () => {
      expect(isValidEmail("")).toBe("This field is required.");
    });

    it("returns error for malformed emails", () => {
      expect(isValidEmail("notanemail")).toBe("Enter a valid email address.");
      expect(isValidEmail("user@")).toBe("Enter a valid email address.");
      expect(isValidEmail("@domain.com")).toBe("Enter a valid email address.");
    });

    it("returns undefined for valid emails", () => {
      expect(isValidEmail("user@example.com")).toBeUndefined();
      expect(isValidEmail("priya.sharma@retailmart.in")).toBeUndefined();
    });
  });
});
