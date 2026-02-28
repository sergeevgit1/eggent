"use client";

import { useEffect } from "react";

/**
 * Safety net: sometimes after hard refresh/redeploy UI can remain non-interactive
 * if body keeps `pointer-events: none` without an open modal.
 */
export function InteractionUnlock() {
  useEffect(() => {
    const unlockIfStuck = () => {
      const body = document.body;
      if (!body) return;

      const hasOpenDialog = Boolean(
        document.querySelector('[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"]')
      );

      if (!hasOpenDialog && body.style.pointerEvents === "none") {
        body.style.pointerEvents = "";
      }
    };

    unlockIfStuck();
    const interval = window.setInterval(unlockIfStuck, 1500);
    window.addEventListener("pageshow", unlockIfStuck);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pageshow", unlockIfStuck);
    };
  }, []);

  return null;
}
