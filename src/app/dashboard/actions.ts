"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTransactionCategory(
  transactionId: number,
  categoryId: number | null
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      status: categoryId ? "categorized" : "pending_review",
      updated_by: userData.user?.id ?? null,
    })
    .eq("id", transactionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function setTransactionStatus(
  transactionId: number,
  status: "pending_review" | "categorized"
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("transactions")
    .update({ status, updated_by: userData.user?.id ?? null })
    .eq("id", transactionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createTenant(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tenants").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function bulkUpdateCategory(
  transactionIds: number[],
  categoryId: number | null
) {
  if (transactionIds.length === 0) return;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      status: categoryId ? "categorized" : "pending_review",
      updated_by: userData.user?.id ?? null,
    })
    .in("id", transactionIds);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function bulkSetStatus(
  transactionIds: number[],
  status: "pending_review" | "categorized"
) {
  if (transactionIds.length === 0) return;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("transactions")
    .update({ status, updated_by: userData.user?.id ?? null })
    .in("id", transactionIds);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createCategory(
  name: string,
  type: "income" | "expense"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name, type });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
