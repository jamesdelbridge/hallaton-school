"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import Link from "next/link";
import { EnquiryInbox, EnquirySettings } from "@/components/enquiry-inbox";
import { SocialSettings } from "@/components/social-settings";
import { AuditTrail } from "@/components/audit-trail";
import { WebsitePopupSettings } from "@/components/website-popup-settings";
import { WebsitePageSettings } from "@/components/website-page-settings";
import { WebsitePromotion } from "@/components/website-promotion";
import { StatutorySettings } from "@/components/statutory-settings";
import { MealPlanner } from "@/components/meal-planner";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";

type Tab = "overview" | "content" | "learning" | "students" | "safeguarding" | "consent" | "accounts" | "enquiries" | "enquiry-settings" | "social-settings" | "audit" | "website-popup" | "website-pages" | "website-promotion" | "statutory-settings" | "meals";
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  reference: string;
  privateProfile: string | null;
  classGroup: { id: string; name: string; yearGroup: string } | null;
};
type Concern = { id: string; studentId: string; status: string; createdAt: string };
type ContentState = { announcements: Array<{ id: string; title: string; body: string; publishedAt: string | null }>; newsletters: Array<{ id: string; title: string; issueDate: string; publicUrl: string | null; publishedAt: string | null }>; events: Array<{ id: string; title: string; category: string; description: string; meetingInfo: string | null; gearList: string | null; startsAt: string; published: boolean; approved: boolean; createdById: string | null; invites: Array<{ studentId: string; student: { firstName: string; lastName: string } }> }> };
type LearningEntry = { id: string; weekOf: string; learning: string; homework: string | null; classGroup: { name: string; yearGroup: string } };
type Consent = { choice: "PENDING" | "GRANTED" | "DECLINED"; updatedAt: string; student: { id: string; reference: string; firstName: string; lastName: string; classGroup: { name: string } | null } };
type ConcernDetails = { id: string; studentId: string; details: string; status: "OPEN" | "REVIEWING" | "RESOLVED"; createdAt: string };
type ClassGroup = { id: string; name: string; yearGroup: string; _count?: { students: number } };
type StaffUser = { id: string; name: string | null; email: string | null; role: Role; active: boolean; sportsCoordinator: boolean; safeguardingLead: boolean; classAssignments: { classGroupId: string }[]; parentLinks: { studentId: string }[]; _count: { parentLinks: number } };

