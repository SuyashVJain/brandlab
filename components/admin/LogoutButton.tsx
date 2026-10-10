"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Clears the session cookie and returns to the login page. */
export default function LogoutButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await fetch("/api/staff/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <button type="button" className="adm-button" onClick={logout} disabled={leaving}>
      {leaving ? "Logging out..." : "Log out"}
    </button>
  );
}
