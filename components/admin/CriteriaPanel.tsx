"use client";

import { useEffect, useRef, useState } from "react";
import { TornPanel } from "@/components/shared/Paper";
import {
  CRITERIA_LOCKED,
  CRITERIA_TOTAL,
  criteriaSchema,
  MAX_CRITERIA,
  MAX_CRITERION_LABEL,
  MIN_CRITERIA,
  type CriteriaData,
  type Criterion,
} from "@/lib/jury-schema";
import { callApi } from "./api";

/** One editable row. `key` is stable for React; `id` exists only for saved criteria. */
type Row = { key: string; id?: number; label: string; points: string };

const toRows = (criteria: Criterion[]): Row[] =>
  criteria.map((criterion) => ({
    key: `saved-${criterion.id}`,
    id: criterion.id,
    label: criterion.label,
    points: String(criterion.max_points),
  }));

/** Admin tab: edit the judging criteria. Read-only once any judge has saved a score. */
export default function CriteriaPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const nextKey = useRef(0);

  useEffect(() => {
    let alive = true;
    callApi<CriteriaData>("/api/admin/criteria").then((result) => {
      if (!alive) return;
      if (!result.ok) return setNotice({ ok: false, text: result.error });
      setRows(toRows(result.data.criteria));
      setLocked(result.data.locked);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!rows) {
    return notice ? <p className="adm-error">{notice.text}</p> : <p className="adm-loading">Loading criteria...</p>;
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.points) || 0), 0);
  const countOk = rows.length >= MIN_CRITERIA && rows.length <= MAX_CRITERIA;
  const totalOk = total === CRITERIA_TOTAL;

  const change = (key: string, patch: Partial<Row>) => {
    setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setNotice(null);
  };

  const add = () => {
    nextKey.current += 1;
    setRows([...rows, { key: `new-${nextKey.current}`, label: "", points: "" }]);
    setNotice(null);
  };

  const save = async () => {
    if (busy || locked) return;
    const parsed = criteriaSchema.safeParse({
      criteria: rows.map((row) => ({ id: row.id, label: row.label, max_points: Number(row.points) })),
    });
    if (!parsed.success) return setNotice({ ok: false, text: parsed.error.issues[0].message });

    setBusy(true);
    const result = await callApi<CriteriaData>("/api/admin/criteria", "PUT", parsed.data);
    setBusy(false);
    if (!result.ok) {
      if (result.status === 409) setLocked(true);
      return setNotice({ ok: false, text: result.error });
    }
    setRows(toRows(result.data.criteria));
    setLocked(result.data.locked);
    setNotice({ ok: true, text: "Criteria saved." });
  };

  return (
    <div className="adm-criteria">
      <div className="adm-status" aria-live="polite">
        {notice && <p className={notice.ok ? "adm-ok" : "adm-error"}>{notice.text}</p>}
      </div>

      <TornPanel seed={359}>
        <h2 className="adm-heading">Judging criteria</h2>
        {locked ? (
          <p className="adm-locked" role="status">
            {CRITERIA_LOCKED}
          </p>
        ) : (
          <p className="adm-text">
            {MIN_CRITERIA} to {MAX_CRITERIA} criteria. Max points must add up to exactly {CRITERIA_TOTAL}. Judges see
            them in this order.
          </p>
        )}

        <ol className="adm-crit-list">
          {rows.map((row, index) => (
            <li key={row.key}>
              <span className="adm-word-number" aria-hidden>
                {index + 1}
              </span>
              <input
                className="adm-input"
                type="text"
                value={row.label}
                onChange={(event) => change(row.key, { label: event.target.value })}
                maxLength={MAX_CRITERION_LABEL}
                placeholder="What is judged"
                aria-label={`Criterion ${index + 1} label`}
                disabled={locked}
              />
              <input
                className="adm-input adm-crit-points"
                type="number"
                inputMode="numeric"
                min={1}
                max={CRITERIA_TOTAL}
                step={1}
                value={row.points}
                onChange={(event) => change(row.key, { points: event.target.value })}
                placeholder="Max"
                aria-label={`Criterion ${index + 1} max points`}
                disabled={locked}
              />
              <button
                type="button"
                className="adm-icon"
                onClick={() => {
                  setRows(rows.filter((item) => item.key !== row.key));
                  setNotice(null);
                }}
                disabled={locked || rows.length <= MIN_CRITERIA}
                aria-label={`Remove criterion ${index + 1}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>

        <p className={`adm-total${totalOk ? "" : " adm-total--off"}`} aria-live="polite">
          <span className="eyebrow">Total</span>
          <b>{total}</b> / {CRITERIA_TOTAL}
        </p>
        {!locked && !totalOk && <p className="adm-error">Must equal {CRITERIA_TOTAL}.</p>}
        {!locked && !countOk && (
          <p className="adm-error">
            Use {MIN_CRITERIA} to {MAX_CRITERIA} criteria.
          </p>
        )}

        {!locked && (
          <div className="adm-row">
            <button type="button" className="adm-button" onClick={add} disabled={rows.length >= MAX_CRITERIA}>
              Add criterion
            </button>
            <button type="button" className="adm-button adm-button--solid" onClick={save} disabled={busy || !totalOk || !countOk}>
              {busy ? "Saving..." : "Save criteria"}
            </button>
          </div>
        )}
      </TornPanel>
    </div>
  );
}
