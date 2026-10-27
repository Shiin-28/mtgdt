import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Log in · MTGDT" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="Welcome back" sub="Log in to see your decks and prices." tab="login">
      <Suspense>
        <LoginLoader searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginLoader({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <LoginForm next={first(params.next) ?? "/decks"} initialError={first(params.error)} />;
}
