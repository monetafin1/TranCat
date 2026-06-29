"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateTransactionCategory, setTransactionStatus, createTenant } from "./actions";
import type { Category, Tenant, Transaction } from "@/lib/types";

type Props = {
  tenants: Tenant[];
  categories: Category[];
};

type Filters = {
  description: string;
  bank: string;
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
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(
    tenants[0]?.id ?? null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [newTenantName, setNewTenantName] = useState("");
  const [, startTransition] = useTransition();

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

  const categoryById = useMemo(() => {
    const map = new Map<number, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

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

  function handleCategoryChange(txId: number, value: string) {
    const categoryId = value === "" ? null : Number(value);
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              category_id: categoryId,
              status: categoryId ? "categorized" : "pending_review",
            }
          : t
      )
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

  async function handleAddTenant() {
    const name = newTenantName.trim();
    if (!name) return;
    await createTenant(name);
    const { data } = await supabase.from("tenants").select("id, name").order("name");
    setTenantList((data ?? []) as Tenant[]);
    setNewTenantName("");
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

        <div className="ml-auto text-sm text-zinc-500">
          {filtered.length} of {transactions.length} transactions
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
            </tr>
            <tr className="border-t border-zinc-100">
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
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
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  {selectedTenantId
                    ? "No transactions match the current filters."
                    : "Select a client to view transactions."}
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const cat = t.category_id ? categoryById.get(t.category_id) : undefined;
              return (
                <tr key={t.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-700">{t.date}</td>
                  <td className="px-3 py-2 text-zinc-900">{t.description}</td>
                  <td className="px-3 py-2 text-zinc-500">{t.bank ?? "—"}</td>
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
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.group_name} — {c.name}
                        </option>
                      ))}
                    </select>
                    {cat && (
                      <span className="mt-0.5 block text-[10px] text-zinc-400">
                        {cat.group_name}
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
    </div>
  );
}
