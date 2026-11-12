import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PunchType = "entrada" | "descanso" | "regreso" | "salida";
export type Punch = { id: string; type: PunchType; at: number };
export type Status = "fuera" | "turno" | "descanso";

export const SHIFT_GOAL_MS = 8 * 60 * 60 * 1000;

export function statusFrom(punches: Punch[]): Status {
  const last = punches.at(-1);
  if (!last || last.type === "salida") return "fuera";
  if (last.type === "descanso") return "descanso";
  return "turno";
}

/** Sums time spent working and on break from an ordered list of punches. */
export function totals(punches: Punch[], now: number) {
  let worked = 0;
  let rest = 0;
  punches.forEach((p, i) => {
    const end = punches[i + 1]?.at ?? now;
    if (p.type === "entrada" || p.type === "regreso") worked += end - p.at;
    if (p.type === "descanso") rest += end - p.at;
  });
  return { worked, rest };
}

export function fmtClock(ms: number) {
  return new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDur(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export const punchLabel: Record<PunchType, string> = {
  entrada: "Entrada",
  descanso: "Inicio de descanso",
  regreso: "Fin de descanso",
  salida: "Salida",
};

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
const TimeclockContext = createContext<Ctx | null>(null);

export function TimeclockProvider({ children }: { children: ReactNode }) {
  const [punches, setPunches] = useState<Punch[]>([]);

  // Demo data: the user already clocked in this morning.
  useEffect(() => {
    const now = Date.now();
    setPunches([{ id: "seed", type: "entrada", at: now - (3 * 60 + 21) * 60000 }]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      punches,
      status: statusFrom(punches),
      punch: (type) => setPunches((p) => [...p, { id: crypto.randomUUID(), type, at: Date.now() }]),
    }),
    [punches],
  );

  return <TimeclockContext.Provider value={value}>{children}</TimeclockContext.Provider>;
}

export function useTimeclock() {
  const ctx = useContext(TimeclockContext);
  if (!ctx) throw new Error("useTimeclock must be used inside TimeclockProvider");
  return ctx;
}
