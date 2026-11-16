import { createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, LogOut, Shield, User } from "lucide-react";

import { ScreenHeader } from "@/components/timeclock/ScreenHeader";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Ponchador" },
      { name: "description", content: "Tu perfil, avisos y seguridad de tu cuenta en Ponchador." },
      { property: "og:title", content: "Ajustes — Ponchador" },
      { property: "og:description", content: "Tu perfil, avisos y seguridad de tu cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsScreen,
});

const items = [
  { icon: User, label: "Mi perfil", hint: "Nombre, puesto y foto" },
  { icon: Bell, label: "Recordatorios", hint: "Avisos de entrada y salida" },
  { icon: Shield, label: "Seguridad", hint: "Contraseña y sesiones" },
];

function SettingsScreen() {
  return (
    <div>
      <ScreenHeader eyebrow="Tu cuenta" title="Ajustes" />
      <div className="space-y-4 px-5">
        <ul className="overflow-hidden rounded-xl bg-card shadow-card">
          {items.map(({ icon: Icon, label, hint }) => (
            <li key={label} className="flex items-center gap-3 border-b border-dashed px-4 py-3 last:border-0">
              <div className="grid size-10 shrink-0 place-items-center rounded-none bg-secondary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{hint}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-border bg-card py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
        <p className="text-center text-xs text-muted-foreground">Estas opciones se activan cuando las cuentas estén conectadas.</p>
      </div>
    </div>
  );
}
