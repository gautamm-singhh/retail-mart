import { useContext } from "react";
import { ToastContext, ToastContextValue } from "@/components/common/ToastProvider";

const fallbackToast: ToastContextValue = {
  showToast: (message: string) => {
    // Graceful no-op fallback when ToastProvider is not yet mounted
    console.debug("[Toast]:", message);
  },
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? fallbackToast;
}
