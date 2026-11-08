"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Settings = { periodStart: string; periodEnd: string; pricePence: number; cutoffDays: number; cutoffTime: string };
type Menu = { date: string; menu: string; schoolMeals?: number; packedLunches?: number; packedStudents?: { firstName: string; lastName: string; reference: string }[] };
type Student = { id: string; firstName: string; lastName: string; classGroup: { name: string; yearGroup: string } | null; mealPlans: { weekdays: number[]; updatedAt: string }[]; mealExceptions: { date: string; packed: boolean; updatedAt: string }[] };
type Data = { settings: Settings | null; menus: Menu[]; students?: Student[] };
type Token = { id: string; name: string; revokedAt: string | null };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The meal planner request failed.");
  return result as T;
}

export function MealPlanner({ parent, admin = false }: { parent: boolean; admin?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newToken, setNewToken] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const url = parent ? "/api/parent/meals" : "/api/staff/meals";
  const load = useCallback(async () => { setData(await json<Data>(url)); }, [url]);
  useEffect(() => { void Promise.resolve().then(load).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load meals.")); }, [load]);
  const loadTokens = useCallback(async () => { if (admin) setTokens(await json<Token[]>("/api/staff/caterer-tokens")); }, [admin]);
  useEffect(() => { void Promise.resolve().then(loadTokens).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load caterer credentials.")); }, [loadTokens]);
  async function save(value: object) {
    setBusy(true); setError(""); setNotice("");
    try {
      await json(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      await load(); setNotice("Saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save meals."); }
    finally { setBusy(false); }
  }
  function settingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const pounds = String(form.get("price")).trim();
    if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(pounds)) { setError("Enter a valid daily price in pounds."); return; }
    void save({ type: "settings", settings: { periodStart: form.get("periodStart"), periodEnd: form.get("periodEnd"), pricePence: Math.round(Number(pounds) * 100), cutoffDays: Number(form.get("cutoffDays")), cutoffTime: form.get("cutoffTime") } });
  }
  function menuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void save({ type: "menu", date: form.get("date"), menu: form.get("menu") });
  }
  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError(""); setNewToken("");
    try {
      const result = await json<{ token: string }>("/api/staff/caterer-tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: new FormData(form).get("name") }) });
      setNewToken(result.token); form.reset(); await loadTokens();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create credential."); } finally { setBusy(false); }
  }
  async function revokeToken(id: string) {
    setBusy(true); setError("");
    try { await json("/api/staff/caterer-tokens", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await loadTokens(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not revoke credential."); } finally { setBusy(false); }
  }
  const selected = new Date(`${selectedDate}T00:00:00Z`);
  const monday = new Date(selected);
  if (!Number.isNaN(monday.valueOf())) monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const nextMonday = new Date(monday);
  if (!Number.isNaN(nextMonday.valueOf())) nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const weekMenus = Number.isNaN(monday.valueOf()) ? [] : data?.menus.filter((menu) => menu.date >= monday.toISOString().slice(0, 10) && menu.date < nextMonday.toISOString().slice(0, 10)) ?? [];
  return <section className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">SCHOOL MEALS</span><h2>{parent ? "Menu and meal choices" : "Meal planner"}</h2></div></div>
    {error && <div className="portal-alert error-alert" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
    {data?.settings ? <p className="panel-note">Period: {data.settings.periodStart} to {data.settings.periodEnd}. Daily price: £{(data.settings.pricePence / 100).toFixed(2)}. Changes close at {data.settings.cutoffTime} UK time {data.settings.cutoffDays} calendar day(s) before the meal date. Recurring choices close at the same deadline before the period starts.</p> : <p className="panel-note">The administrator has not configured a meal period yet.</p>}
    <p className="panel-note">Menu information is not an allergen guarantee. Contact the school about dietary requirements, eligibility, charges or payment; none are processed here.</p>
    {admin && <form className="portal-form" onSubmit={settingsSubmit} key={JSON.stringify(data?.settings)}><h3>Meal period and cutoff</h3><label>Start date<input name="periodStart" type="date" defaultValue={data?.settings?.periodStart} required /></label><label>End date<input name="periodEnd" type="date" defaultValue={data?.settings?.periodEnd} required /></label><label>Daily price (£)<input name="price" inputMode="decimal" defaultValue={data?.settings ? (data.settings.pricePence / 100).toFixed(2) : "0.00"} required /></label><label>Calendar days before meal<input name="cutoffDays" type="number" min="0" max="30" defaultValue={data?.settings?.cutoffDays ?? 1} required /></label><label>Cutoff time in UK<input name="cutoffTime" type="time" defaultValue={data?.settings?.cutoffTime ?? "12:00"} required /></label><button className="portal-submit" disabled={busy}>Save settings</button></form>}
    {!parent && data?.settings && <form className="portal-form" onSubmit={menuSubmit}><h3>Add or update a daily menu</h3><label>School day<input name="date" type="date" min={data.settings.periodStart} max={data.settings.periodEnd} required /></label><label>Menu<textarea name="menu" maxLength={5000} required /></label><button className="portal-submit" disabled={busy}>Save menu</button></form>}
    {admin && <div><h3>Caterer integration</h3><p className="panel-note">Create a separate API credential for each caterer. It can read and update menus only, not pupil records. Share securely over HTTPS; the secret is shown once.</p><form className="portal-form" onSubmit={createToken}><label>Caterer name<input name="name" minLength={2} maxLength={100} required /></label><button className="portal-submit" disabled={busy}>Create API credential</button></form>{newToken && <p role="status">Copy this secret now: <code style={{ overflowWrap: "anywhere" }}>{newToken}</code></p>}{tokens.map((token) => <p key={token.id}>{token.name} — {token.revokedAt ? "Revoked" : <button className="row-action" type="button" disabled={busy} onClick={() => void revokeToken(token.id)}>Revoke</button>}</p>)}</div>}
    {parent && <label>Choose a day to view its week or change a meal <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>}
    {parent && data?.students?.map((student) => <article key={student.id}><h3>{student.firstName} {student.lastName}</h3><p>{student.classGroup ? `${student.classGroup.name} · ${student.classGroup.yearGroup}` : "Class not assigned"}</p>{data.settings && <><form className="portal-form" key={`${student.id}-${student.mealPlans[0]?.weekdays.join(",")}`} onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void save({ type: "plan", studentId: student.id, weekdays: form.getAll("weekday").map(Number), version: student.mealPlans[0]?.updatedAt ?? null });
    }}><p>Choose recurring school meal days for the period:</p>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, index) => <label key={day}><input type="checkbox" name="weekday" value={index + 1} defaultChecked={student.mealPlans[0]?.weekdays.includes(index + 1)} /> {day}</label>)}<button className="portal-submit" disabled={busy}>Save recurring days</button></form>
      {selectedDate && student.mealPlans[0]?.weekdays.includes(new Date(`${selectedDate}T00:00:00Z`).getUTCDay()) && (() => {
        const exception = student.mealExceptions.find((item) => item.date === selectedDate);
        const packed = exception?.packed ?? false;
        return <p>{selectedDate}: {packed ? "Packed lunch" : "School meal"} <button type="button" className="row-action" disabled={busy} onClick={() => void save({ type: "exception", studentId: student.id, date: selectedDate, packed: !packed, version: exception?.updatedAt ?? null })}>{packed ? "Request school meal" : "Bring packed lunch"}</button></p>;
      })()}
      {weekMenus.filter((menu) => menu.date !== selectedDate && student.mealPlans[0]?.weekdays.includes(new Date(`${menu.date}T00:00:00Z`).getUTCDay())).map((menu) => {
        const exception = student.mealExceptions.find((item) => item.date === menu.date);
        const packed = exception?.packed ?? false;
        return <p key={menu.date}>{menu.date}: {packed ? "Packed lunch" : "School meal"} <button type="button" className="row-action" disabled={busy} onClick={() => void save({ type: "exception", studentId: student.id, date: menu.date, packed: !packed, version: exception?.updatedAt ?? null })}>{packed ? "Request school meal" : "Bring packed lunch"}</button></p>;
      })}</>}
    </article>)}
    <h3>{parent ? "Menu for selected week" : "Menus"}</h3>{(parent ? weekMenus : data?.menus ?? []).map((menu) => <article className="content-row" key={menu.date}><span><b>{menu.date}</b><span style={{ whiteSpace: "pre-wrap", display: "block" }}>{menu.menu}</span>{!parent && <><small>{menu.schoolMeals} school meals · {menu.packedLunches} packed lunches</small>{Boolean(menu.packedStudents?.length) && <small>Packed lunch: {menu.packedStudents?.map((student) => `${student.firstName} ${student.lastName} (${student.reference})`).join(", ")}</small>}</>}</span></article>)}{data && !(parent ? weekMenus : data.menus).length && <p className="empty-state">No menus have been added for {parent ? "this week" : "this period"}.</p>}
  </section>;
}
