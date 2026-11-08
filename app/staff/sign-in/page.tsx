import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <main className="portal-login-page">
      <div className="portal-login-card">
        <Link href="/" className="portal-back"><ArrowLeft size={15} /> Back to the school website</Link>
        <span className="portal-login-mark"><LockKeyhole size={21} /></span>
        <span className="portal-eyebrow">Hallaton Primary School</span>
        <h1>Staff portal</h1>
        <p>Sign in with your staff account to access the school workspace.</p>
        <SignInForm destination="/staff" />
        <p>Looking for the family space? <Link href="/parent/sign-in">Parent portal sign-in</Link></p>
        <small>Accounts are created by the school administrator. There is no public registration.</small>
      </div>
    </main>
  );
}
