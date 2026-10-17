import { useContext } from "react";
import { ToastContext, ToastContextValue } from "@/components/common/ToastProvider";

const fallbackToast: ToastContextValue = {
  showToast: (message: string) => {
    console.debug("[Toast]:", message);
  },
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? fallbackToast;
}
