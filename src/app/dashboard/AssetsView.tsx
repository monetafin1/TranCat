"use client";

import { useState, useTransition } from "react";
import type { Asset, AssetDepreciation } from "@/lib/types";
import { ASSET_CATEGORIES } from "@/lib/types";
import {
  createAsset,
  addDepreciation,
  deleteDepreciation,
  disposeAsset,
} from "./actions";

type Props = {
  tenantId: number;
  tenantName: string;
  assets: Asset[];
  depreciation: AssetDepreciation[];
  onRefresh: () => void;
};

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AssetsView({
  tenantId,
  tenantName,
  assets,
  depreciation,
  onRefresh,
}: Props) {
  const [, startTransition] = useTransition();
  const [expandedAssetId, setExpandedAssetId] = useState<number | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showDisposeFor, setShowDisposeFor] = useState<number | null>(null);
  const [showAddDepFor, setShowAddDepFor] = useState<number | null>(null);

  // Add asset form
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<typeof ASSET_CATEGORIES[number]>("Equipment");
  const [addDate, setAddDate] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);

  // Dispose form
  const [disposeDate, setDisposeDate] = useState("");
  const [disposeAmount, setDisposeAmount] = useState("");
  const [disposing, setDisposing] = useState(false);

  // Add depreciation form
  const [depYear, setDepYear] = useState(String(new Date().getFullYear()));
  const [depAmount, setDepAmount] = useState("");
  const [depNotes, setDepNotes] = useState("");
  const [addingDep, setAddingDep] = useState(false);

  // Compute book value per asset
  function bookValue(asset: Asset) {
    const totalDep = depreciation
      .filter((d) => d.asset_id === asset.id)
      .reduce((s, d) => s + d.amount, 0);
    const disposalAdj = asset.disposal_amount ?? 0;
    return asset.purchase_amount - totalDep - disposalAdj;
  }

  async function handleAddAsset() {
    if (!addName || !addDate || !addAmount) return;
    setAddingAsset(true);
    try {
      await createAsset(
        tenantId,
        addName,
        addCategory,
        addDate,
        Number(addAmount),
        addNotes || null
      );
      setAddName("");
      setAddDate("");
      setAddAmount("");
      setAddNotes("");
      setAddCategory("Equipment");
      setShowAddAsset(false);
      startTransition(() => onRefresh());
    } finally {
      setAddingAsset(false);
    }
  }

  async function handleDispose(assetId: number) {
    if (!disposeDate || !disposeAmount) return;
    setDisposing(true);
    try {
      await disposeAsset(assetId, disposeDate, Number(disposeAmount));
      setDisposeDate("");
      setDisposeAmount("");
      setShowDisposeFor(null);
      startTransition(() => onRefresh());
    } finally {
      setDisposing(false);
    }
  }

  async function handleAddDep(assetId: number) {
    if (!depYear || !depAmount) return;
    setAddingDep(true);
    try {
      await addDepreciation(assetId, Number(depYear), Number(depAmount), depNotes || null);
      setDepAmount("");
      setDepNotes("");
      setShowAddDepFor(null);
      startTransition(() => onRefresh());
    } finally {
      setAddingDep(false);
    }
  }

  async function handleDeleteDep(id: number) {
    await deleteDepreciation(id);
    startTransition(() => onRefresh());
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">
          Assets — {tenantName}
        </h2>
        <button
          onClick={() => setShowAddAsset(!showAddAsset)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Add Asset
        </button>
      </div>

      {/* Add asset form */}
      {showAddAsset && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-zinc-900">New asset</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500">Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. MacBook Pro"
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">Category</label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value as typeof ASSET_CATEGORIES[number])}
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">Purchase Date</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">Purchase Amount</label>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-500">Notes (optional)</label>
              <input
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder=""
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddAsset}
              disabled={addingAsset || !addName || !addDate || !addAmount}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {addingAsset ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowAddAsset(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {assets.length === 0 && !showAddAsset && (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          No assets yet. Click &ldquo;+ Add Asset&rdquo; to add one.
        </div>
      )}

      {/* Asset list */}
      <div className="flex flex-col gap-3">
        {assets.map((asset) => {
          const assetDeps = depreciation.filter((d) => d.asset_id === asset.id);
          const totalDep = assetDeps.reduce((s, d) => s + d.amount, 0);
          const bv = bookValue(asset);
          const isExpanded = expandedAssetId === asset.id;
          const isDisposed = !!asset.disposal_date;

          return (
            <div
              key={asset.id}
              className={`rounded-lg border bg-white ${isDisposed ? "border-zinc-100 opacity-70" : "border-zinc-200"}`}
            >
              {/* Asset header */}
              <button
                className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
                onClick={() =>
                  setExpandedAssetId(isExpanded ? null : asset.id)
                }
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">
                      {asset.name}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                      {asset.asset_category}
                    </span>
                    {isDisposed && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-600">
                        Disposed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Purchased {asset.purchase_date} · INR {formatAmount(asset.purchase_amount)}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-zinc-400">Book Value</p>
                  <p className={`text-sm font-semibold ${bv < 0 ? "text-rose-600" : "text-zinc-900"}`}>
                    INR {formatAmount(Math.max(0, bv))}
                  </p>
                  {totalDep > 0 && (
                    <p className="text-[10px] text-zinc-400">
                      Dep. INR {formatAmount(totalDep)}
                    </p>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 py-3">
                  {asset.notes && (
                    <p className="mb-2 text-xs text-zinc-500">
                      <span className="font-medium">Notes:</span> {asset.notes}
                    </p>
                  )}

                  {/* Depreciation history */}
                  <p className="mb-1.5 text-xs font-medium text-zinc-700">
                    Depreciation
                  </p>
                  {assetDeps.length === 0 ? (
                    <p className="mb-2 text-xs text-zinc-400">No depreciation entries.</p>
                  ) : (
                    <table className="mb-2 w-full max-w-md text-xs">
                      <thead>
                        <tr className="text-zinc-400">
                          <th className="py-1 text-left font-medium">Year</th>
                          <th className="py-1 text-right font-medium">Amount</th>
                          <th className="py-1 text-left font-medium pl-3">Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetDeps
                          .sort((a, b) => a.year - b.year)
                          .map((d) => (
                            <tr key={d.id} className="border-t border-zinc-100">
                              <td className="py-1 text-zinc-700">{d.year}</td>
                              <td className="py-1 text-right text-zinc-900">
                                INR {formatAmount(d.amount)}
                              </td>
                              <td className="py-1 pl-3 text-zinc-500">{d.notes ?? "—"}</td>
                              <td className="py-1 pl-2">
                                <button
                                  onClick={() => handleDeleteDep(d.id)}
                                  className="text-rose-400 hover:text-rose-600"
                                  title="Delete"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add depreciation form */}
                  {showAddDepFor === asset.id ? (
                    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-md bg-zinc-50 p-2">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500">Year</label>
                        <input
                          type="number"
                          value={depYear}
                          onChange={(e) => setDepYear(e.target.value)}
                          className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500">Amount</label>
                        <input
                          type="number"
                          value={depAmount}
                          onChange={(e) => setDepAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500">Notes</label>
                        <input
                          value={depNotes}
                          onChange={(e) => setDepNotes(e.target.value)}
                          className="w-40 rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <button
                        onClick={() => handleAddDep(asset.id)}
                        disabled={addingDep || !depYear || !depAmount}
                        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {addingDep ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setShowAddDepFor(null)}
                        className="text-xs text-zinc-500 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddDepFor(asset.id)}
                      className="mb-3 text-xs text-sky-600 hover:underline"
                    >
                      + Add depreciation
                    </button>
                  )}

                  {/* Disposal info / form */}
                  {isDisposed ? (
                    <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-xs text-rose-700">
                      Disposed {asset.disposal_date} · Proceeds INR {formatAmount(asset.disposal_amount ?? 0)}
                    </div>
                  ) : showDisposeFor === asset.id ? (
                    <div className="flex flex-wrap items-end gap-2 rounded-md bg-zinc-50 p-2">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500">Disposal Date</label>
                        <input
                          type="date"
                          value={disposeDate}
                          onChange={(e) => setDisposeDate(e.target.value)}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-500">Proceeds</label>
                        <input
                          type="number"
                          value={disposeAmount}
                          onChange={(e) => setDisposeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <button
                        onClick={() => handleDispose(asset.id)}
                        disabled={disposing || !disposeDate || !disposeAmount}
                        className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {disposing ? "…" : "Mark disposed"}
                      </button>
                      <button
                        onClick={() => setShowDisposeFor(null)}
                        className="text-xs text-zinc-500 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDisposeFor(asset.id)}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Mark as disposed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
