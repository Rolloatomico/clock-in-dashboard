import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { ScreenHeader, StatusPill } from "@/components/timeclock/ScreenHeader";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo — Ponchador" },
      { name: "description", content: "Ve quién está en turno, en descanso o fuera, en tiempo real." },
      { property: "og:title", content: "Equipo — Ponchador" },
      { property: "og:description", content: "Quién está en turno, en descanso o fuera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamScreen,
});

type S = "turno" | "descanso" | "fuera";
// Sample team for the template.
const team: { name: string; role: string; status: S; since: string }[] = [
  { name: "Mariana Ruiz", role: "Supervisora", status: "turno", since: "08:02" },
  { name: "Jorge Salinas", role: "Soldador", status: "turno", since: "07:55" },
  { name: "Lucía Herrera", role: "Almacén", status: "descanso", since: "11:10" },
  { name: "Ramón Treviño", role: "Montacargas", status: "turno", since: "08:14" },
  { name: "Ana Cantú", role: "Calidad", status: "fuera", since: "Ayer 16:03" },
  { name: "Diego Garza", role: "Mantenimiento", status: "turno", since: "06:58" },
  { name: "Sofía Leal", role: "Recepción", status: "fuera", since: "Ayer 15:30" },
];

const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2);

function TeamScreen() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<S | "todos">("todos");
  const count = (s: S) => team.filter((t) => t.status === s).length;
  const list = team.filter(
    (t) => (filter === "todos" || t.status === filter) && t.name.toLowerCase().includes(q.toLowerCase()),
  );

  const filters: { key: S | "todos"; label: string; n: number }[] = [
    { key: "todos", label: "Todos", n: team.length },
    { key: "turno", label: "En turno", n: count("turno") },
    { key: "descanso", label: "Descanso", n: count("descanso") },
    { key: "fuera", label: "Fuera", n: count("fuera") },
  ];

  return (
    <div>
      <ScreenHeader eyebrow="Planta Monterrey" title="Equipo" />
      <div className="space-y-4 px-5">
        <section className="grid grid-cols-3 gap-2">
          <Count n={count("turno")} label="En turno" cls="bg-success text-success-foreground" />
          <Count n={count("descanso")} label="Descanso" cls="bg-warning text-warning-foreground" />
          <Count n={count("fuera")} label="Fuera" cls="bg-card text-foreground" />
        </section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar compañero"
            className="h-11 rounded-xl bg-card pl-9"
          />
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                filter === f.key ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {f.label} · {f.n}
            </button>
          ))}
        </div>

        <ul className="overflow-hidden rounded-xl bg-card shadow-card">
          {list.map((t) => (
            <li key={t.name} className="flex items-center gap-3 border-b border-dashed px-4 py-3 last:border-0">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm font-black">
                {initials(t.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.role} · <span className="font-mono">{t.since}</span>
                </p>
              </div>
              <StatusPill status={t.status} compact />
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
        </ul>
      </div>
    </div>
  );
}

function Count({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className={`rounded-xl p-3 shadow-card ${cls}`}>
      <p className="font-mono text-3xl font-bold leading-none">{n}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
