// Pure time-clock rules: status, worked time, shifts, lateness and overtime.

export type PunchType = "entrada" | "salida_temporal" | "regreso" | "salida";
export type Punch = { id: string; type: PunchType; at: number; distance_m?: number | null };
export type Status = "fuera" | "turno" | "salida_temporal";

export const H = 3_600_000;
/** Minutes of grace after the scheduled start before an entry counts as late. */
export const LATE_TOLERANCE_MIN = 10;

export function statusFrom(punches: Punch[]): Status {
  const last = punches.at(-1);
  if (!last || last.type === "salida") return "fuera";
  if (last.type === "salida_temporal") return "salida_temporal";
  return "turno";
}

/** Time worked and time away (temporary exits) over an ordered list of punches. */
export function totals(punches: Punch[], now: number) {
  let worked = 0;
  let away = 0;
  punches.forEach((p, i) => {
    const end = punches[i + 1]?.at ?? now;
    if (p.type === "entrada" || p.type === "regreso") worked += end - p.at;
    if (p.type === "salida_temporal") away += end - p.at;
  });
  return { worked, away };
}

export type Shift = {
  start: number;
  end: number | null;
  punches: Punch[];
  worked: number;
  away: number;
  exits: number;
};

/** Splits punches (ascending) into shifts: each starts at an entrada and ends at a salida. */
export function groupShifts(punches: Punch[], now: number): Shift[] {
  const shifts: Shift[] = [];
  let current: Punch[] | null = null;
  const close = (ps: Punch[]) => {
    const last = ps.at(-1)!;
    const end = last.type === "salida" ? last.at : null;
    const t = totals(ps, end ?? now);
    shifts.push({
      start: ps[0]!.at,
      end,
      punches: ps,
      worked: t.worked,
      away: t.away,
      exits: ps.filter((p) => p.type === "salida_temporal").length,
    });
  };
  for (const p of punches) {
    if (p.type === "entrada") {
      if (current) close(current);
      current = [p];
    } else if (current) {
      current.push(p);
      if (p.type === "salida") {
        close(current);
        current = null;
      }
    }
  }
  if (current) close(current);
  return shifts;
}

export function minutesOfDay(ms: number) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** "08:00" or "08:00:00" → minutes after midnight. */
export function parseTime(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
}

export function isLate(entryMs: number, shiftStart: string) {
  return minutesOfDay(entryMs) > parseTime(shiftStart) + LATE_TOLERANCE_MIN;
}

export function overtime(workedMs: number, shiftHours: number) {
  return Math.max(0, workedMs - shiftHours * H);
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 local of the week containing `ms`, shifted by `offset` weeks. */
export function startOfWeek(ms: number, offset = 0) {
  const d = new Date(startOfDay(ms));
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow + offset * 7);
  return d.getTime();
}

export function addDays(ms: number, days: number) {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export type DaySummary = {
  day: number;
  shifts: Shift[];
  firstIn: number | null;
  lastOut: number | null;
  worked: number;
  extra: number;
  late: boolean;
  exits: number;
};

/** One row per day of the week; a shift belongs to the day it started. */
export function summarizeWeek(
  punches: Punch[],
  weekStart: number,
  now: number,
  schedule: { shiftStart: string; shiftHours: number },
): DaySummary[] {
  const shifts = groupShifts(punches, now);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const next = addDays(weekStart, i + 1);
    const ds = shifts.filter((s) => s.start >= day && s.start < next);
    const worked = ds.reduce((a, s) => a + s.worked, 0);
    const firstIn = ds[0]?.start ?? null;
    const lastOut = ds.at(-1)?.end ?? null;
    return {
      day,
      shifts: ds,
      firstIn,
      lastOut,
      worked,
      extra: overtime(worked, schedule.shiftHours),
      late: firstIn !== null && isLate(firstIn, schedule.shiftStart),
      exits: ds.reduce((a, s) => a + s.exits, 0),
    };
  });
}

export function fmtClock(ms: number) {
  return new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDur(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function fmtHours(ms: number) {
  return (ms / H).toFixed(1);
}

export const punchLabel: Record<PunchType, string> = {
  entrada: "Entrada",
  salida_temporal: "Salida temporal",
  regreso: "Regreso",
  salida: "Salida",
};

/** CSV that Excel opens with accents intact. */
export function toCsv(rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
