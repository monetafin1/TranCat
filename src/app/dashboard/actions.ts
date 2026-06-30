"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AssetCategory } from "@/lib/types";
import { CAT_ASSET_PURCHASE, CAT_ASSET_SALE } from "@/lib/types";

export async function updateTransactionCategory(
  transactionId: number,
  categoryId: number | null
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Look up tenant + description first so we can auto-learn: apply the same
  // category to any other uncategorized transactions with an identical
  // description for this tenant.
  const { data: txRow } = await supabase
    .from("transactions")
    .select("tenant_id, description")
    .eq("id", transactionId)
    .single();

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      status: categoryId ? "categorized" : "pending_review",
      updated_by: userData.user?.id ?? null,
    })
    .eq("id", transactionId);

  if (error) throw new Error(error.message);

  if (categoryId && txRow) {
    await supabase
      .from("transactions")
      .update({
        category_id: categoryId,
        status: "categorized",
        updated_by: userData.user?.id ?? null,
      })
      .eq("tenant_id", txRow.tenant_id)
      .eq("description", txRow.description)
      .is("category_id", null)
      .neq("id", transactionId);
  }

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
  type: "income" | "expense" | "transfer"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name, type });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ── Asset CRUD ────────────────────────────────────────────────────────────────

export async function createAsset(
  tenantId: number,
  name: string,
  asset_category: AssetCategory,
  purchase_date: string,
  purchase_amount: number,
  notes: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from("assets").insert({
    tenant_id: tenantId,
    name,
    asset_category,
    purchase_date,
    purchase_amount,
    notes,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function disposeAsset(
  assetId: number,
  disposal_date: string,
  disposal_amount: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({ disposal_date, disposal_amount })
    .eq("id", assetId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function addDepreciation(
  assetId: number,
  year: number,
  amount: number,
  notes: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from("asset_depreciation").insert({
    asset_id: assetId,
    year,
    amount,
    notes,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteDepreciation(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asset_depreciation")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function linkTransactionToAsset(
  transactionId: number,
  assetId: number | null,
  transactionType: "debit" | "credit"
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Auto-set category based on transaction type when linking
  const categoryId = assetId
    ? transactionType === "debit"
      ? CAT_ASSET_PURCHASE
      : CAT_ASSET_SALE
    : null;

  const { error } = await supabase
    .from("transactions")
    .update({
      asset_id: assetId,
      ...(categoryId !== null
        ? { category_id: categoryId, status: "categorized" }
        : {}),
      updated_by: userData.user?.id ?? null,
    })
    .eq("id", transactionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
