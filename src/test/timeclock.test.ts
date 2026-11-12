import { describe, expect, it } from "vitest";
import { H, groupShifts, isLate, overtime, statusFrom, totals, type Punch } from "@/lib/timeclock";

const p = (type: Punch["type"], at: number): Punch => ({ id: `${type}-${at}`, type, at });
const day = new Date(2026, 10, 12, 0, 0, 0).getTime();

describe("timeclock rules", () => {
  it("excludes temporary exits from worked time", () => {
    const ps = [p("entrada", 0), p("salida_temporal", 4 * H), p("regreso", 5 * H), p("salida", 9 * H)];
    expect(totals(ps, 10 * H)).toEqual({ worked: 8 * H, away: 1 * H });
    expect(statusFrom(ps)).toBe("fuera");
  });

  it("counts how many times the employee left during a shift", () => {
    const ps = [
      p("entrada", 0),
      p("salida_temporal", 1 * H),
      p("regreso", 2 * H),
      p("salida_temporal", 3 * H),
      p("regreso", 4 * H),
      p("salida", 6 * H),
    ];
    expect(groupShifts(ps, 7 * H)[0]?.exits).toBe(2);
  });

  it("marks an entry late only after the 10-minute grace period", () => {
    expect(isLate(day + (8 * 60 + 10) * 60000, "08:00")).toBe(false);
    expect(isLate(day + (8 * 60 + 11) * 60000, "08:00:00")).toBe(true);
  });

  it("counts overtime beyond the scheduled shift hours", () => {
    expect(overtime(9.5 * H, 8)).toBe(1.5 * H);
    expect(overtime(7 * H, 8)).toBe(0);
  });
});