const navigation: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "content", label: "News & events", icon: Bell },
  { id: "website-popup", label: "Website popup", icon: Bell },
  { id: "website-pages", label: "School page text", icon: FileText },
  { id: "statutory-settings", label: "School information links", icon: FileText },
  { id: "website-promotion", label: "Publish website drafts", icon: FileText },
  { id: "enquiries", label: "Enquiries", icon: Bell },
  { id: "enquiry-settings", label: "Enquiry settings", icon: Shield },
  { id: "social-settings", label: "Social media settings", icon: Heart },
  { id: "learning", label: "Class learning", icon: BookOpen },
  { id: "meals", label: "School meals", icon: CalendarDays },
  { id: "students", label: "Student profiles", icon: Users },
  { id: "safeguarding", label: "Safeguarding", icon: Shield },
  { id: "consent", label: "Photo consent", icon: Heart },
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "audit", label: "Audit trail", icon: ClipboardList },
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(typeof result.error === "string" ? result.error : "The request could not be completed.");
  }
  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function StaffDashboard({ name, role }: { name: string; role: Role }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [roster, setRoster] = useState<Student[]>([]);
  const [sports, setSports] = useState(false);
  const [lead, setLead] = useState(role === "SAFEGUARDING_LEAD");
  const [feedback, setFeedback] = useState<Array<{ id: string; feedback: string; event: { title: string }; student: { firstName: string; lastName: string }; author: { name: string | null } }>>([]);
  const [curriculumFeedback, setCurriculumFeedback] = useState<Array<{ id: string; feedback: string; student: { firstName: string; lastName: string }; author: { name: string | null } }>>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [content, setContent] = useState<ContentState>({ announcements: [], newsletters: [], events: [] });
  const [learning, setLearning] = useState<LearningEntry[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [enquiryAllowed, setEnquiryAllowed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentType, setContentType] = useState("announcement");
  const [eventCategory, setEventCategory] = useState("GENERAL");
  const [publicEvent, setPublicEvent] = useState(false);
  const [eventSummaryDraft, setEventSummaryDraft] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [concernDetails, setConcernDetails] = useState<ConcernDetails | null>(null);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [accountRole, setAccountRole] = useState<Role>("PARENT");
  const [editingParent, setEditingParent] = useState<StaffUser | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const allowedNavigation = navigation.filter(({ id }) =>
    role !== "SAFEGUARDING_LEAD" || ["overview", "students", "safeguarding", "consent", "enquiries", "audit"].includes(id),
  ).filter(({ id }) => role !== "SUPER_ADMIN" || id !== "safeguarding")
    .filter(({ id }) => id !== "audit" || role === "SUPER_ADMIN" || lead)
    .filter(({ id }) => role === "SUPER_ADMIN" || (id !== "accounts" && id !== "enquiry-settings" && id !== "social-settings" && id !== "website-promotion"))
    .filter(({ id }) => id !== "enquiries" || enquiryAllowed);
  useEffect(() => {
    requestJson<{ allowed: boolean }>("/api/staff/enquiries/access").then(({ allowed }) => setEnquiryAllowed(allowed))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not check enquiry access."));
    requestJson<{ sports: boolean; lead: boolean }>("/api/staff/access").then((access) => { setSports(access.sports); setLead(access.lead); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not check staff access."));
  }, []);
  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) accountMenu.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && accountMenu.current?.open) {
        accountMenu.current.open = false;
        accountMenu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("click", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  const load = useCallback(async (target: Tab) => {
    setError("");
    try {
      if ((target === "overview" || target === "content") && role !== "SAFEGUARDING_LEAD") {
        setContent(await requestJson<ContentState>("/api/staff/content"));
      }
      if (target === "overview" || target === "students" || target === "learning" || target === "safeguarding" || target === "content" || target === "accounts" || target === "audit") {
        const [studentData, classData] = await Promise.all([
          requestJson<Student[]>("/api/staff/students"),
          requestJson<ClassGroup[]>("/api/staff/classes"),
        ]);
        setStudents(studentData);
        setClassGroups(classData);
      }
      if (target === "learning") {
        setLearning(await requestJson<LearningEntry[]>("/api/staff/learning"));
        setCurriculumFeedback(await requestJson<typeof curriculumFeedback>("/api/staff/learning/feedback"));
      }
      if (target === "safeguarding" || target === "content") setRoster(await requestJson<Student[]>("/api/staff/roster"));
      if (target === "content" && (role === "SUPER_ADMIN" || sports)) setFeedback(await requestJson<typeof feedback>("/api/staff/events/feedback"));
      if ((target === "overview" && (role === "TEACHER" || role === "SAFEGUARDING_LEAD")) || target === "safeguarding") {
        setConcerns(await requestJson<Concern[]>("/api/staff/safeguarding"));
      }
      if (target === "consent") setConsents(await requestJson<Consent[]>("/api/staff/social-consent"));
      if (target === "accounts" || (target === "students" && role === "SUPER_ADMIN")) setUsers(await requestJson<StaffUser[]>("/api/staff/users"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this section.");
    }
  }, [role, sports]);
  useEffect(() => {
    void Promise.resolve().then(() => load(tab));
  }, [tab, load]);

  async function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(""); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type"));
    const publish = form.get("publish") === "on";
    const rawStartsAt = String(form.get("startsAt") ?? "");
    try {
      const payload = type === "announcement"
        ? { type, title: form.get("title"), body: form.get("body"), publish }
        : type === "newsletter"
          ? { type, title: form.get("title"), issueDate: form.get("issueDate"), publicUrl: form.get("publicUrl"), publish }
          : { type, category: eventCategory, title: form.get("title"), description: form.get("body"), startsAt: new Date(rawStartsAt).toISOString(), meetingInfo: form.get("meetingInfo"), gearList: form.get("gearList"), studentIds: form.getAll("studentIds"), publicTitle: form.get("publicTitle") ?? undefined, publicSummary: form.get("publicSummary") ?? undefined, publish };
      await requestJson("/api/staff/content", { method: "POST", body: JSON.stringify(payload) });
      formElement.reset();
      setContentType("announcement");
      setEventCategory("GENERAL");
      setPublicEvent(false);
      setEventSummaryDraft(false);
      setNotice(type === "event" ? (role === "SUPER_ADMIN" ? "Event saved; selected parents can see their invitations." : "Event saved as a draft. An administrator must approve it before parents can see invitations.") : "School update saved.");
      await load("content");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this item.");
    } finally { setBusy(false); }
  }

  async function saveLearning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await requestJson("/api/staff/learning", {
        method: "POST",
        body: JSON.stringify({
          classGroupId: form.get("classGroupId"),
          weekOf: form.get("weekOf"),
          learning: form.get("learning"),
          homework: form.get("homework"),
        }),
      });
      formElement.reset();
      setNotice("Weekly learning and homework saved.");
      await load("learning");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save learning details."); }
    finally { setBusy(false); }
  }

  async function createConcern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await requestJson("/api/staff/safeguarding", {
        method: "POST",
        body: JSON.stringify({ studentId: form.get("studentId"), details: form.get("details") }),
      });
      formElement.reset(); setNotice("Concern securely recorded. Its details are encrypted.");
      await load("safeguarding");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save concern."); }
    finally { setBusy(false); }
  }

  async function updateConsent(studentId: string, choice: Consent["choice"]) {
    setError(""); setNotice("");
    try {
      await requestJson("/api/staff/social-consent", { method: "POST", body: JSON.stringify({ studentId, choice }) });
      setNotice("Consent record updated.");
      await load("consent");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update consent."); }
  }

  async function updatePublication(type: "announcement" | "newsletter" | "event", id: string, publish: boolean) {
    setError(""); setNotice("");
    try {
      await requestJson("/api/staff/content", {
        method: "PATCH",
        body: JSON.stringify({ type, id, publish }),
      });
      setNotice(publish ? "Item published on the school website." : "Item removed from the public website.");
      await load("content");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update publication status."); }
  }

  async function publishEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(""); setNotice(""); setBusy(true);
    try {
      await requestJson("/api/staff/content", { method: "PATCH", body: JSON.stringify({ type: "event", id: data.get("eventId"), publish: true, publicTitle: data.get("publicTitle"), publicSummary: data.get("publicSummary") }) });
      form.reset();
      setNotice("Public event summary published.");
      await load("content");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish event."); }
    finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileStudent) return;
    setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await requestJson(`/api/staff/students/${profileStudent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          emergencyContacts: form.get("emergencyContacts"),
          medical: form.get("medical"),
          dietary: form.get("dietary"),
        }),
      });
      setProfileStudent(null);
      setNotice("Private student information was encrypted and saved.");
      await load("students");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this profile."); }
    finally { setBusy(false); }
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/staff/students", {
        method: "POST",
        body: JSON.stringify({
          reference: formData.get("reference"),
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          classGroupId: formData.get("classGroupId"),
        }),
      });
      form.reset(); setStudentFormOpen(false);
      setNotice("Student profile created with pending social media consent.");
      await load("students");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the student profile."); }
    finally { setBusy(false); }
  }

  async function createClassGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/staff/classes", {
        method: "POST",
        body: JSON.stringify({ name: formData.get("name"), yearGroup: formData.get("yearGroup") }),
      });
      form.reset(); setClassFormOpen(false);
      setNotice("Class group created.");
      await load("students");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the class group."); }
    finally { setBusy(false); }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/staff/users", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: accountRole,
          studentIds: formData.getAll("studentIds"),
        }),
      });
      form.reset();
      setNotice("Account created. Share the temporary password securely with its owner.");
      await load(tab);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the account."); }
    finally { setBusy(false); }
  }

  async function saveParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingParent) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson(`/api/staff/users/${editingParent.id}`, { method: "PATCH", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), studentIds: form.getAll("studentIds") }) });
      setEditingParent(null);
      setNotice("Parent account and student links updated. Removed links revoke portal access and invitations.");
      await load(tab);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update parent account."); }
    finally { setBusy(false); }
  }

  async function saveStaffAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStaff) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson(`/api/staff/users/${editingStaff.id}/access`, { method: "PUT", body: JSON.stringify({ classIds: form.getAll("classIds"), sports: form.get("sports") === "on", safeguardingLead: form.get("safeguardingLead") === "on" }) });
      setEditingStaff(null); setNotice("Staff class and sports access updated."); await load("accounts");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update staff access."); }
    finally { setBusy(false); }
  }

  async function approveEvent(id: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson(`/api/staff/events/${id}/approve`, { method: "POST" });
      setNotice("Event approved. Invited parents can now see their invitations; public visibility is separate.");
      await load("content");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not approve event."); }
    finally { setBusy(false); }
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/staff/events/feedback", { method: "POST", body: JSON.stringify({ eventId: form.get("eventId"), studentId: form.get("studentId"), feedback: form.get("feedback") }) });
      element.reset(); setNotice("Private event feedback saved."); await load("content");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save event feedback."); }
    finally { setBusy(false); }
  }

  async function saveCurriculumFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson("/api/staff/learning/feedback", { method: "POST", body: JSON.stringify({ studentId: form.get("studentId"), feedback: form.get("feedback") }) });
      element.reset(); setNotice("Private curriculum feedback saved."); await load("learning");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save curriculum feedback."); }
    finally { setBusy(false); }
  }

  async function sendInvitations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const studentIds = formData.getAll("studentIds").map(String);
    if (studentIds.length === 0) {
      setError("Select at least one student to invite.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestJson<{ invited: number }>("/api/staff/content", {
        method: "PUT",
        body: JSON.stringify({ eventId: formData.get("eventId"), studentIds }),
      });
      setNotice(`${result.invited} parent invitation${result.invited === 1 ? "" : "s"} created.`);
      await load("content");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send invitations."); }
    finally { setBusy(false); }
  }

  async function openConcern(concern: Concern) {
    if (!lead) return;
    setError("");
    try {
      setConcernDetails(await requestJson<ConcernDetails>(`/api/staff/safeguarding/${concern.id}`));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open this confidential record."); }
  }

  async function changeConcernStatus(status: ConcernDetails["status"]) {
    if (!concernDetails) return;
    setError("");
    try {
      await requestJson(`/api/staff/safeguarding/${concernDetails.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setConcernDetails({ ...concernDetails, status });
      setNotice("Confidential record status updated.");
      await load("safeguarding");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update this record."); }
  }

  const visibleConsent = consents.filter((record) =>
    (filter === "ALL" || record.choice === filter) &&
    `${record.student.firstName} ${record.student.lastName} ${record.student.classGroup?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedNavigation = allowedNavigation.find(({ id }) => id === tab);

  return (
    <main className="portal-shell">
      <aside className={`portal-sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <Link href="/" className="portal-brand"><span className="portal-brand-icon">H</span><span><b>Hallaton</b><small>School workspace</small></span></Link>
        <div className="portal-nav-label">WORKSPACE</div>
        <nav className="portal-nav" aria-label="Staff portal">
          {allowedNavigation.map(({ id, label, icon: Icon }) => (
            <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => { setTab(id); setMenuOpen(false); }}>
              <Icon size={17} /><span>{label}</span>{id === "safeguarding" && concerns.some((item) => item.status === "OPEN") && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span><Shield size={16} /></span><b>Need a hand?</b><small>Ask your school administrator for help with access.</small></div>
          <button type="button" className="sidebar-signout" onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={15} /> Sign out</button>
          <div className="sidebar-privacy"><Shield size={12} /> Restricted school workspace</div>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <section className="portal-main">
        <header className="portal-topbar">
          <button type="button" className="portal-mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="portal-crumb">School workspace <span>/</span> <b>{selectedNavigation?.label}</b></div>
          <details className="portal-user-menu" ref={accountMenu}>
            <summary className="portal-user"><span className="portal-user-avatar">{name.charAt(0).toUpperCase()}</span><span><b>{name}</b><small>{role.replaceAll("_", " ").toLowerCase()}</small></span><ChevronDown size={14} /></summary>
            <div className="portal-user-dropdown">{role === "SUPER_ADMIN" && <button type="button" onClick={(event) => { setTab("social-settings"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Social media settings</button>}<button type="button" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button></div>
          </details>
        </header>
        <div className="portal-content">
          <div className="portal-page-heading">
            <div><span className="portal-eyebrow">{tab === "overview" ? "YOUR SCHOOL, AT A GLANCE" : "SCHOOL WORKSPACE"}</span><h1>{tab === "overview" ? `Good to see you, ${name.split(" ")[0]}.` : selectedNavigation?.label}</h1><p>{tab === "overview" ? "A calmer place to keep the everyday school things together." : tabDescription(tab)}</p></div>
            <div className="portal-today"><CalendarDays size={15} /> {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</div>
          </div>
          {error && <div className="portal-alert error-alert" role="alert"><CircleAlert size={16} />{error}</div>}
          {notice && <div className="portal-alert success-alert" role="status"><CheckCircle2 size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={14} /></button></div>}
          {tab === "overview" && (
            <>
              <div className="portal-stats">
                <button type="button" onClick={() => setTab("students")}><span className="stat-tile-icon blue-tile"><Users size={17} /></span><small>STUDENT PROFILES</small><strong>{students.length}</strong><span>In your school workspace</span></button>
                {role !== "SAFEGUARDING_LEAD" ? <button type="button" onClick={() => setTab("content")}><span className="stat-tile-icon gold-tile"><FileText size={17} /></span><small>NEWS &amp; UPDATES</small><strong>{content.announcements.length}</strong><span>{content.events.length} event listings</span></button> : <article><small>NEWS &amp; UPDATES</small><strong>—</strong><span>Access restricted by role</span></article>}
                {role !== "SUPER_ADMIN" ? <button type="button" onClick={() => setTab("safeguarding")}><span className="stat-tile-icon rose-tile"><Shield size={17} /></span><small>OPEN CONCERNS</small><strong>{concerns.filter((item) => item.status === "OPEN").length}</strong><span>View safeguarding register</span></button> : <article><span className="stat-tile-icon rose-tile"><Shield size={17} /></span><small>OPEN CONCERNS</small><strong>—</strong><span>Restricted to safeguarding staff</span></article>}
              </div>
              <div className="portal-overview-grid">
                <article className="portal-panel">
                  <div className="panel-heading"><div><span className="portal-eyebrow">KEEP THINGS MOVING</span><h2>Quick actions</h2></div><ClipboardList size={18} /></div>
                  <div className="quick-actions">
                    {role !== "SAFEGUARDING_LEAD" && <button onClick={() => setTab("content")}><span className="quick-icon quick-gold"><Plus size={16} /></span><span><b>Post a school update</b><small>Announcement, event or newsletter</small></span><ArrowUpRight size={15} /></button>}
                    {role !== "SAFEGUARDING_LEAD" && <button onClick={() => setTab("learning")}><span className="quick-icon quick-blue"><BookOpen size={16} /></span><span><b>Share weekly learning</b><small>Learning notes and homework</small></span><ArrowUpRight size={15} /></button>}
                    <button onClick={() => setTab("students")}><span className="quick-icon quick-green"><Users size={16} /></span><span><b>View student profiles</b><small>Contacts and essential information</small></span><ArrowUpRight size={15} /></button>
                  </div>
                </article>
                <article className="portal-panel portal-reminder"><span className="reminder-spark">✳</span><span className="portal-eyebrow">A GENTLE REMINDER</span><h2>Little things<br />make a big difference.</h2><p>Keep family information up to date, share learning regularly and make space for the good news too.</p><span className="reminder-note"><Shield size={14} /> Student records stay within the school portal.</span></article>
              </div>
              {role !== "SAFEGUARDING_LEAD" && <article className="portal-panel latest-panel">
                <div className="panel-heading"><div><span className="portal-eyebrow">RECENTLY ADDED</span><h2>Latest school updates</h2></div><button className="small-panel-link" onClick={() => setTab("content")}>Manage updates <ArrowUpRight size={13} /></button></div>
                {content.announcements.length === 0 && content.events.length === 0 ? <p className="empty-state">No school updates have been added yet.</p> : <div className="latest-list">{content.announcements.slice(0, 3).map((item) => <div key={item.id}><span className="latest-dot" /><span><b>{item.title}</b><small>Announcement · {item.publishedAt ? "Published" : "Draft"}</small></span></div>)}</div>}
              </article>}
            </>
          )}
          {tab === "enquiries" && <EnquiryInbox isAdmin={role === "SUPER_ADMIN"} />}
          {tab === "enquiry-settings" && role === "SUPER_ADMIN" && <EnquirySettings />}
          {tab === "social-settings" && role === "SUPER_ADMIN" && <SocialSettings />}
          {tab === "website-popup" && role !== "SAFEGUARDING_LEAD" && <WebsitePopupSettings canPublish={role === "SUPER_ADMIN"} />}
          {tab === "website-pages" && role !== "SAFEGUARDING_LEAD" && <WebsitePageSettings canPublish={role === "SUPER_ADMIN"} />}
          {tab === "statutory-settings" && role !== "SAFEGUARDING_LEAD" && <StatutorySettings />}
          {tab === "website-promotion" && role === "SUPER_ADMIN" && <WebsitePromotion />}
          {tab === "audit" && (role === "SUPER_ADMIN" || lead) && <AuditTrail students={students} safeguardingOnly={role !== "SUPER_ADMIN"} />}
          {tab === "meals" && role !== "SAFEGUARDING_LEAD" && <MealPlanner parent={false} admin={role === "SUPER_ADMIN"} />}
          {tab === "content" && <div className="portal-section-grid">
            <article className="portal-panel portal-form-panel">
              <div className="panel-heading"><div><span className="portal-eyebrow">CREATE SOMETHING TO SHARE</span><h2>School communications</h2></div><Bell size={18} /></div>
              <form className="portal-form" onSubmit={createContent}>
                <label>What are you adding?<select name="type" value={contentType} onChange={(event) => setContentType(event.target.value)}><option value="announcement">Announcement</option><option value="event">School event</option><option value="newsletter">Newsletter archive entry</option></select></label>
                {contentType === "event" && <label>Event category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)}><option value="GENERAL">General event</option><option value="SPORTS">Sports event</option></select></label>}
                <label>Title<input name="title" required minLength={3} maxLength={120} placeholder="A clear, friendly title" /></label>
                {contentType !== "newsletter" && <label>Details<textarea name="body" required minLength={5} maxLength={10000} placeholder="Share the important details…" /></label>}
                {contentType === "event" && <><label>Event date and time<input name="startsAt" type="datetime-local" required /></label><label>Meeting details (invited parents only)<input name="meetingInfo" maxLength={500} placeholder="Where to meet, when and who to ask for" /></label><label>What to bring (invited parents only)<textarea name="gearList" maxLength={2000} placeholder="Clothing, equipment or anything else families need" /></label><label>Invite parents of selected students<select name="studentIds" multiple size={Math.min(6, Math.max(students.length, 2))}>{(role === "SUPER_ADMIN" || (sports && eventCategory === "SPORTS") ? roster : students).map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.classGroup?.name ?? "No class"}</option>)}</select></label><small className="input-hint">Use Ctrl or Command to select multiple students. Leave empty for no invitations. Each selected student needs an active linked parent. Invitations appear in the parent portal; no email is sent.</small></>}
                {contentType === "newsletter" && <><label>Issue date<input name="issueDate" type="date" required /></label><label>Public file link<input name="publicUrl" type="url" placeholder="Optional link to a published newsletter" /></label></>}
                {contentType === "event" && <label className="publish-toggle"><input type="checkbox" checked={eventSummaryDraft} onChange={(event) => { setEventSummaryDraft(event.target.checked); if (!event.target.checked) setPublicEvent(false); }} /><span>Prepare a separate public event summary</span></label>}
                {contentType === "event" && eventSummaryDraft && <><p className="panel-note">This stays a draft unless an administrator publishes it. The public sees only the public title, summary and event date. Check these for safeguarding concerns.</p><label>Public title<input name="publicTitle" required minLength={3} maxLength={120} /></label><label>Public summary<textarea name="publicSummary" required minLength={5} maxLength={2000} /></label></>}
                {role === "SUPER_ADMIN" ? (contentType === "event" ? <label className="publish-toggle"><input type="checkbox" name="publish" disabled={!eventSummaryDraft} checked={publicEvent} onChange={(event) => setPublicEvent(event.target.checked)} /><span>Publish this public event summary immediately</span></label> : <label className="publish-toggle"><input type="checkbox" name="publish" /><span>Publish on the public school website</span></label>) : <p className="panel-note">Only an administrator can publish to the public website.</p>}
                <button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save school update"} <ArrowUpRight size={15} /></button>
              </form>
            </article>
            <article className="portal-panel">
              <div className="panel-heading"><div><span className="portal-eyebrow">YOUR CONTENT</span><h2>Recent items</h2></div><FileText size={18} /></div>
              <div className="content-list">
                {[
                  ...content.announcements.map((item) => ({ id: item.id, title: item.title, kind: "Announcement", date: item.publishedAt, published: Boolean(item.publishedAt) })),
                  ...content.newsletters.map((item) => ({ id: item.id, title: item.title, kind: "Newsletter", date: item.issueDate, published: Boolean(item.publishedAt) })),
                  ...content.events.map((item) => ({ id: item.id, title: item.title, kind: "Event", date: item.startsAt, published: item.published })),
                ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 10).map((item) => (
                  <div className="content-row" key={`${item.kind}-${item.id}`}><span className="content-type">{item.kind === "Event" ? <CalendarDays size={15} /> : <FileText size={15} />}</span><span><b>{item.title}</b><small>{item.kind} · {item.date ? formatDate(item.date) : "Draft"}</small></span>{role !== "SUPER_ADMIN" || (!item.published && item.kind === "Event") ? <span className={item.published ? "status-live" : "status-draft"}>{item.published ? "Published" : item.kind === "Event" ? "Private or awaiting approval" : "Draft"}</span> : <button type="button" className={item.published ? "status-live status-control-button" : "status-draft status-control-button"} onClick={() => void updatePublication(item.kind.toLowerCase() as "announcement" | "newsletter" | "event", item.id, !item.published)}>{item.published ? "Unpublish" : "Publish"}</button>}</div>
                ))}
                {content.announcements.length + content.newsletters.length + content.events.length === 0 && <p className="empty-state">Your updates, events and newsletter archive will appear here.</p>}
              </div>
              {role === "SUPER_ADMIN" && <div className="invite-panel"><h3>Review unpublished updates</h3>{content.announcements.filter((item) => !item.publishedAt).map((item) => <div key={item.id}><b>{item.title}</b><p>{item.body}</p></div>)}{content.newsletters.filter((item) => !item.publishedAt).map((item) => <p key={item.id}><b>{item.title}</b> · {formatDate(item.issueDate)}<br />{item.publicUrl || "No file link"}</p>)}</div>}
              {role === "SUPER_ADMIN" && content.events.some((event) => event.approved && !event.published) && <div className="invite-panel"><h3>Publish an event summary</h3><p className="panel-note">Only the public title, summary and event date are published. Review for safeguarding before sharing.</p><form className="portal-form" onSubmit={publishEvent}><label>Private event<select name="eventId" required>{content.events.filter((event) => event.approved && !event.published).map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label><label>Public title<input name="publicTitle" required minLength={3} maxLength={120} /></label><label>Public summary<textarea name="publicSummary" required minLength={5} maxLength={2000} /></label><button className="portal-submit" disabled={busy}>Publish summary</button></form></div>}
              <div className="invite-panel">
                {role === "SUPER_ADMIN" && content.events.filter((event) => !event.approved).map((event) => <div key={event.id}><p><b>{event.title}</b> · {event.category.toLowerCase()} · {formatDate(event.startsAt)} · awaiting approval</p><p>{event.description}</p><p>Meeting: {event.meetingInfo || "None"} · Equipment: {event.gearList || "None"}</p><p>Invited pupils: {[...new Map(event.invites.map((invite) => [invite.studentId, `${invite.student.firstName} ${invite.student.lastName}`])).values()].join(", ") || "None"}</p><button className="portal-submit" disabled={busy} type="button" onClick={() => void approveEvent(event.id)}>Approve event and invitations</button></div>)}
                <span className="portal-eyebrow">PARENT INVITATIONS</span>
                <h3>Invite families to an event</h3>
                {content.events.length === 0 || (sports || role === "SUPER_ADMIN" ? roster.length : students.length) === 0 ? <p className="empty-state">Add an event and student records before sending invitations.</p> :
                  <form className="portal-form" onSubmit={sendInvitations}>
                    <label>Event<select name="eventId" required>{content.events.map((event) => <option value={event.id} key={event.id}>{event.title} · {formatDate(event.startsAt)}</option>)}</select></label>
                    <label>Choose students<select name="studentIds" multiple required size={Math.min(5, Math.max((sports || role === "SUPER_ADMIN" ? roster : students).length, 2))}>{(sports || role === "SUPER_ADMIN" ? roster : students).map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.classGroup?.name ?? "No class"}</option>)}</select></label>
                    <small className="input-hint">Use Ctrl or Command to select more than one student. Linked active parents receive portal invitations; no email is sent.</small>
                    <button className="portal-submit" disabled={busy}>{busy ? "Creating invitations…" : "Invite selected families"} <ArrowUpRight size={15} /></button>
                  </form>}
              </div>
              {(role === "SUPER_ADMIN" || sports) && <div className="invite-panel"><h3>Private event feedback</h3><p className="panel-note">Staff only. The pupil must have been invited to an approved event. Do not record safeguarding concerns here.</p><form className="portal-form" onSubmit={saveFeedback}><label>Approved event<select name="eventId" required><option value="">Select an event</option>{content.events.filter((event) => event.approved && event.category === "SPORTS").map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label><label>Invited pupil<select name="studentId" required><option value="">Select a pupil</option>{roster.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.classGroup?.name ?? "No class"}</option>)}</select></label><label>Event feedback<textarea name="feedback" required maxLength={5000} /></label><button className="portal-submit" disabled={busy}>Save feedback</button></form>{feedback.map((item) => <p key={item.id}><b>{item.student.firstName} {item.student.lastName} · {item.event.title}</b><br />{item.feedback}<br /><small>{item.author.name ?? "Staff member"}</small></p>)}</div>}
            </article>
          </div>}
          {tab === "learning" && <div className="portal-section-grid">
            <article className="portal-panel portal-form-panel">
              <div className="panel-heading"><div><span className="portal-eyebrow">FOR THE WEEK AHEAD</span><h2>Share class learning</h2></div><BookOpen size={18} /></div>
              {classGroups.length === 0 ? <p className="empty-state">Class groups will be available when student records are added.</p> :
                <form className="portal-form" onSubmit={saveLearning}>
                  <label>Class group<select name="classGroupId" required>{classGroups.map((group) => <option value={group.id} key={group.id}>{group.name} · {group.yearGroup}</option>)}</select></label>
                  <label>Week commencing<input name="weekOf" type="date" required /></label>
                  <label>What we&apos;re learning<textarea name="learning" required minLength={1} maxLength={10000} placeholder="A short overview for families" /></label>
                  <label>Homework or home learning<textarea name="homework" maxLength={10000} placeholder="Optional home learning notes" /></label>
                  <button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save weekly learning"} <ArrowUpRight size={15} /></button>
                </form>}
            </article>
            <article className="portal-panel"><div className="panel-heading"><div><span className="portal-eyebrow">RECENT WEEKS</span><h2>Class learning notes</h2></div><BookOpen size={18} /></div>
              <div className="learning-list">{learning.map((entry) => <div key={entry.id}><span>{formatDate(entry.weekOf)}</span><b>{entry.classGroup.name} · {entry.classGroup.yearGroup}</b><p>{entry.learning}</p>{entry.homework && <small>Home learning: {entry.homework}</small>}</div>)}{learning.length === 0 && <p className="empty-state">No weekly learning notes have been added yet.</p>}</div>
              <div className="invite-panel"><h3>Private curriculum feedback</h3><p className="panel-note">Visible to administrators and staff assigned to the pupil&apos;s class, not parents. Do not record safeguarding concerns here.</p><form className="portal-form" onSubmit={saveCurriculumFeedback}><label>Pupil<select name="studentId" required><option value="">Select a pupil</option>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.classGroup?.name ?? "No class"}</option>)}</select></label><label>Feedback<textarea name="feedback" required maxLength={5000} /></label><button className="portal-submit" disabled={busy}>Save feedback</button></form>{curriculumFeedback.map((item) => <p key={item.id}><b>{item.student.firstName} {item.student.lastName}</b><br />{item.feedback}<br /><small>{item.author.name ?? "Staff member"}</small></p>)}</div>
            </article>
          </div>}
          {tab === "students" && <article className="portal-panel"><div className="panel-heading"><div><span className="portal-eyebrow">PRIVATE · SCHOOL STAFF</span><h2>Student profiles</h2></div><div className="panel-actions">{role === "SUPER_ADMIN" && <button className="small-panel-link" onClick={() => setClassFormOpen(!classFormOpen)}><Plus size={13} /> Class group</button>}{role === "SUPER_ADMIN" && <button className="small-panel-link" onClick={() => setStudentFormOpen(!studentFormOpen)}><Plus size={13} /> Add student</button>}</div></div><p className="privacy-explainer"><LockIcon /> Emergency contacts, medical and dietary information are encrypted before they are stored. Only authorised school staff can access these records.</p>
            {classFormOpen && <form className="inline-create-form" onSubmit={createClassGroup}><label>Class name<input name="name" required maxLength={80} placeholder="Class name" /></label><label>Year group<input name="yearGroup" required maxLength={40} placeholder="Year group" /></label><button className="portal-submit" disabled={busy}>Create class group</button></form>}
            {studentFormOpen && <form className="inline-create-form" onSubmit={createStudent}><label>First name<input name="firstName" required maxLength={80} /></label><label>Last name<input name="lastName" required maxLength={80} /></label><label>Student reference<input name="reference" required maxLength={40} /></label><label>Class group<select name="classGroupId"><option value="">Not assigned</option>{classGroups.map((group) => <option value={group.id} key={group.id}>{group.name} · {group.yearGroup}</option>)}</select></label><button className="portal-submit" disabled={busy}>Create student profile</button></form>}
            <div className="student-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Reference</th><th>Class</th>{role === "SUPER_ADMIN" && <th>Linked parents</th>}<th>Profile details</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><b>{student.firstName} {student.lastName}</b></td><td>{student.reference}</td><td>{student.classGroup?.name ?? "Not assigned"}</td>{role === "SUPER_ADMIN" && <td>{users.filter((user) => user.role === "PARENT" && user.parentLinks.some((link) => link.studentId === student.id)).map((user) => <div key={user.id}><button className="row-action" type="button" onClick={() => setEditingParent(user)}>{user.name ?? user.email}</button><small>{user.email}{user.active ? "" : " · inactive"}</small></div>)}<button className="row-action" type="button" onClick={() => setTab("accounts")}>Manage accounts</button></td>}<td><button className="row-action" type="button" onClick={() => setProfileStudent(student)}>{student.privateProfile ? "View / edit details" : "Add details"}</button></td></tr>)}</tbody></table>{students.length === 0 && <p className="empty-state">Student records will appear here when securely added by the school.</p>}</div>
          </article>}
          {tab === "safeguarding" && <div className="portal-section-grid">
            <article className="portal-panel portal-form-panel"><div className="panel-heading"><div><span className="portal-eyebrow">CONFIDENTIAL · STAFF ONLY</span><h2>Record a concern</h2></div><Shield size={18} /></div>
              <div className="safeguarding-warning"><Shield size={16} /><p>Use this secure record for safeguarding concerns. For an immediate risk, follow the school&apos;s established safeguarding procedure and contact emergency services where needed.</p></div>
              {roster.length === 0 ? <p className="empty-state">Student list not available for this role. Ask an administrator to verify your access.</p> :
                <form className="portal-form" onSubmit={createConcern}><label>Student<select name="studentId" required>{roster.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.reference}</option>)}</select></label><label>Concern details<textarea name="details" minLength={10} maxLength={10000} required placeholder="Record factual information relevant to this concern." /></label><button className="portal-submit" disabled={busy}>{busy ? "Saving securely…" : "Save confidential record"} <Shield size={15} /></button></form>}
            </article>
            <article className="portal-panel"><div className="panel-heading"><div><span className="portal-eyebrow">RESTRICTED REGISTER</span><h2>Concern records</h2></div><span className="restricted-pill"><Shield size={12} /> Access logged</span></div><p className="panel-note">Details are encrypted and visible only to the safeguarding lead. Staff can see the record status and date only.</p><div className="concern-list">{concerns.map((concern) => <button className="concern-row" key={concern.id} onClick={() => void openConcern(concern)} disabled={!lead}><span className="concern-shield"><Shield size={15} /></span><span><b>Confidential record</b><small>Added {formatDate(concern.createdAt)}</small></span><span className={`concern-status ${concern.status.toLowerCase()}`}>{concern.status.toLowerCase()}</span></button>)}{concerns.length === 0 && <p className="empty-state">No safeguarding records are available in this register.</p>}</div></article>
          </div>}
          {tab === "consent" && <article className="portal-panel"><div className="panel-heading"><div><span className="portal-eyebrow">STUDENT MEDIA PERMISSIONS</span><h2>Social media consent</h2></div><Heart size={18} /></div><p className="panel-note">Review consent before sharing any student image or identifying information on social media.</p>
            <div className="consent-controls"><label className="consent-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students or classes" /></label><label className="filter-select"><span>Show</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All consent</option><option value="PENDING">Pending</option><option value="GRANTED">Granted</option><option value="DECLINED">Declined</option></select></label></div>
            <div className="student-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Class</th><th>Consent</th><th>Last updated</th><th>Change record</th></tr></thead><tbody>{visibleConsent.map((record) => <tr key={record.student.reference}><td><b>{record.student.firstName} {record.student.lastName}</b><small>{record.student.reference}</small></td><td>{record.student.classGroup?.name ?? "—"}</td><td><span className={`consent-badge ${record.choice.toLowerCase()}`}>{record.choice.toLowerCase()}</span></td><td>{formatDate(record.updatedAt)}</td><td><select aria-label={`Update consent for ${record.student.firstName} ${record.student.lastName}`} value={record.choice} onChange={(event) => void updateConsent(record.student.id, event.target.value as Consent["choice"])} disabled={role === "SAFEGUARDING_LEAD"}><option value="PENDING">Pending</option><option value="GRANTED">Granted</option><option value="DECLINED">Declined</option></select></td></tr>)}</tbody></table>{visibleConsent.length === 0 && <p className="empty-state">No consent records found. Consent records are created when student records are added by the school.</p>}</div>
          </article>}
          {tab === "accounts" && role === "SUPER_ADMIN" && <div className="portal-section-grid">
            <article className="portal-panel portal-form-panel"><div className="panel-heading"><div><span className="portal-eyebrow">ADMINISTRATOR ONLY</span><h2>Create a school account</h2></div><Users size={18} /></div><p className="panel-note">Use a unique, temporary password and deliver it to the account owner through a separate secure channel. Passwords must be at least 14 characters.</p><form className="portal-form" onSubmit={createAccount}><label>Full name<input name="name" required minLength={2} maxLength={100} /></label><label>School email<input name="email" type="email" required maxLength={254} /></label><label>Temporary password<input name="password" type="password" required minLength={14} maxLength={72} autoComplete="new-password" /></label><label>Role<select value={accountRole} onChange={(event) => setAccountRole(event.target.value as Role)}><option value="PARENT">Parent</option><option value="TEACHER">Teacher</option><option value="SAFEGUARDING_LEAD">Safeguarding lead</option><option value="SUPER_ADMIN">Super admin</option></select></label>{accountRole === "PARENT" && <label>Link student(s)<select name="studentIds" multiple size={Math.min(5, Math.max(students.length, 2))}>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName}</option>)}</select></label>}<button className="portal-submit" disabled={busy}>Create account <ArrowUpRight size={15} /></button></form></article>
            <article className="portal-panel"><div className="panel-heading"><div><span className="portal-eyebrow">SCHOOL ACCESS</span><h2>Accounts</h2></div><Shield size={18} /></div><p className="panel-note">Multiple parent accounts can be linked to the same student. Editing an email changes the sign-in address. Removing a link revokes access and existing invitations.</p><div className="content-list">{users.map((user) => <div className="content-row" key={user.id}><span className="portal-user-avatar">{(user.name ?? "?").charAt(0).toUpperCase()}</span><span><b>{user.name ?? "Unnamed account"}</b><small>{user.email} · {user.role.toLowerCase().replaceAll("_", " ")}{user.role === "PARENT" ? ` · ${user._count.parentLinks} linked student(s)` : ""}</small></span>{user.role === "PARENT" ? <button className="row-action" type="button" onClick={() => setEditingParent(user)}>Edit parent</button> : user.role === "TEACHER" ? <button className="row-action" type="button" onClick={() => setEditingStaff(user)}>Edit staff access</button> : <span className={user.active ? "status-live" : "status-draft"}>{user.active ? "Active" : "Inactive"}</span>}</div>)}{users.length === 0 && <p className="empty-state">No accounts have been added yet.</p>}</div></article>
          </div>}
          <footer className="portal-footer"><span><Shield size={12} /> Private school workspace · Do not share sign-in details</span><span>Hallaton Church of England Primary School</span></footer>
        </div>
      </section>
      {profileStudent && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileStudent(null); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title"><button className="modal-close" onClick={() => setProfileStudent(null)} aria-label="Close profile"><X size={18} /></button><span className="portal-eyebrow">ENCRYPTED STUDENT INFORMATION</span><h2 id="profile-modal-title">{profileStudent.firstName} {profileStudent.lastName}</h2><p className="panel-note">Only record information necessary for the school to care for this child.</p><form className="portal-form" onSubmit={saveProfile}><label>Emergency contacts<textarea name="emergencyContacts" defaultValue={readProfile(profileStudent.privateProfile).emergencyContacts} maxLength={5000} /></label><label>Medical information<textarea name="medical" defaultValue={readProfile(profileStudent.privateProfile).medical} maxLength={5000} /></label><label>Dietary information<textarea name="dietary" defaultValue={readProfile(profileStudent.privateProfile).dietary} maxLength={5000} /></label><button className="portal-submit" disabled={busy}>{busy ? "Saving securely…" : "Encrypt and save"} <Shield size={15} /></button></form></section></div>}
      {editingStaff && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingStaff(null); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="staff-access-title"><button className="modal-close" onClick={() => setEditingStaff(null)} aria-label="Close staff access"><X size={18} /></button><h2 id="staff-access-title">Staff access: {editingStaff.name}</h2><p className="panel-note">Assign one or more classes. Sports access permits inviting pupils across the school and private event feedback, not curriculum access to other classes.</p><form className="portal-form" onSubmit={saveStaffAccess}><label>Assigned classes<select name="classIds" multiple size={Math.min(6, Math.max(classGroups.length, 2))} defaultValue={editingStaff.classAssignments.map((assignment) => assignment.classGroupId)}>{classGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.yearGroup}</option>)}</select></label><small className="input-hint">Use Ctrl or Command to select multiple classes.</small><label className="publish-toggle"><input type="checkbox" name="sports" defaultChecked={editingStaff.sportsCoordinator} /><span>Sports event coordinator</span></label><label className="publish-toggle"><input type="checkbox" name="safeguardingLead" defaultChecked={editingStaff.safeguardingLead} /><span>Safeguarding lead (confidential access)</span></label><button className="portal-submit" disabled={busy}>Save staff access</button></form></section></div>}
      {editingParent && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingParent(null); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="parent-modal-title"><button className="modal-close" onClick={() => setEditingParent(null)} aria-label="Close parent account"><X size={18} /></button><h2 id="parent-modal-title">Edit parent account</h2><p className="panel-note">Changing the email changes the login. Deselecting a student revokes access and removes existing invitations and shared enquiries.</p><form className="portal-form" onSubmit={saveParent}><label>Name<input name="name" defaultValue={editingParent.name ?? ""} required minLength={2} maxLength={100} /></label><label>Login email<input name="email" type="email" defaultValue={editingParent.email ?? ""} required maxLength={254} /></label><label>Linked students<select name="studentIds" multiple size={Math.min(6, Math.max(students.length, 2))} defaultValue={editingParent.parentLinks.map((link) => link.studentId)}>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.reference}</option>)}</select></label><small className="input-hint">Use Ctrl or Command to select multiple students.</small><button className="portal-submit" disabled={busy}>Save parent account</button></form></section></div>}
      {concernDetails && lead && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConcernDetails(null); }}><section className="profile-modal concern-modal" role="dialog" aria-modal="true" aria-labelledby="concern-modal-title"><button className="modal-close" onClick={() => setConcernDetails(null)} aria-label="Close concern"><X size={18} /></button><span className="portal-eyebrow">CONFIDENTIAL · ACCESS IS AUDITED</span><h2 id="concern-modal-title">Safeguarding record</h2><p className="panel-note">Recorded {formatDate(concernDetails.createdAt)} · Student reference {students.find((student) => student.id === concernDetails.studentId)?.reference ?? "restricted"}</p><div className="concern-detail-text">{concernDetails.details}</div><label className="status-control">Record status<select value={concernDetails.status} onChange={(event) => void changeConcernStatus(event.target.value as ConcernDetails["status"])}><option value="OPEN">Open</option><option value="REVIEWING">Reviewing</option><option value="RESOLVED">Resolved</option></select></label></section></div>}
    </main>
  );
}

