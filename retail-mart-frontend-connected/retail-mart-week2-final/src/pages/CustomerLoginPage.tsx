import UnifiedAuthPage from "@/pages/UnifiedAuthPage";

export interface CustomerLoginPageProps {
  initialMode?: "login" | "signup";
}

export default function CustomerLoginPage({ initialMode = "login" }: CustomerLoginPageProps) {
  return <UnifiedAuthPage initialMode={initialMode} />;
}
