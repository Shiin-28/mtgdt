import { Suspense } from "react";
import { io } from "next/cache";
import { requireAccess } from "@/lib/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { NewPasswordForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Change password · MTGDT" };

export default function PasswordPage() {
  return (
    <AuthCard title="Set a new password">
      <Suspense>
        <SignedInOnly />
      </Suspense>
    </AuthCard>
  );
}

async function SignedInOnly() {
  await io();
  const { viewer } = await requireAccess("/account/password");
  return (
    <>
      {viewer?.email && <p className="-mt-3 mb-4 text-sm text-muted">For {viewer.email}</p>}
      <NewPasswordForm />
    </>
  );
}
