"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CalendarDays, CheckCircle2, ChevronRight, LogOut, Shield, Sparkles } from "lucide-react";
import { MealPlanner } from "@/components/meal-planner";

type Invite = {
  id: string;
  status: "INVITED" | "ACCEPTED" | "DECLINED";
  student: { firstName: string; lastName: string };
  event: {
    id: string;
    title: string;
    description: string;
    startsAt: string;
    meetingInfo: string | null;
    gearList: string | null;
  };
};
type LearningEntry = { id: string; weekOf: string; learning: string; homework: string | null; classGroup: { name: string; yearGroup: string } };
type Enquiry = { id: string; senderName: string; message: string; createdAt: string; student: { firstName: string; lastName: string } };

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ParentDashboard({ name }: { name: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [learning, setLearning] = useState<LearningEntry[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [eventResponse, learningResponse, enquiryResponse] = await Promise.all([
      fetch("/api/staff/events"),
      fetch("/api/staff/learning"),
      fetch("/api/parent/enquiries"),
    ]);
    if (!eventResponse.ok || !learningResponse.ok || !enquiryResponse.ok) throw new Error("Family portal information could not be loaded.");
    setInvites(await eventResponse.json());
    setLearning(await learningResponse.json());
    setEnquiries(await enquiryResponse.json());
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load family information."));
  }, [load]);

  async function respond(eventId: string, status: "ACCEPTED" | "DECLINED") {
    setError("");
    try {
      const response = await fetch(`/api/staff/events/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Your RSVP could not be saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your RSVP could not be saved.");
    }
  }

  return (
    <main className="family-shell">
      <header className="family-topbar">
        <Link href="/" className="portal-brand"><span className="portal-brand-icon">H</span><span><b>Hallaton</b><small>Family space</small></span></Link>
        <div className="family-user"><span>{name}</span><button onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={15} /> Sign out</button></div>
      </header>
      <div className="family-content">
        <span className="portal-eyebrow">YOUR SCHOOL COMMUNITY</span>
        <h1>Hello, {name.split(" ")[0]}.</h1>
        <p className="family-intro">The everyday school things, all in one place.</p>
        {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
        <MealPlanner parent />
        <div className="family-grid">
          <section className="portal-panel">
            <div className="panel-heading"><div><span className="portal-eyebrow">DATES TO REMEMBER</span><h2>School events</h2></div><CalendarDays size={18} /></div>
            <div className="family-events">
              {invites.map((invite) => (
                <article className="family-event" key={invite.id}>
                  <span className="family-event-date">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(invite.event.startsAt))}</span>
                  <div className="family-event-main"><span className="event-for">For {invite.student.firstName}</span><h3>{invite.event.title}</h3><time className="family-event-time">{formatEventDate(invite.event.startsAt)}</time><p>{invite.event.description}</p>{invite.event.meetingInfo && <small><b>Meeting:</b> {invite.event.meetingInfo}</small>}{invite.event.gearList && <small><b>Please bring:</b> {invite.event.gearList}</small>}
                    <div className="rsvp-actions"><span className={`consent-badge ${invite.status.toLowerCase()}`}>{invite.status.toLowerCase()}</span><button onClick={() => void respond(invite.id, "ACCEPTED")}><CheckCircle2 size={14} /> Can attend</button><button onClick={() => void respond(invite.id, "DECLINED")}>Can&apos;t attend</button></div>
                  </div><ChevronRight size={15} className="family-chevron" />
                </article>
              ))}
              {invites.length === 0 && <p className="empty-state">There are no event invitations just now. New invitations from school will appear here.</p>}
            </div>
          </section>
          <section className="portal-panel">
            <div className="panel-heading"><div><span className="portal-eyebrow">FROM THE CLASSROOM</span><h2>Learning this week</h2></div><Sparkles size={18} /></div>
            <div className="family-learning">
              {learning.map((entry) => <article key={entry.id}><span>{entry.classGroup.name} · {entry.classGroup.yearGroup} · Week of {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(entry.weekOf))}</span><p>{entry.learning}</p>{entry.homework && <small><b>Home learning:</b> {entry.homework}</small>}</article>)}
              {learning.length === 0 && <p className="empty-state">Weekly learning notes will appear here when the class team shares them.</p>}
            </div>
            <section className="portal-panel family-enquiries">
              <div className="panel-heading"><div><span className="portal-eyebrow">SHARED BY SCHOOL</span><h2>Correspondence</h2></div></div>
              <div className="enquiry-list">{enquiries.map((item) => <article key={item.id}><h3>{item.student.firstName} {item.student.lastName}</h3><p>From {item.senderName} · {new Date(item.createdAt).toLocaleDateString("en-GB")}</p><p className="enquiry-message">{item.message}</p></article>)}
                {enquiries.length === 0 && <p className="empty-state">No correspondence has been shared with your account.</p>}
              </div>
            </section>
          </section>
        </div>
        <div className="family-privacy"><Shield size={14} /> Private family portal · Only information linked to your account is shown.</div>
      </div>
    </main>
  );
}
