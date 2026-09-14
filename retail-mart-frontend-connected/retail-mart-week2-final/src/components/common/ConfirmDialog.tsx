import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  /** "danger" for destructive actions (delete); "primary" for neutral confirmations (status changes). */
  tone?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * One confirmation pattern reused for every action that shouldn't happen by
 * accident: deleting a user/product, cancelling an order, marking a payment
 * refunded. Built on the existing Modal instead of a second dialog
 * implementation.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onCancel} title={title}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
