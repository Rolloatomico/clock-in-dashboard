import type { ReactNode } from "react";

export function ScreenHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between px-5 pb-4 pt-6">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-3xl font-black leading-none font-stretch-condensed uppercase">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function StatusPill({ status, compact }: { status: "fuera" | "turno" | "descanso"; compact?: boolean }) {
  const map = {
    turno: { label: "En turno", cls: "bg-success/15 text-success", dot: "bg-success animate-pulse-ring" },
    descanso: { label: "En descanso", cls: "bg-warning/25 text-warning-foreground", dot: "bg-warning" },
    fuera: { label: "Fuera de turno", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  }[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${map.cls}`}>
      <span className={`size-2 rounded-full ${map.dot}`} />
      {compact ? map.label.split(" ")[map.label.startsWith("Fuera") ? 0 : 1] : map.label}
    </span>
  );
}
