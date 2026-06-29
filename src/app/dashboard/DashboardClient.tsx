"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  updateTransactionCategory,
  setTransactionStatus,
  createTenant,
  bulkUpdateCategory,
  bulkSetStatus,
  createCategory,
} from "./actions";
import type { Category, Tenant, Transaction } from "@/lib/types";
import PnLView from "./PnLView";

type Props = {
  tenants: Tenant[];
  categories: Category[];
};

type Filters = {
  description: string;
  bank: string;
  accountType: "all" | "bank" | "credit_card";
  type: "all" | "debit" | "credit";
  categoryId: "all" | "uncategorized" | number;
  status: "all" | "pending_review" | "categorized";
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};

const emptyFilters: Filters = {
  description: "",
  bank: "",
  accountType: "all",
  type: "all",
  categoryId: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

export default function DashboardClient({ tenants, categories }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [tenantList, setTenantList] = useState(tenants);
  const [categoryList, setCategoryList] = useState(categories);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(
    tenants[0]?.id ?? null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [newTenantName, setNewTenantName] = useState("");
  const [, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategoryValue, setBulkCategoryValue] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<
    "income" | "expense" | "transfer"
  >("expense");
  const [addingCategory, setAddingCategory] = useState(false);

  const [view, setView] = useState<"transactions" | "pnl">("transactions");

  useEffect(() => {
    if (!selectedTenantId) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", selectedTenantId)
      .order("date", { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (!error) setTransactions((data ?? []) as Transaction[]);
        setLoading(false);
      });
  }, [selectedTenantId, supabase]);

  // Clear selection whenever the underlying transaction set changes (e.g. client switch).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedTenantId]);

  const categoryById = useMemo(() => {
    const map = new Map<number, Category>();
    categoryList.forEach((c) => map.set(c.id, c));
    return map;
  }, [categoryList]);

  const selectedTenantName = useMemo(
    () => tenantList.find((t) => t.id === selectedTenantId)?.name ?? "",
    [tenantList, selectedTenantId]
  );

  const incomeCategories = useMemo(
    () => categoryList.filter((c) => c.type === "income"),
    [categoryList]
  );
  const expenseCategories = useMemo(
    () => categoryList.filter((c) => c.type === "expense"),
    [categoryList]
  );
  const transferCategories = useMemo(
    () => categoryList.filter((c) => c.type === "transfer"),
    [categoryList]
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (
        filters.description &&
        !t.description.toLowerCase().includes(filters.description.toLowerCase())
      )
        return false;
      if (
        filters.bank &&
        !(t.bank ?? "").toLowerCase().includes(filters.bank.toLowerCase())
      )
        return false;
      if (
        filters.accountType !== "all" &&
        t.account_type !== filters.accountType
      )
        return false;
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.categoryId === "uncategorized" && t.category_id !== null)
        return false;
      if (
        typeof filters.categoryId === "number" &&
        t.category_id !== filters.categoryId
      )
        return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.amountMin && Number(t.amount) < Number(filters.amountMin))
        return false;
      if (filters.amountMax && Number(t.amount) > Number(filters.amountMax))
        return false;
      return true;
    });
  }, [transactions, filters]);

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleCategoryChange(txId: number, value: string) {
    const categoryId = value === "" ? null : Number(value);
    const changedTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            category_id: categoryId,
            status: categoryId ? "categorized" : "pending_review",
          };
        }
        // Auto-learn: mirror the same category onto other currently
        // uncategorized transactions with an identical description.
        if (
          categoryId &&
          changedTx &&
          t.category_id === null &&
          t.description === changedTx.description
        ) {
          return { ...t, category_id: categoryId, status: "categorized" };
        }
        return t;
      })
    );
    startTransition(() => {
      updateTransactionCategory(txId, categoryId);
    });
  }

  function handleStatusToggle(tx: Transaction) {
    const next = tx.status === "categorized" ? "pending_review" : "categorized";
    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: next } : t))
    );
    startTransition(() => {
      setTransactionStatus(tx.id, next);
    });
  }

  function handleBulkApplyCategory() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const categoryId = bulkCategoryValue === "" ? null : Number(bulkCategoryValue);
    setTransactions((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? {
              ...t,
              category_id: categoryId,
              status: categoryId ? "categorized" : "pending_review",
            }
          : t
      )
    );
    startTransition(() => {
      bulkUpdateCategory(ids, categoryId);
    });
    clearSelection();
    setBulkCategoryValue("");
  }

  function handleBulkStatus(status: "pending_review" | "categorized") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setTransactions((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, status } : t))
    );
    startTransition(() => {
      bulkSetStatus(ids, status);
    });
    clearSelection();
  }

  async function handleAddTenant() {
    const name = newTenantName.trim();
    if (!name) return;
    await createTenant(name);
    const { data } = await supabase.from("tenants").select("id, name").order("name");
    setTenantList((data ?? []) as Tenant[]);
    setNewTenantName("");
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    try {
      await createCategory(name, newCategoryType);
      const { data } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("type")
        .order("name");
      setCategoryList((data ?? []) as Category[]);
      setNewCategoryName("");
      setNewCategoryType("expense");
    } finally {
      setAddingCategory(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Client
          </label>
          <select
            className="mt-1 min-w-[200px] rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            value={selectedTenantId ?? ""}
            onChange={(e) => setSelectedTenantId(Number(e.target.value) || null)}
          >
            <option value="" disabled>
              Select a client…
            </option>
            {tenantList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Add client
            </label>
            <input
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="Client name"
              className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleAddTenant}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add
          </button>
        </div>

        <div className="flex items-end gap-2 rounded-md border border-zinc-200 bg-white p-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Add category — Name
            </label>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Insurance"
              className="mt-1 w-40 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Type
            </label>
            <select
              value={newCategoryType}
              onChange={(e) =>
                setNewCategoryType(
                  e.target.value as "income" | "expense" | "transfer"
                )
              }
              className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Other (Non-P&amp;L)</option>
            </select>
          </div>
          <button
            onClick={handleAddCategory}
            disabled={addingCategory}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {addingCategory ? "Adding…" : "Add"}
          </button>
        </div>

        <div className="ml-auto text-sm text-zinc-500">
          {filtered.length} of {transactions.length} transactions
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200">
        <button
          onClick={() => setView("transactions")}
          className={`px-3 py-2 text-sm font-medium ${
            view === "transactions"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setView("pnl")}
          className={`px-3 py-2 text-sm font-medium ${
            view === "pnl"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          P&amp;L
        </button>
      </div>

      {view === "pnl" && (
        <PnLView
          transactions={transactions}
          categories={categoryList}
          tenantName={selectedTenantName}
        />
      )}

      {view === "transactions" && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2">
          <span className="text-sm font-medium text-zinc-700">
            {selectedIds.size} selected
          </span>

          <div className="flex items-center gap-2">
            <select
              value={bulkCategoryValue}
              onChange={(e) => setBulkCategoryValue(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            >
              <option value="">Uncategorized</option>
              <optgroup label="Income">
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Expense">
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other (Non-P&amp;L)">
                {transferCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={handleBulkApplyCategory}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Apply category
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus("categorized")}
              className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
            >
              Mark categorized
            </button>
            <button
              onClick={() => handleBulkStatus("pending_review")}
              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
            >
              Mark pending
            </button>
          </div>

          <button
            onClick={clearSelection}
            className="ml-auto text-xs text-zinc-500 underline hover:text-zinc-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {view === "transactions" && (
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[1250px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
            </tr>
            <tr className="border-t border-zinc-100">
              <th className="px-3 py-1.5"></th>
              <th className="px-3 py-1.5">
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                    }
                    className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateTo: e.target.value }))
                    }
                    className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                  />
                </div>
              </th>
              <th className="px-3 py-1.5">
                <input
                  placeholder="Filter…"
                  value={filters.description}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  placeholder="Filter…"
                  value={filters.bank}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, bank: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                />
              </th>
              <th className="px-3 py-1.5">
                <select
                  value={filters.accountType}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      accountType: e.target.value as Filters["accountType"],
                    }))
                  }
                  className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="bank">Bank</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </th>
              <th className="px-3 py-1.5">
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      type: e.target.value as Filters["type"],
                    }))
                  }
                  className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </th>
              <th className="px-3 py-1.5">
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.amountMin}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, amountMin: e.target.value }))
                    }
                    className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.amountMax}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, amountMax: e.target.value }))
                    }
                    className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                  />
                </div>
              </th>
              <th className="px-3 py-1.5">
                <select
                  value={String(filters.categoryId)}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      categoryId:
                        e.target.value === "all" || e.target.value === "uncategorized"
                          ? (e.target.value as "all" | "uncategorized")
                          : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="uncategorized">Uncategorized</option>
                  <optgroup label="Income">
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Expense">
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other (Non-P&amp;L)">
                    {transferCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </th>
              <th className="px-3 py-1.5">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as Filters["status"],
                    }))
                  }
                  className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="pending_review">Pending</option>
                  <option value="categorized">Categorized</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-400">
                  {selectedTenantId
                    ? "No transactions match the current filters."
                    : "Select a client to view transactions."}
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const cat = t.category_id ? categoryById.get(t.category_id) : undefined;
              const isSelected = selectedIds.has(t.id);
              return (
                <tr
                  key={t.id}
                  className={`border-t border-zinc-100 hover:bg-zinc-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(t.id)}
                      aria-label={`Select transaction ${t.id}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-700">{t.date}</td>
                  <td className="px-3 py-2 text-zinc-900">{t.description}</td>
                  <td className="px-3 py-2 text-zinc-500">{t.bank ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {t.account_type === "credit_card"
                      ? "Credit Card"
                      : t.account_type === "bank"
                        ? "Bank"
                        : "—"}
                  </td>
                  <td className="px-3 py-2 capitalize text-zinc-500">{t.type}</td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                      t.type === "credit" ? "text-emerald-600" : "text-zinc-900"
                    }`}
                  >
                    {t.currency} {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={t.category_id ?? ""}
                      onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                      className="w-full min-w-[180px] rounded border border-zinc-200 px-2 py-1 text-xs"
                    >
                      <option value="">Uncategorized</option>
                      <optgroup label="Income">
                        {incomeCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Expense">
                        {expenseCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other (Non-P&amp;L)">
                        {transferCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {cat && (
                      <span
                        className={`mt-0.5 block text-[10px] ${
                          cat.type === "income"
                            ? "text-emerald-500"
                            : cat.type === "transfer"
                              ? "text-sky-500"
                              : "text-zinc-400"
                        }`}
                      >
                        {cat.type === "income"
                          ? "Income"
                          : cat.type === "transfer"
                            ? "Non-P&amp;L"
                            : "Expense"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleStatusToggle(t)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        t.status === "categorized"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.status === "categorized" ? "Categorized" : "Pending review"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
