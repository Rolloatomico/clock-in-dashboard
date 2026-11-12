import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { BottomNav } from "@/components/timeclock/BottomNav";
import { useMe } from "@/lib/data";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-32">
      {children}
      <BottomNav isSupervisor={!!me?.isSupervisor} />
    </div>
  );
}

export function Loading() {
  return (
    <div className="grid place-items-center py-24 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function Avatar({ url, name, size = "md" }: { url?: string | null; name: string; size?: "md" | "lg" | "xl" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const cls = { md: "size-10 text-sm", lg: "size-11 text-sm", xl: "size-24 text-2xl" }[size];
  return url ? (
    <img src={url} alt={name} className={`${cls} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${cls} grid shrink-0 place-items-center rounded-full bg-ink font-display font-black text-ink-foreground`}>
      {initials || "?"}
    </div>
  );
}
