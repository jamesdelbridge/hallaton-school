import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { SignInForm } from "@/components/sign-in-form";

export default function ParentSignInPage() {
  return (
    <main className="portal-login-page">
      <div className="portal-login-card">
        <Link href="/" className="portal-back"><ArrowLeft size={15} /> Back to the school website</Link>
        <span className="portal-login-mark"><LockKeyhole size={21} /></span>
        <span className="portal-eyebrow">Hallaton Primary School</span>
        <h1>Parent portal</h1>
        <p>Sign in with your parent account to access your family space.</p>
        <SignInForm destination="/parent" />
        <p>School staff? <Link href="/staff/sign-in">Staff portal sign-in</Link></p>
        <small>Accounts are created by the school administrator. There is no public registration.</small>
      </div>
    </main>
  );
}
