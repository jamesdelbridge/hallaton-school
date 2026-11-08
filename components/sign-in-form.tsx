"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignInForm({ destination }: { destination: "/staff" | "/parent" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: String(form.get("email")),
        password: String(form.get("password")),
        redirect: false,
      });
      if (result?.error) {
        setError("Those details didn’t match an active school account.");
        return;
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="email">Account email</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Signing you in…" : "Sign in securely"}</button>
    </form>
  );
}
