import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Create account · MTGDT" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthCard
      title="Create your account"
      sub="Free. Save your decks and see what's left to buy at PH stores."
      tab="signup"
    >
      <Suspense>
        <SignupLoader searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function SignupLoader({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const raw = (await searchParams).next;
  return <SignupForm next={(Array.isArray(raw) ? raw[0] : raw) ?? "/decks"} />;
}
