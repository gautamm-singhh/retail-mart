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
