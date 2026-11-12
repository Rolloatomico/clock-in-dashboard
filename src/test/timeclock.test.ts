import { describe, expect, it } from "vitest";
import { statusFrom, totals, type Punch } from "@/lib/timeclock";

const H = 3600000;
describe("timeclock", () => {
  it("excludes break time from worked time", () => {
    const p: Punch[] = [
      { id: "1", type: "entrada", at: 0 },
      { id: "2", type: "descanso", at: 4 * H },
      { id: "3", type: "regreso", at: 5 * H },
      { id: "4", type: "salida", at: 9 * H },
    ];
    expect(totals(p, 10 * H)).toEqual({ worked: 8 * H, rest: 1 * H });
    expect(statusFrom(p)).toBe("fuera");
  });
});
