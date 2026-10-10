"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TornPanel } from "@/components/shared/Paper";
import {
  PARTICIPANT_CODE,
  STATUS_LABEL,
  STATUSES,
  type CheckinStatus,
  type ParticipantRow,
  type ParticipantsData,
} from "@/lib/registrations";
import { callApi } from "./api";

type Notice = { kind: "checked" | "info" | "error"; text: string };

const listUrl = (q: string, status: CheckinStatus) =>
  `/api/admin/participants?q=${encodeURIComponent(q.trim())}&status=${status}`;

/** Admin tab for the check-in desk: counters, search, and a check-in toggle per participant. */
export default function RegistrationsPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CheckinStatus>("all");
  const [data, setData] = useState<ParticipantsData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reload, setReload] = useState(0);
  const search = useRef<HTMLInputElement>(null);

  // The desk types or scans straight away.
  useEffect(() => {
    search.current?.focus();
  }, []);

  // Live search: reload a moment after the query or filter changes.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      callApi<ParticipantsData>(listUrl(q, status)).then((result) => {
        if (!alive) return;
        if (!result.ok) return setError(result.error);
        setError("");
        setData(result.data);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, status, reload]);

  /** Flip one row on screen (and the "checked in" counter with it). */
  const show = (id: string, checkedIn: boolean) => {
    setData((current) => {
      if (!current) return current;
      const row = current.participants.find((item) => item.id === id);
      if (!row || row.checked_in === checkedIn) return current;
      return {
        participants: current.participants.map((item) => (item.id === id ? { ...item, checked_in: checkedIn } : item)),
        counts: { ...current.counts, checked_in: current.counts.checked_in + (checkedIn ? 1 : -1) },
      };
    });
  };

  /** Optimistic: the screen changes at once and goes back if the server says no. */
  const setCheckin = async (row: ParticipantRow, checkedIn: boolean): Promise<boolean> => {
    show(row.id, checkedIn);
    const result = await callApi<{ participant: ParticipantRow }>("/api/admin/checkin", "POST", {
      id: row.id,
      checked_in: checkedIn,
    });
    if (!result.ok) {
      show(row.id, !checkedIn); // roll back
      setNotice({ kind: "error", text: `${row.code} was not updated: ${result.error}` });
      return false;
    }
    return true;
  };

  const toggle = async (row: ParticipantRow) => {
    const next = !row.checked_in;
    if (await setCheckin(row, next)) {
      setNotice(
        next
          ? { kind: "checked", text: `Checked in: ${row.code} ${row.full_name}` }
          : { kind: "info", text: `Check-in undone: ${row.code} ${row.full_name}` },
      );
    }
  };

  /** Enter in the search box: an exact participant code (typed or scanned) checks that person in at once. */
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = q.trim().toUpperCase();
    if (!PARTICIPANT_CODE.test(code)) return; // an ordinary search: the list is already live

    let row = data?.participants.find((item) => item.code === code);
    if (!row) {
      // The list may not have caught up with a fast scan yet.
      const result = await callApi<ParticipantsData>(listUrl(code, "all"));
      if (!result.ok) return setNotice({ kind: "error", text: result.error });
      row = result.data.participants.find((item) => item.code === code);
    }
    if (!row) return setNotice({ kind: "error", text: `No participant with the code ${code}.` });

    if (row.checked_in) {
      setNotice({ kind: "info", text: `Already checked in: ${row.code} ${row.full_name}` });
    } else if (await setCheckin(row, true)) {
      setNotice({ kind: "checked", text: `Checked in: ${row.code} ${row.full_name}` });
    } else {
      return;
    }
    // Ready for the next person.
    setQ("");
    setReload((count) => count + 1);
    search.current?.focus();
  };

  const counts = data?.counts;

  return (
    <div className="adm-reg">
      {/* ---------- counters ---------- */}
      <dl className="adm-reg-counts">
        {(
          [
            ["Registered", counts?.total],
            ["Checked in", counts?.checked_in],
            ["Solo", counts?.solo],
            ["Pairs", counts?.pairs],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? "-"}</dd>
          </div>
        ))}
      </dl>

      {/* ---------- search + filter ---------- */}
      <form className="adm-reg-tools" onSubmit={submit} role="search">
        <input
          ref={search}
          className="adm-input adm-reg-search"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search, or scan / type a code and press Enter"
          aria-label="Search participants by code, name, email, enrollment number or phone"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
        />
        <select
          className="adm-input adm-reg-filter"
          value={status}
          onChange={(event) => setStatus(event.target.value as CheckinStatus)}
          aria-label="Filter by check-in status"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <button type="button" className="adm-button" onClick={() => setReload((count) => count + 1)}>
          Refresh
        </button>
        <a className="adm-button adm-button--solid adm-reg-export" href="/api/admin/participants/export" download>
          Export CSV
        </a>
      </form>

      <div className="adm-reg-notice" aria-live="assertive">
        {notice && (
          <p className={notice.kind === "error" ? "adm-error" : notice.kind === "checked" ? "adm-checked" : "adm-ok"}>
            {notice.text}
          </p>
        )}
        {error && <p className="adm-error">{error}</p>}
      </div>

      {/* ---------- list ---------- */}
      <TornPanel seed={373}>
        {!data ? (
          <p className="adm-loading">Loading registrations...</p>
        ) : data.participants.length === 0 ? (
          <h2 className="adm-heading">{counts?.total ? "Nobody matches that search" : "No registrations yet"}</h2>
        ) : (
          <table className="adm-table adm-reg-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Name</th>
                <th scope="col">Enrollment</th>
                <th scope="col">Phone</th>
                <th scope="col">Partner</th>
                <th scope="col">
                  <span className="adm-visually-hidden">Check in</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.participants.map((row) => (
                <tr key={row.id} className={row.checked_in ? "is-in" : undefined}>
                  <td className="adm-reg-code">{row.code}</td>
                  <td data-label="Name">
                    <b>{row.full_name}</b>
                    <span className="adm-reg-sub">{row.email}</span>
                  </td>
                  <td data-label="Enrollment">
                    {row.enrollment_no}
                    {row.course_year && <span className="adm-reg-sub">{row.course_year}</span>}
                  </td>
                  <td data-label="Phone">{row.phone}</td>
                  <td data-label="Partner">
                    {row.partner_name ? (
                      <>
                        {row.partner_name}
                        <span className="adm-reg-sub">{row.partner_enrollment_no}</span>
                      </>
                    ) : (
                      <span className="adm-reg-sub">Solo</span>
                    )}
                  </td>
                  <td className="adm-reg-action">
                    <button
                      type="button"
                      className="adm-check"
                      aria-pressed={row.checked_in}
                      aria-label={row.checked_in ? `Undo check-in for ${row.code}` : `Check in ${row.code}`}
                      onClick={() => toggle(row)}
                    >
                      {row.checked_in ? "Checked in · Undo" : "Check in"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TornPanel>
    </div>
  );
}
