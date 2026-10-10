"use client";

import { useState } from "react";
import type { AdminState, StaffRole } from "@/lib/admin-schema";
import AdminPanel from "./AdminPanel";
import CriteriaPanel from "./CriteriaPanel";
import LeaderboardPanel from "./LeaderboardPanel";
import RegistrationsPanel from "./RegistrationsPanel";
import ScoringPanel from "./ScoringPanel";
import StaffPanel from "./StaffPanel";

const TABS = [
  { id: "control", label: "Event control" },
  { id: "registrations", label: "Registrations" },
  { id: "criteria", label: "Criteria" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "staff", label: "Staff" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type AdminTabsProps = {
  role: StaffRole;
  email: string;
  /** Event state for the control panel. Admins only. */
  initialState: AdminState | null;
};

/**
 * The /admin screen. Admins run the event (five tabs) and do not score;
 * jury accounts get only the scoring view. The API enforces the same split.
 */
export default function AdminTabs({ role, email, initialState }: AdminTabsProps) {
  const [tab, setTab] = useState<TabId>("control");

  if (role !== "admin" || !initialState) return <ScoringPanel />;

  return (
    <div className="adm-tabs">
      <div className="adm-tablist" role="tablist" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`adm-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`adm-view-${item.id}`}
            className="adm-tab"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* The control panel stays mounted (just hidden) so unsaved keyword edits survive a tab switch. */}
      <div id="adm-view-control" role="tabpanel" aria-labelledby="adm-tab-control" hidden={tab !== "control"}>
        <AdminPanel initialState={initialState} />
      </div>

      {/* The other tabs load fresh data each time they are opened. */}
      {tab === "registrations" && (
        <div id="adm-view-registrations" role="tabpanel" aria-labelledby="adm-tab-registrations">
          <RegistrationsPanel />
        </div>
      )}
      {tab === "criteria" && (
        <div id="adm-view-criteria" role="tabpanel" aria-labelledby="adm-tab-criteria">
          <CriteriaPanel />
        </div>
      )}
      {tab === "leaderboard" && (
        <div id="adm-view-leaderboard" role="tabpanel" aria-labelledby="adm-tab-leaderboard">
          <LeaderboardPanel />
        </div>
      )}
      {tab === "staff" && (
        <div id="adm-view-staff" role="tabpanel" aria-labelledby="adm-tab-staff">
          <StaffPanel myEmail={email} />
        </div>
      )}
    </div>
  );
}
