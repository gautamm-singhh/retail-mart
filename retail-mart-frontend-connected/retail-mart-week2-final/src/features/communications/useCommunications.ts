import { useCallback, useState } from "react";
import {
  sendGenericEmail,
  sendOrderConfirmation,
  type SendEmailPayload,
} from "@/services/api/communications";

interface UseCommunicationsResult {
  isSending: boolean;
  sendEmail: (payload: SendEmailPayload) => Promise<boolean>;
  sendConfirmation: (orderId: string) => Promise<boolean>;
}

/**
 * Hook wrapping the two communications endpoints with loading state and
 * duplicate-submit prevention. Returns the `sent` boolean from the backend
 * so the caller can decide on toast wording.
 */
export function useCommunications(): UseCommunicationsResult {
  const [isSending, setIsSending] = useState(false);

  const sendEmail = useCallback(async (payload: SendEmailPayload): Promise<boolean> => {
    setIsSending(true);
    try {
      const result = await sendGenericEmail(payload);
      return result.sent;
    } finally {
      setIsSending(false);
    }
  }, []);

  const sendConfirmation = useCallback(async (orderId: string): Promise<boolean> => {
    setIsSending(true);
    try {
      const result = await sendOrderConfirmation(orderId);
      return result.sent;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { isSending, sendEmail, sendConfirmation };
}
