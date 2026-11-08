"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import type { ContactCopy } from "@/lib/contact-copy";

export function ContactForm({ preview = false, copy }: { preview?: boolean; copy: ContactCopy }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), message: data.get("message") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your message could not be saved.");
      form.reset();
      setNotice(copy.successMessage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <fieldset disabled={preview} style={{ border: 0, padding: 0, margin: 0 }}>
      <label>{copy.nameLabel}<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
      <label>{copy.emailLabel}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>{copy.messageLabel}<textarea name="message" required minLength={10} maxLength={5000} rows={7} /></label>
      <p>{copy.safeguardingNotice}</p>
      <p>{copy.privacyNotice}</p>
      <button className="button button-navy" disabled={busy}>{busy ? copy.sendingLabel : copy.sendLabel} <ArrowRight size={16} /></button>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
      {error && <p className="contact-error" role="alert">{error}</p>}
    </form>
  );
}
