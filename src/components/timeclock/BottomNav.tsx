import { Link } from "@tanstack/react-router";
import { CalendarDays, Fingerprint, Settings, Users } from "lucide-react";

export function BottomNav({ isSupervisor }: { isSupervisor: boolean }) {
  const tabs = [
    { to: "/", label: "Checar", icon: Fingerprint },
    { to: "/historial", label: "Historial", icon: CalendarDays },
    ...(isSupervisor ? [{ to: "/equipo", label: "Equipo", icon: Users }] : []),
    { to: "/ajustes", label: "Ajustes", icon: Settings },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <ul
        className="grid rounded-2xl bg-ink p-1.5 text-ink-foreground shadow-card"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-foreground/60 transition-colors data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
