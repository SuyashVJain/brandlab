"use client";

import { Fragment, useEffect, useState } from "react";
import { TornPanel } from "@/components/shared/Paper";
import type { Criterion, LeaderboardData, LeaderRow } from "@/lib/jury-schema";
import { callApi } from "./api";

/** One CSV cell: quoted, and never starting with a character a spreadsheet would run as a formula. */
function cell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: LeaderRow[]): string {
  const header = ["Rank", "Code", "Name", "Event name", "Average", "Judges", "Judge totals"];
  const lines = rows.map((row, index) =>
    [
      index + 1,
      row.code,
      row.full_name,
      row.event_name,
      row.avg_total === null ? "" : row.avg_total.toFixed(2),
      row.judge_count,
      row.judges.map((judge) => `${judge.judge}: ${judge.total}`).join("; "),
    ]
      .map(cell)
      .join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\r\n");
}

/** Ranked results for admins, with each judge's scores and a CSV export. */
export default function LeaderboardPanel() {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    callApi<LeaderboardData>("/api/admin/leaderboard").then((result) => {
      if (!alive) return;
      if (!result.ok) return setError(result.error);
      setError("");
      setCriteria(result.data.criteria);
      setRows(result.data.leaderboard);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const exportCsv = () => {
    if (!rows) return;
    // The BOM makes Excel read the file as UTF-8.
    const url = URL.createObjectURL(new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "brandlab-leaderboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <p className="adm-error">{error}</p>;
  if (!rows) return <p className="adm-loading">Loading the leaderboard...</p>;

  return (
    <div className="adm-leader">
      <div className="adm-status">
        <p className="adm-progress">
          <b>{rows.length}</b> submission{rows.length === 1 ? "" : "s"}
        </p>
        <button type="button" className="adm-button adm-button--small" onClick={() => setAttempt((count) => count + 1)}>
          Refresh
        </button>
        <button type="button" className="adm-button adm-button--small adm-button--solid" onClick={exportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
      </div>

      <TornPanel seed={307}>
        {rows.length === 0 ? (
          <h2 className="adm-heading">No submissions yet</h2>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Code</th>
                  <th scope="col">Name</th>
                  <th scope="col">Event name</th>
                  <th scope="col" className="adm-num">
                    Average
                  </th>
                  <th scope="col" className="adm-num">
                    Judges
                  </th>
                  <th scope="col">
                    <span className="adm-visually-hidden">Breakdown</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="adm-rank">{index + 1}</td>
                      <td>{row.code}</td>
                      <td>{row.full_name}</td>
                      <td>{row.event_name}</td>
                      <td className="adm-num adm-avg">{row.avg_total === null ? "-" : row.avg_total.toFixed(2)}</td>
                      <td className="adm-num">{row.judge_count}</td>
                      <td>
                        <button
                          type="button"
                          className="adm-icon"
                          aria-expanded={open === row.id}
                          onClick={() => setOpen(open === row.id ? null : row.id)}
                          disabled={row.judges.length === 0}
                        >
                          {open === row.id ? "Hide" : "Judges"}
                        </button>
                      </td>
                    </tr>
                    {open === row.id && (
                      <tr className="adm-breakdown">
                        <td colSpan={7}>
                          <table className="adm-table adm-table--inner">
                            <thead>
                              <tr>
                                <th scope="col">Judge</th>
                                {criteria.map((criterion) => (
                                  <th key={criterion.id} scope="col" className="adm-num adm-crit-head">
                                    {criterion.label} /{criterion.max_points}
                                  </th>
                                ))}
                                <th scope="col" className="adm-num">
                                  Total
                                </th>
                                <th scope="col">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.judges.map((judge) => (
                                <tr key={judge.judge}>
                                  <td>{judge.judge}</td>
                                  {criteria.map((criterion) => (
                                    <td key={criterion.id} className="adm-num">
                                      {judge.by_criterion[String(criterion.id)] ?? "-"}
                                    </td>
                                  ))}
                                  <td className="adm-num adm-avg">{judge.total}</td>
                                  <td>{judge.notes ?? ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TornPanel>
    </div>
  );
}
