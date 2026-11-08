"use client";

import { useEffect, useState } from "react";

type Student = { id: string; firstName: string; lastName: string; reference: string };
type Entry = { id: string; action: string; entityType: string; entityId: string; occurredAt: string; beforeText?: string | null; afterText?: string | null; actor: { name: string | null; role: string } | null; students: { student: Omit<Student, "id"> }[] };

export function AuditTrail({ students, safeguardingOnly }: { students: Student[]; safeguardingOnly: boolean }) {
  const [studentId, setStudentId] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (cursors.length) query.set("cursor", cursors[cursors.length - 1]);
    if (studentId) query.set("studentId", studentId);
    fetch(`/api/staff/audit?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the audit trail.");
        return response.json() as Promise<Entry[]>;
      })
      .then((result) => { setError(""); setEntries(result); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the audit trail."); });
    return () => controller.abort();
  }, [studentId, cursors]);
  return <article className="portal-panel">
    <div className="panel-heading"><div><span className="portal-eyebrow">RESTRICTED ACTIVITY HISTORY</span><h2>Audit trail</h2></div></div>
    <p className="panel-note">{safeguardingOnly ? "Showing safeguarding activity only. " : "Safeguarding activity is restricted to the safeguarding lead. Website publication entries show the full previous and new public text where available. "}Private pupil and safeguarding content is not included. Earlier activity may be incomplete.</p>
    <label className="filter-select">Student <select value={studentId} onChange={(event) => { setStudentId(event.target.value); setCursors([]); }}><option value="">All students and school activity</option>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.reference}</option>)}</select></label>
    {error && <div role="alert" className="portal-alert error-alert">{error}</div>}
    <div className="student-table-wrap"><table className="portal-table"><thead><tr><th>When</th><th>Staff member</th><th>Activity</th><th>Student</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{new Date(entry.occurredAt).toLocaleString("en-GB")}</td><td>{entry.actor?.name ?? "Unidentified or removed account"}{entry.actor && <small>{entry.actor.role.replaceAll("_", " ").toLowerCase()}</small>}</td><td>{entry.action.replaceAll("_", " ").toLowerCase()}<small>{entry.entityType} · {entry.entityId}</small>{(entry.beforeText || entry.afterText) && <details><summary>View previous and new public text</summary><strong>Previous text</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.beforeText ?? "(not published)"}</pre><strong>New text</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.afterText ?? "(not published)"}</pre></details>}</td><td>{entry.students.map(({ student }) => `${student.firstName} ${student.lastName} (${student.reference})`).join(", ") || "School-wide"}</td></tr>)}</tbody></table>{!entries.length && !error && <p className="empty-state">No recorded activity found.</p>}</div>
    <div className="panel-actions"><button type="button" className="row-action" disabled={!cursors.length} onClick={() => setCursors((value) => value.slice(0, -1))}>Newer</button><span>Page {cursors.length + 1}</span><button type="button" className="row-action" disabled={entries.length < 200} onClick={() => setCursors((value) => [...value, entries[entries.length - 1].id])}>Older</button></div>
  </article>;
}
