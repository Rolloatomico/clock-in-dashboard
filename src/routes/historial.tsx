import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ScreenHeader } from "@/components/timeclock/ScreenHeader";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Historial — Ponchador" },
      { name: "description", content: "Consulta tus horas trabajadas y checadas de la semana." },
      { property: "og:title", content: "Historial — Ponchador" },
      { property: "og:description", content: "Tus horas trabajadas y checadas de la semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryScreen,
});

// Sample week for the template.
const week = [
  { d: "Lun", n: 9, in: "07:58", out: "16:12", h: 8.2, tag: null },
  { d: "Mar", n: 10, in: "08:04", out: "16:05", h: 8.0, tag: null },
  { d: "Mié", n: 11, in: "08:21", out: "16:00", h: 7.6, tag: "Retardo" },
  { d: "Jue", n: 12, in: "08:02", out: "—", h: 3.4, tag: "Hoy" },
  { d: "Vie", n: 13, in: "—", out: "—", h: 0, tag: null },
  { d: "Sáb", n: 14, in: "—", out: "—", h: 0, tag: null },
];

function HistoryScreen() {
  const total = week.reduce((s, x) => s + x.h, 0);
  const max = 9;

  return (
    <div>
      <ScreenHeader eyebrow="Semana 46" title="Historial" />

      <div className="space-y-5 px-5">
        <section className="rounded-2xl bg-ink p-5 text-ink-foreground shadow-card">
          <div className="flex items-center justify-between">
            <button aria-label="Semana anterior" className="rounded-full p-1 text-ink-foreground/60">
              <ChevronLeft className="size-5" />
            </button>
            <p className="text-sm font-semibold">9 – 14 de noviembre</p>
            <button aria-label="Semana siguiente" className="rounded-full p-1 text-ink-foreground/60">
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-mono text-5xl font-bold leading-none">{total.toFixed(1)}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-foreground/60">
                de 48 horas
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-bold text-primary">1</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-foreground/60">Retardo</p>
            </div>
          </div>

          <div className="mt-5 flex h-28 items-end gap-2">
            {week.map((x) => (
              <div key={x.d} className="flex h-full flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-md bg-ink-foreground/10">
                  <div
                    className={`w-full rounded-md ${x.tag === "Hoy" ? "bg-primary" : "bg-ink-foreground/80"}`}
                    style={{ height: `${(x.h / max) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold uppercase text-ink-foreground/60">{x.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-card shadow-card">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Día</span>
            <span className="w-12 text-right">Entra</span>
            <span className="w-12 text-right">Sale</span>
            <span className="w-10 text-right">Hrs</span>
          </div>
          <ul>
            {week.map((x) => (
              <li
                key={x.d}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-dashed px-4 py-3 last:border-0"
              >
                <span className="flex items-center gap-2">
                  <span className="font-display text-lg font-black">{x.n}</span>
                  <span className="text-sm text-muted-foreground">{x.d}</span>
                  {x.tag && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        x.tag === "Hoy" ? "bg-primary text-primary-foreground" : "bg-warning/30 text-warning-foreground"
                      }`}
                    >
                      {x.tag}
                    </span>
                  )}
                </span>
                <span className="w-12 text-right font-mono text-sm">{x.in}</span>
                <span className="w-12 text-right font-mono text-sm">{x.out}</span>
                <span className="w-10 text-right font-mono text-sm font-bold">{x.h ? x.h.toFixed(1) : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
