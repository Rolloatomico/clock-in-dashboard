import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Punch, PunchType } from "@/lib/timeclock";

export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type EmployeeWithSite = Employee & { sites: Site | null };
export type TeamPunch = Punch & { user_id: string };

type PunchRow = Database["public"]["Tables"]["punches"]["Row"];
const toPunch = (r: PunchRow): TeamPunch => ({
  id: r.id,
  type: r.type,
  at: Date.parse(r.at),
  distance_m: r.distance_m,
  user_id: r.user_id,
});

export async function signedUrls(paths: string[]) {
  if (paths.length === 0) return {} as Record<string, string>;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

/** The signed-in person: auth user, employee record, role and photo. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");
      const [{ data: employee, error }, { data: roles }] = await Promise.all([
        supabase.from("employees").select("*, sites(*)").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (error) throw error;
      const avatarUrl = employee?.avatar_path
        ? (await signedUrls([employee.avatar_path]))[employee.avatar_path] ?? null
        : null;
      return {
        user,
        employee: employee as EmployeeWithSite | null,
        isSupervisor: !!roles?.some((r) => r.role === "supervisor"),
        avatarUrl,
      };
    },
    staleTime: 60_000,
  });
}

export function useMyPunches(from: number, to: number) {
  return useQuery({
    queryKey: ["punches", "mine", from, to],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("punches")
        .select("*")
        .eq("user_id", user.id)
        .gte("at", new Date(from).toISOString())
        .lt("at", new Date(to).toISOString())
        .order("at", { ascending: true });
      if (error) throw error;
      return data.map(toPunch);
    },
  });
}

/** The most recent punch, wherever it falls, so an open shift from yesterday still counts. */
export function useLastPunch() {
  return useQuery({
    queryKey: ["punches", "last"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("punches")
        .select("*")
        .eq("user_id", user.id)
        .order("at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? toPunch(data) : null;
    },
  });
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    });
  });
}

export function usePunch(needsLocation: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (type: PunchType) => {
      const pos = needsLocation ? await getPosition() : null;
      const { data, error } = await supabase
        .from("punches")
        .insert({
          type,
          latitude: pos?.coords.latitude ?? null,
          longitude: pos?.coords.longitude ?? null,
          accuracy_m: pos?.coords.accuracy ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return toPunch(data);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["punches"] }),
  });
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

/** Supervisor view: every employee plus everyone's punches in the range. */
export function useTeam(from: number, to: number) {
  return useQuery({
    queryKey: ["team", from, to],
    queryFn: async () => {
      const [{ data: employees, error: e1 }, { data: punches, error: e2 }] = await Promise.all([
        supabase.from("employees").select("*, sites(*)").order("full_name"),
        supabase
          .from("punches")
          .select("*")
          .gte("at", new Date(from).toISOString())
          .lt("at", new Date(to).toISOString())
          .order("at", { ascending: true })
          .limit(5000),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const list = employees as EmployeeWithSite[];
      const urls = await signedUrls(list.map((e) => e.avatar_path).filter((p): p is string => !!p));
      return { employees: list, punches: punches.map(toPunch), avatarUrls: urls };
    },
  });
}

export const roleLabel = { supervisor: "Supervisor", empleado: "Empleado" } as const;
