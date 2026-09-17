import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { useCommunications } from "@/features/communications/useCommunications";
import { useToast } from "@/hooks/useToast";
import { isRequired, isValid } from "@/utils/validation";

interface FormState {
  to: string;
  subject: string;
  body: string;
  sender: "support" | "orders" | "marketing";
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateEmail(email: string): string | undefined {
  const required = isRequired(email);
  if (required) return required;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return undefined;
}

export default function CommunicationsPage() {
  const { isSending, sendEmail } = useCommunications();
  const { showToast } = useToast();

  const [values, setValues] = useState<FormState>({
    to: "",
    subject: "",
    body: "",
    sender: "support",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(candidate: FormState): FormErrors {
    return {
      to: validateEmail(candidate.to),
      subject: isRequired(candidate.subject),
      body: isRequired(candidate.body),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    try {
      const sent = await sendEmail({
        to: values.to.trim(),
        subject: values.subject.trim(),
        body: values.body.trim(),
        sender: values.sender,
      });
      if (sent) {
        showToast(`Email dispatched successfully via ${values.sender} sender.`);
        setValues({ to: "", subject: "", body: "", sender: "support" });
        setErrors({});
      } else {
        showToast(
          "The email could not be delivered. Check that SMTP is configured on the backend.",
          "error",
        );
      }
    } catch {
      showToast("Something went wrong sending this email.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="TRANSACTIONAL MESSAGING"
        title="Communications & Mailer"
        description="Dispatch verified customer emails, monitor SMTP delivery engine, and manage notification templates."
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="SMTP Gateway"
          value="3 Senders Active"
          subtext="Support, Orders, Marketing (Port 587)"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Encryption Standard"
          value="STARTTLS"
          subtext="Gmail Port 587 • RFC 3207 Verified"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
        />
        <AdminStatCard
          label="Notification Triggers"
          value="10 Auto-Templates"
          subtext="Order, Shipped, Track, Campaign, Thank-You"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Compose Direct Message</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Send priority administrative emails directly through the configured multi-sender SMTP provider.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sender Identity *
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={values.sender}
                onChange={(e) => setValues((v) => ({ ...v, sender: e.target.value as "support" | "orders" | "marketing" }))}
              >
                <option value="support">Retail Mart Support (retailmart.support@gmail.com)</option>
                <option value="orders">Retail Mart Orders (retailmart.orders@gmail.com)</option>
                <option value="marketing">Retail Mart Marketing (retailmart.marketing@gmail.com)</option>
              </select>
            </div>

            <Input
              label="Recipient email *"
              type="email"
              placeholder="customer@example.com"
              value={values.to}
              onChange={(e) => setValues((v) => ({ ...v, to: e.target.value }))}
              error={errors.to}
              required
            />
            <Input
              label="Subject *"
              placeholder="Your order has been confirmed"
              value={values.subject}
              onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
              error={errors.subject}
              required
            />
            <Textarea
              label="Message *"
              rows={6}
              placeholder="Enter the email body here..."
              value={values.body}
              onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
              error={errors.body}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSending}>
                {isSending ? "Dispatching via SMTP..." : "Send Email Now"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Mail Templates</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pre-compiled HTML templates triggered automatically on order and shipment milestones:
          </p>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Welcome / Account Ready (Support)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Order Confirmation (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Payment Receipt with PDF (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Shipment Tracking Available (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Order Shipped (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Out for Delivery Alert (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Order Delivered (Orders)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Customer Thank You Note (Support)</span>
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Marketing Campaign Blast (Marketing)</span>
            </li>
          </ul>

          <div className="mt-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-white">Diagnostics:</span> Host: smtp.gmail.com:587 • STARTTLS • 3 Sender identities configured.
          </div>
        </Card>
      </div>
    </div>
  );
}
