"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/app/auth/actions";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
  defaultValue,
  optional = false,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </span>
      <input
        name={name}
        type={type}
        required={!optional}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-foreground/50"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="rounded-xl bg-owned/10 px-3 py-2 text-sm text-owned">
        {state.message}
      </p>
    );
  return null;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={pending}
      className="h-12 w-full rounded-full bg-foreground font-medium text-background hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState(signIn, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <div className="text-right text-sm">
        <Link href="/reset" className="text-muted underline hover:text-foreground">
          Forgot password?
        </Link>
      </div>
      <Feedback state={state} />
      <Submit pending={pending}>Log in</Submit>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.message) return <Feedback state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Display name" name="displayName" autoComplete="nickname" optional />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
      <Feedback state={state} />
      <Submit pending={pending}>Create account</Submit>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} />
      <Feedback state={state} />
      <Submit pending={pending}>Send reset link</Submit>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      <Feedback state={state} />
      <Submit pending={pending}>Save password</Submit>
      {state?.message && (
        <p className="text-center text-sm">
          <Link href="/decks" className="underline">
            Go to your decks
          </Link>
        </p>
      )}
    </form>
  );
}
