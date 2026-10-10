"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TornPanel } from "@/components/shared/Paper";
import type { StaffRole } from "@/lib/admin-schema";
import { formatIst } from "@/lib/ist";
import { staffCreateSchema, staffPasswordSchema, type StaffRow } from "@/lib/jury-schema";
import { callApi } from "./api";

type Notice = { ok: boolean; text: string };

/** Admin and jury accounts: list, add, reset password, delete. */
export default function StaffPanel({ myEmail }: { myEmail: string }) {
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  // Add form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("jury");

  // Reset-password row
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    let alive = true;
    callApi<{ staff: StaffRow[] }>("/api/admin/staff").then((result) => {
      if (!alive) return;
      if (result.ok) setStaff(result.data.staff);
      else setNotice({ ok: false, text: result.error });
    });
    return () => {
      alive = false;
    };
  }, []);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const parsed = staffCreateSchema.safeParse({ email, password, role });
    if (!parsed.success) return setNotice({ ok: false, text: parsed.error.issues[0].message });

    setBusy(true);
    const result = await callApi<{ staff: StaffRow[] }>("/api/admin/staff", "POST", parsed.data);
    setBusy(false);
    if (!result.ok) return setNotice({ ok: false, text: result.error });
    setStaff(result.data.staff);
    setNotice({ ok: true, text: `Added ${parsed.data.email} as ${parsed.data.role}.` });
    setEmail("");
    setPassword("");
  };

  const reset = async (event: FormEvent<HTMLFormElement>, member: StaffRow) => {
    event.preventDefault();
    if (busy) return;
    const parsed = staffPasswordSchema.safeParse({ id: member.id, password: newPassword });
    if (!parsed.success) return setNotice({ ok: false, text: parsed.error.issues[0].message });

    setBusy(true);
    const result = await callApi<{ ok: true }>("/api/admin/staff", "PATCH", parsed.data);
    setBusy(false);
    if (!result.ok) return setNotice({ ok: false, text: result.error });
    setNotice({ ok: true, text: `Password reset for ${member.email}.` });
    setResetId(null);
    setNewPassword("");
  };

  const remove = async (member: StaffRow) => {
    if (busy || !window.confirm(`Delete the ${member.role} account ${member.email}? This cannot be undone.`)) return;
    setBusy(true);
    const result = await callApi<{ staff: StaffRow[] }>("/api/admin/staff", "DELETE", { id: member.id });
    setBusy(false);
    if (!result.ok) return setNotice({ ok: false, text: result.error });
    setStaff(result.data.staff);
    setNotice({ ok: true, text: `Deleted ${member.email}.` });
  };

  return (
    <div className="adm-staff">
      <div className="adm-status" aria-live="polite">
        {notice && <p className={notice.ok ? "adm-ok" : "adm-error"}>{notice.text}</p>}
      </div>

      <div className="adm-grid">
        {/* ---------- list ---------- */}
        <TornPanel seed={331}>
          <h2 className="adm-heading">Staff accounts</h2>
          {!staff ? (
            <p className="adm-loading">Loading...</p>
          ) : (
            <ul className="adm-people">
              {staff.map((member) => (
                <li key={member.id}>
                  <div className="adm-person">
                    <p>
                      <b>{member.email}</b>
                      <span className="adm-role">{member.role}</span>
                      {member.email === myEmail && <span className="adm-note"> you</span>}
                    </p>
                    <p className="adm-note">Added {formatIst(member.created_at)}</p>
                  </div>
                  <div className="adm-row">
                    <button
                      type="button"
                      className="adm-icon"
                      onClick={() => {
                        setResetId(resetId === member.id ? null : member.id);
                        setNewPassword("");
                      }}
                    >
                      Reset password
                    </button>
                    <button type="button" className="adm-icon" onClick={() => remove(member)} disabled={busy || member.email === myEmail}>
                      Delete
                    </button>
                  </div>
                  {resetId === member.id && (
                    <form className="adm-add adm-reset" onSubmit={(event) => reset(event, member)}>
                      <input
                        className="adm-input"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="New password (10+ characters)"
                        aria-label={`New password for ${member.email}`}
                        autoComplete="new-password"
                      />
                      <button type="submit" className="adm-button adm-button--solid" disabled={busy}>
                        Save
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TornPanel>

        {/* ---------- add ---------- */}
        <TornPanel seed={347}>
          <h2 className="adm-heading">Add staff</h2>
          <form className="adm-form" onSubmit={add} noValidate>
            <div className="adm-field">
              <label htmlFor="staff-email">Email</label>
              <input id="staff-email" className="adm-input" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="staff-password">Password (10+ characters)</label>
              <input id="staff-password" className="adm-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="staff-role">Role</label>
              <select id="staff-role" className="adm-input" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                <option value="jury">Jury (scoring only)</option>
                <option value="admin">Admin (full control)</option>
              </select>
            </div>
            <div className="adm-row">
              <button type="submit" className="adm-button adm-button--solid" disabled={busy}>
                {busy ? "Working..." : "Add account"}
              </button>
            </div>
          </form>
        </TornPanel>
      </div>
    </div>
  );
}
