import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { statusFrom, type Punch, type PunchType, type Status } from "@/lib/timeclock";

/** Current time, ticking every second. Null until mounted so SSR and hydration match. */
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type Ctx = { punches: Punch[]; status: Status; punch: (type: PunchType) => void };
const DemoClockContext = createContext<Ctx | null>(null);

// In-memory demo punches; saved punches arrive once sign-in screens are wired up.
export function TimeclockProvider({ children }: { children: ReactNode }) {
  const [punches, setPunches] = useState<Punch[]>([]);
  useEffect(() => {
    setPunches([{ id: "seed", type: "entrada", at: Date.now() - (3 * 60 + 21) * 60000 }]);
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      punches,
      status: statusFrom(punches),
      punch: (type) => setPunches((p) => [...p, { id: crypto.randomUUID(), type, at: Date.now() }]),
    }),
    [punches],
  );
  return <DemoClockContext.Provider value={value}>{children}</DemoClockContext.Provider>;
}

export function useTimeclock() {
  const ctx = useContext(DemoClockContext);
  if (!ctx) throw new Error("useTimeclock must be used inside TimeclockProvider");
  return ctx;
}
