"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");
  return supabase;
}

export async function approveUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ approved: true })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function revokeUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ approved: false })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
