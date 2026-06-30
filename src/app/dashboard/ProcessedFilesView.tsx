"use client";

import { useMemo } from "react";
import type { ProcessedFile } from "@/lib/types";

type Props = {
  files: ProcessedFile[];
  tenantName: string;
};

function formatFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (ext === "xlsx" || ext === "xls") return "Excel";
  if (ext === "csv") return "CSV";
  return ext ? ext.toUpperCase() : "—";
}

export default function ProcessedFilesView({ files, tenantName }: Props) {
  const sorted = useMemo(
    () =>
      [...files].sort(
        (a, b) =>
          new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
      ),
    [files]
  );

  const totalTransactions = useMemo(
    () => files.reduce((sum, f) => sum + (f.transaction_count ?? 0), 0),
    [files]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <div>
          <div className="text-xs uppercase text-zinc-500">Client</div>
          <div className="text-sm font-medium text-zinc-900">
            {tenantName || "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Files processed</div>
          <div className="text-sm font-medium text-zinc-900">{files.length}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">
            Transactions loaded
          </div>
          <div className="text-sm font-medium text-zinc-900">
            {totalTransactions.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Filename</th>
              <th className="px-3 py-2">Format</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">Transactions</th>
              <th className="px-3 py-2">Processed</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">
                  {tenantName
                    ? "No statements have been processed for this client yet."
                    : "Select a client to view processed files."}
                </td>
              </tr>
            )}
            {sorted.map((f) => (
              <tr key={f.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-3 py-2 text-zinc-900">{f.filename}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {formatFromFilename(f.filename)}
                </td>
                <td className="px-3 py-2 text-zinc-500">{f.bank ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {f.account_type === "credit_card"
                    ? "Credit Card"
                    : f.account_type === "bank"
                      ? "Bank"
                      : "—"}
                </td>
                <td className="px-3 py-2 text-right text-zinc-700">
                  {f.transaction_count}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                  {new Date(f.processed_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
