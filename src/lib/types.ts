export type Tenant = {
  id: number;
  name: string;
};

export type Category = {
  id: number;
  name: string;
  type: "income" | "expense" | "transfer";
};

export type TransactionStatus = "pending_review" | "categorized";
export type TransactionType = "debit" | "credit";
export type AccountType = "bank" | "credit_card";

export type Transaction = {
  id: number;
  tenant_id: number;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  category_id: number | null;
  status: TransactionStatus;
  source_file: string | null;
  bank: string | null;
  account_type: AccountType | null;
  currency: string;
  tags: string | null;
  asset_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ProcessedFile = {
  id: number;
  tenant_id: number;
  filename: string;
  file_hash: string;
  bank: string | null;
  account_type: AccountType | null;
  transaction_count: number;
  processed_at: string;
};

export const ASSET_CATEGORIES = [
  "Equipment",
  "Vehicle",
  "Property",
  "Furniture",
  "Intangible",
  "Other",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export type Asset = {
  id: number;
  tenant_id: number;
  name: string;
  asset_category: AssetCategory;
  purchase_date: string;
  purchase_amount: number;
  disposal_date: string | null;
  disposal_amount: number | null;
  notes: string | null;
  created_at: string;
};

export type AssetDepreciation = {
  id: number;
  asset_id: number;
  year: number;
  amount: number;
  notes: string | null;
  created_at: string;
};

// Category IDs for asset transactions (must match DB)
export const CAT_ASSET_PURCHASE = 23;
export const CAT_ASSET_SALE = 24;
