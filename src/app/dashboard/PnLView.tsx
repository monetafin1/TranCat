"use client";

import { useMemo, useState } from "react";
import type { Category, Transaction } from "@/lib/types";

type Props = {
  transactions: Transaction[];
  categories: Category[];
  tenantName: string;
};

export default function PnLView({ transactions, categories, tenantName }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const categoryById = useMemo(() => {
    const map = new Map<number, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const {
    incomeLines,
    expenseLines,
    transferLines,
    totalIncome,
    totalExpense,
    totalTransfer,
    uncategorizedCredit,
    uncategorizedDebit,
    uncategorizedCreditCount,
    uncategorizedDebitCount,
  } = useMemo(() => {
    const incomeMap = new Map<number, { name: string; amount: number }>();
    const expenseMap = new Map<number, { name: string; amount: number }>();
    const transferMap = new Map<number, { name: string; amount: number }>();
    let uncategorizedCredit = 0;
    let uncategorizedDebit = 0;
    let uncategorizedCreditCount = 0;
    let uncategorizedDebitCount = 0;

    for (const t of filtered) {
      const amount = Number(t.amount) || 0;
      if (t.category_id === null) {
        if (t.type === "credit") {
          uncategorizedCredit += amount;
          uncategorizedCreditCount += 1;
        } else {
          uncategorizedDebit += amount;
          uncategorizedDebitCount += 1;
        }
        continue;
      }
      const cat = categoryById.get(t.category_id);
      if (!cat) continue;
      const targetMap =
        cat.type === "income"
          ? incomeMap
          : cat.type === "transfer"
            ? transferMap
            : expenseMap;
      const existing = targetMap.get(cat.id);
      if (existing) {
        existing.amount += amount;
      } else {
        targetMap.set(cat.id, { name: cat.name, amount });
      }
    }

    const incomeLines = Array.from(incomeMap.values()).sort(
      (a, b) => b.amount - a.amount
    );
    const expenseLines = Array.from(expenseMap.values()).sort(
      (a, b) => b.amount - a.amount
    );
    const transferLines = Array.from(transferMap.values()).sort(
      (a, b) => b.amount - a.amount
    );
    const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0);
    const totalExpense = expenseLines.reduce((s, l) => s + l.amount, 0);
    const totalTransfer = transferLines.reduce((s, l) => s + l.amount, 0);

    return {
      incomeLines,
      expenseLines,
      transferLines,
      totalIncome,
      totalExpense,
      totalTransfer,
      uncategorizedCredit,
      uncategorizedDebit,
      uncategorizedCreditCount,
      uncategorizedDebitCount,
    };
  }, [filtered, categoryById]);

  const netIncome = totalIncome - totalExpense;
  const currency = filtered[0]?.currency ?? "INR";

  function formatAmount(n: number) {
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function handleExport() {
    const XLSX = await import("xlsx");
    const rows: (string | number)[][] = [];
    rows.push([`Profit & Loss — ${tenantName}`]);
    rows.push([`Period: ${dateFrom || "All time"} to ${dateTo || "All time"}`]);
    rows.push([]);
    rows.push(["Income"]);
    incomeLines.forEach((l) => rows.push([l.name, l.amount]));
    rows.push(["Total Income", totalIncome]);
    rows.push([]);
    rows.push(["Expense"]);
    expenseLines.forEach((l) => rows.push([l.name, l.amount]));
    rows.push(["Total Expense", totalExpense]);
    rows.push([]);
    rows.push(["Net Income", netIncome]);
    rows.push([]);
    rows.push(["Other (Non-P&L) — transfers, investments, etc."]);
    transferLines.forEach((l) => rows.push([l.name, l.amount]));
    rows.push(["Total Other (Non-P&L)", totalTransfer]);
    rows.push([]);
    rows.push(["Uncategorized (not included in Net Income)"]);
    rows.push([`Credits (${uncategorizedCreditCount} txns)`, uncategorizedCredit]);
    rows.push([`Debits (${uncategorizedDebitCount} txns)`, uncategorizedDebit]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 40 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "P&L");
    const periodLabel = `${dateFrom || "all"}_to_${dateTo || "all"}`;
    XLSX.writeFile(
      workbook,
      `PnL_${tenantName.replace(/\s+/g, "_")}_${periodLabel}.xlsx`
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={handleExport}
          className="ml-auto rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Export to Excel
        </button>
      </div>

      <div className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">
          Profit &amp; Loss — {tenantName}
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          {dateFrom || "All time"} to {dateTo || "All time"}
        </p>

        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold text-emerald-700">Income</h3>
          {incomeLines.length === 0 && (
            <p className="text-sm text-zinc-400">No categorized income.</p>
          )}
          {incomeLines.map((l) => (
            <div
              key={l.name}
              className="flex justify-between border-b border-zinc-100 py-1 text-sm"
            >
              <span className="text-zinc-700">{l.name}</span>
              <span className="text-zinc-900">
                {currency} {formatAmount(l.amount)}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-zinc-300 py-1 text-sm font-semibold">
            <span>Total Income</span>
            <span>
              {currency} {formatAmount(totalIncome)}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold text-rose-700">Expense</h3>
          {expenseLines.length === 0 && (
            <p className="text-sm text-zinc-400">No categorized expense.</p>
          )}
          {expenseLines.map((l) => (
            <div
              key={l.name}
              className="flex justify-between border-b border-zinc-100 py-1 text-sm"
            >
              <span className="text-zinc-700">{l.name}</span>
              <span className="text-zinc-900">
                {currency} {formatAmount(l.amount)}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-zinc-300 py-1 text-sm font-semibold">
            <span>Total Expense</span>
            <span>
              {currency} {formatAmount(totalExpense)}
            </span>
          </div>
        </div>

        <div
          className={`flex justify-between rounded-md px-3 py-2 text-sm font-bold ${
            netIncome >= 0
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          <span>Net Income</span>
          <span>
            {currency} {formatAmount(netIncome)}
          </span>
        </div>

        {transferLines.length > 0 && (
          <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3">
            <p className="mb-1 text-sm font-semibold text-sky-800">
              Other (Non-P&amp;L) — transfers, investments, etc.
            </p>
            {transferLines.map((l) => (
              <div
                key={l.name}
                className="flex justify-between border-b border-sky-100 py-1 text-sm text-sky-700"
              >
                <span>{l.name}</span>
                <span>
                  {currency} {formatAmount(l.amount)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex justify-between text-sm font-semibold text-sky-800">
              <span>Total Other (Non-P&amp;L)</span>
              <span>
                {currency} {formatAmount(totalTransfer)}
              </span>
            </div>
          </div>
        )}

        {(uncategorizedCreditCount > 0 || uncategorizedDebitCount > 0) && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="mb-1 font-semibold text-amber-800">
              Uncategorized (not included above)
            </p>
            {uncategorizedCreditCount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Credits ({uncategorizedCreditCount} txns)</span>
                <span>
                  {currency} {formatAmount(uncategorizedCredit)}
                </span>
              </div>
            )}
            {uncategorizedDebitCount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Debits ({uncategorizedDebitCount} txns)</span>
                <span>
                  {currency} {formatAmount(uncategorizedDebit)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