function readProfile(value: string | null): { emergencyContacts: string; medical: string; dietary: string } {
  if (!value) return { emergencyContacts: "", medical: "", dietary: "" };
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return { emergencyContacts: "", medical: "", dietary: "" };
    const record = parsed as Record<string, unknown>;
    return {
      emergencyContacts: typeof record.emergencyContacts === "string" ? record.emergencyContacts : "",
      medical: typeof record.medical === "string" ? record.medical : "",
      dietary: typeof record.dietary === "string" ? record.dietary : "",
    };
  } catch {
    return { emergencyContacts: "", medical: "", dietary: "" };
  }
}

function LockIcon() {
  return <Shield size={15} aria-hidden="true" />;
}

function tabDescription(tab: Tab) {
  const descriptions: Record<Tab, string> = {
    overview: "A calmer place to keep school life together.",
    content: "Share school news, event details and newsletter archive entries.",
    learning: "Keep families in the loop with weekly class learning and homework.",
    meals: "Plan menus and review aggregate meal choices.",
    students: "Essential student contact and care information, kept private.",
    safeguarding: "A restricted register for recording and reviewing concerns.",
    consent: "Check permission before sharing a student's image or information.",
    accounts: "Create and review role-based school workspace accounts.",
    enquiries: "Review messages from existing and prospective families.",
    "enquiry-settings": "Configure inbox access and retention review.",
    "social-settings": "Manage the school's public social media links.",
    audit: "Review recorded school activity and filter by student.",
    "website-popup": "Schedule an image and message for the public homepage.",
    "website-pages": "Edit and preview school information page text.",
    "website-promotion": "Review and publish selected website drafts together.",
    "statutory-settings": "Manage links to school information and reports.",
  };
  return descriptions[tab];
}
