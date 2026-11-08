"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Settings = { notificationEmail: string | null; teacherAccess: boolean; safeguardingLeadAccess: boolean; reviewAfterDays: number | null };
type Student = { id: string; firstName: string; lastName: string; reference: string; parentLinks: Array<{ user: { id: string; name: string | null; email: string | null } }> };
type Share = { studentId: string; userId: string };
type Enquiry = { id: string; senderName: string; message: string; createdAt: string; reviewedAt: string | null; reviewDue: boolean; contact: { email: string }; parent: { name: string | null } | null; students: Array<{ studentId: string }>; shares: Share[]; reviews: Array<{ id: string; createdAt: string; decision: string; reviewer: { name: string | null } }> };
type Inbox = { enquiries: Enquiry[]; students: Student[]; reviewAfterDays: number | null };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result as T;
}

export function EnquirySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { request<Settings>("/api/staff/enquiry-settings").then(setSettings).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load settings.")); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const days = String(form.get("reviewAfterDays") ?? "");
    setBusy(true); setError(""); setNotice("");
    try {
      await request("/api/staff/enquiry-settings", { method: "PUT", body: JSON.stringify({
        notificationEmail: form.get("notificationEmail"),
        teacherAccess: form.has("teacherAccess"),
        safeguardingLeadAccess: form.has("safeguardingLeadAccess"),
        reviewAfterDays: days ? Number(days) : null,
      }) });
      setNotice("Settings saved. Email notifications remain disconnected until an email provider is configured.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">ADMINISTRATOR ONLY</span><h2>Enquiry settings</h2></div></div>
    <p className="panel-note">Email integration is not connected. The notification address is saved for future use; no notification is sent. Administrators always have access.</p>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    {settings && <form className="portal-form" onSubmit={save}>
      <label>Notification email address<input name="notificationEmail" type="email" maxLength={254} defaultValue={settings.notificationEmail ?? ""} /></label>
      <label className="publish-toggle"><input type="checkbox" name="teacherAccess" defaultChecked={settings.teacherAccess} />Allow teachers access to enquiries</label>
      <label className="publish-toggle"><input type="checkbox" name="safeguardingLeadAccess" defaultChecked={settings.safeguardingLeadAccess} />Allow safeguarding leads access to enquiries</label>
      <label>Review enquiries after (days)<input name="reviewAfterDays" type="number" min="1" max="36500" defaultValue={settings.reviewAfterDays ?? ""} /></label>
      <p className="panel-note">Set the review interval in line with the school&apos;s approved retention schedule. Blank means not configured. Review does not delete records; check legal duties and holds before disposal.</p>
      <button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>}
  </article>;
}

export function EnquiryInbox({ isAdmin }: { isAdmin: boolean }) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => setInbox(await request<Inbox>("/api/staff/enquiries")), []);
  useEffect(() => { void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load enquiries.")); }, [load]);
  async function update(id: string, body: object, method = "PATCH") {
    setError(""); setNotice("");
    try {
      await request(`/api/staff/enquiries/${id}`, { method, body: JSON.stringify(body) });
      await load();
      setNotice("Enquiry updated.");
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update enquiry."); return false; }
  }
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">PRIVATE · AUTHORISED STAFF</span><h2>Contact enquiries</h2></div></div>
    <p className="panel-note">Email matches are unverified. Confirm identity before discussing a family. External email and notifications are not connected. Link earlier enquiries after a child is enrolled. Only share a complete message after checking it is appropriate for the named parent.</p>
    {inbox && inbox.reviewAfterDays === null && <p className="safeguarding-warning">A retention review interval has not been configured by an administrator.</p>}
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}
    {notice && <div className="portal-alert success-alert" role="status">{notice}</div>}
    <div className="enquiry-list">{inbox?.enquiries.map((item) => <EnquiryRecord key={item.id} item={item} students={inbox.students} reviewAfterDays={inbox.reviewAfterDays} update={update} isAdmin={isAdmin} />)}
      {inbox && inbox.enquiries.length === 0 && <p className="empty-state">No enquiries received yet.</p>}
    </div>
  </article>;
}

function EnquiryRecord({ item, students, reviewAfterDays, update, isAdmin }: { item: Enquiry; students: Student[]; reviewAfterDays: number | null; update: (id: string, body: object, method?: string) => Promise<boolean>; isAdmin: boolean }) {
  const [studentIds, setStudentIds] = useState(item.students.map((student) => student.studentId));
  const [shares, setShares] = useState<Share[]>(item.shares);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    await update(item.id, { action: "link", studentIds, shares });
    setBusy(false);
  }
  return <article>
    <h3>{item.senderName}</h3>
    <p><a href={`mailto:${item.contact.email}`}>{item.contact.email}</a> · {new Date(item.createdAt).toLocaleDateString("en-GB")}</p>
    <p>{item.parent ? `Possible parent match: ${item.parent.name ?? "Parent account"} (unverified)` : "Prospective contact · no parent match at submission"}</p>
    <p className="enquiry-message">{item.message}</p>
    <p>{reviewAfterDays === null ? "Review interval not configured." : item.reviewDue ? "Retention review due." : "Retention review not yet due."} {item.reviewedAt && `Last reviewed ${new Date(item.reviewedAt).toLocaleDateString("en-GB")}.`}</p>
    <details><summary>Retention review history ({item.reviews.length})</summary>{item.reviews.map((review) => <p key={review.id}>{new Date(review.createdAt).toLocaleDateString("en-GB")} · {review.reviewer.name ?? "Staff member"}: {review.decision}</p>)}</details>
    <form className="portal-form" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const decision = new FormData(form).get("decision");
      void update(item.id, { action: "review", decision }).then((success) => { if (success) form.reset(); });
    }}>
      <label>Review decision and reason<textarea name="decision" required minLength={10} maxLength={2000} placeholder="Record the decision, reason and any applicable hold." /></label>
      <button className="row-action" type="submit">Record retention review</button>
    </form>
    <form className="portal-form enquiry-links" onSubmit={submit}>
      <fieldset><legend>Link to enrolled children</legend>
        {students.map((student) => <label className="enquiry-check" key={student.id}><input type="checkbox" checked={studentIds.includes(student.id)} onChange={(event) => {
          const checked = event.target.checked;
          setStudentIds((ids) => checked ? [...ids, student.id] : ids.filter((id) => id !== student.id));
          if (!checked) setShares((current) => current.filter((share) => share.studentId !== student.id));
        }} />{student.firstName} {student.lastName} · {student.reference}</label>)}
        {students.length === 0 && <p>No enrolled children are available yet.</p>}
      </fieldset>
      {students.filter((student) => studentIds.includes(student.id)).map((student) => <fieldset key={student.id}><legend>Allow these parents to read the entire message for {student.firstName} {student.lastName}</legend>
        {student.parentLinks.map(({ user }) => <label className="enquiry-check" key={user.id}><input type="checkbox" checked={shares.some((share) => share.studentId === student.id && share.userId === user.id)} onChange={(event) => {
          const checked = event.target.checked;
          setShares((current) => checked ? [...current, { studentId: student.id, userId: user.id }] : current.filter((share) => share.studentId !== student.id || share.userId !== user.id));
        }} />{user.name ?? "Parent"} · {user.email}</label>)}
        {student.parentLinks.length === 0 && <p>No active parent accounts are linked to this child.</p>}
      </fieldset>)}
      <button className="portal-submit" disabled={busy}>{busy ? "Saving…" : "Save child links and sharing"}</button>
    </form>
    {isAdmin && <details><summary>Delete enquiry</summary><p>Only delete after reviewing retention requirements, legal holds and senior-leader approval. This removes the message and its links from the live database, not backups.</p>
      <form className="portal-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const justification = new FormData(form).get("justification");
        if (window.confirm("Permanently delete this enquiry and its links from the live database?")) void update(item.id, { justification }, "DELETE");
      }}><label>Reason and authorisation<textarea name="justification" required minLength={10} maxLength={2000} /></label><button className="row-action" type="submit">Delete reviewed enquiry</button></form>
    </details>}
  </article>;
}
