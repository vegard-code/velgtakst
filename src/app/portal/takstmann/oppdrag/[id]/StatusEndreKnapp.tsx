"use client";

import { useState } from "react";
import { oppdaterOppdragStatus } from "@/lib/actions/oppdrag";
import type { OppdragStatus } from "@/lib/supabase/types";

interface Props {
  oppdragId: string;
  nesteStatus: OppdragStatus;
  nesteStatusLabel: string;
}

export default function StatusEndreKnapp({ oppdragId, nesteStatus, nesteStatusLabel }: Props) {
  const [laster, setLaster] = useState(false);

  async function handleClick() {
    setLaster(true);
    await oppdaterOppdragStatus(oppdragId, nesteStatus);
    setLaster(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={laster}
      className="portal-btn-primary shrink-0"
    >
      {laster ? "Oppdaterer..." : `→ ${nesteStatusLabel}`}
    </button>
  );
}
