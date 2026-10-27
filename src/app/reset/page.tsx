import { AuthCard } from "@/components/auth/AuthCard";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Reset password · MTGDT" };

export default function ResetPage() {
  return (
    <AuthCard title="Reset your password" sub="We'll email you a link to set a new one.">
      <ResetForm />
    </AuthCard>
  );
}
