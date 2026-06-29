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
  created_at: string;
  updated_at: string;
};
