import { createFileRoute } from "@tanstack/react-router";
import { Coffee, Fingerprint, LogOut, MapPin, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/timeclock/ScreenHeader";
import { useNow, useTimeclock } from "@/lib/demo-clock";
import { H, fmtClock, fmtDur, punchLabel, totals } from "@/lib/timeclock";

const SHIFT_GOAL_MS = 8 * H;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Checar — Ponchador" },
      { name: "description", content: "Registra tu entrada, descansos y salida desde el celular con un solo toque." },
      { property: "og:title", content: "Checar — Ponchador" },
      { property: "og:description", content: "Registra tu entrada, descansos y salida desde el celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckScreen,
});

function CheckScreen() {
  const now = useNow();
  const { punches, status, punch } = useTimeclock();
  const { worked, away: rest } = totals(punches, now ?? 0);
  const progress = Math.min(1, worked / SHIFT_GOAL_MS);
  const last = punches.at(-1);

  const date = now
    ? new Date(now).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    : "\u00a0";
  const hhmm = now ? fmtClock(now) : "--:--";
  const ss = now ? String(new Date(now).getSeconds()).padStart(2, "0") : "--";

  return (
    <div className="space-y-5 px-5 pt-6">
      {/* Greeting */}
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Taller Norte
          </p>
          <h1 className="font-display text-2xl font-black leading-tight">Hola, Mariana</h1>
        </div>
        <div className="grid size-11 place-items-center rounded-full bg-ink font-display text-sm font-black text-ink-foreground">
          MR
        </div>
      </header>

      {/* Time card */}
      <section className="relative overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="h-3 bg-ink edge-perforated" />
        <div className="bg-ruled px-5 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground first-letter:uppercase">{date}</p>
            <StatusPill status={status} />
          </div>
          <p className="mt-3 font-mono text-7xl font-bold leading-none tracking-tighter">
            {hhmm}
            <span className="ml-1 text-2xl text-primary">{ss}</span>
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5 text-success" /> Planta Monterrey · Ubicación verificada
          </p>

          {last && (
            <div
              key={last.id}
              className="absolute right-4 top-16 animate-stamp rounded-md border-2 border-primary px-2 py-1 font-mono text-[11px] font-bold uppercase leading-tight text-primary"
            >
              {punchLabel[last.type]}
              <br />
              {fmtClock(last.at)}
            </div>
          )}
        </div>
      </section>

      {/* Main punch */}
      <section className="flex flex-col items-center gap-4 py-2">
        {status === "fuera" ? (
          <Button
            variant="punch"
            onClick={() => punch("entrada")}
            className="size-48 flex-col rounded-full text-xl [&_svg]:size-14"
          >
            <Fingerprint />
            Checar entrada
          </Button>
        ) : (
          <Button
            variant="punch"
            onClick={() => punch("salida")}
            className="size-48 flex-col rounded-full text-xl [&_svg]:size-14"
          >
            <LogOut />
            Checar salida
          </Button>
        )}

        {status === "turno" && (
          <Button variant="paper" size="lg" className="w-full rounded-xl" onClick={() => punch("salida_temporal")}>
            <Coffee /> Salida temporal
          </Button>
        )}
        {status === "salida_temporal" && (
          <Button variant="ink" size="lg" className="w-full rounded-xl" onClick={() => punch("regreso")}>
            <Play /> Checar regreso
          </Button>
        )}
      </section>

      {/* Today stats */}
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Trabajado hoy" value={now ? fmtDur(worked) : "—"} />
        <Stat label="Descanso" value={now ? fmtDur(rest) : "—"} />
        <div className="col-span-2 rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta del día</p>
            <p className="font-mono text-sm font-bold">{Math.round(progress * 100)}% de 8h</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </section>

      {/* Today's punches */}
      <section className="rounded-xl bg-card p-4 shadow-card">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Checadas de hoy</h2>
        <ol className="mt-3 space-y-0">
          {punches.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aún no checas hoy.</li>}
          {[...punches].reverse().map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-dashed py-3 last:border-0">
              <span className="flex items-center gap-3 text-sm font-semibold">
                <span
                  className={`size-2.5 rounded-full ${
                    p.type === "entrada" || p.type === "regreso"
                      ? "bg-success"
                      : p.type === "salida_temporal"
                        ? "bg-warning"
                        : "bg-primary"
                  }`}
                />
                {punchLabel[p.type]}
              </span>
              <span className="font-mono text-sm font-bold">{fmtClock(p.at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}
