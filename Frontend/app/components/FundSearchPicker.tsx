"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Search,
  ShieldAlert,
  X
} from "lucide-react";

import {
  mutualFundCategories,
  searchMutualFunds,
  type MutualFundOption
} from "@/library/mutualfunds";

type FundSearchPickerProps = {
  value: string;
  onChange: (fundName: string, fund?: MutualFundOption) => void;
};

function riskClass(risk: string) {
  if (risk === "Low" || risk === "Low to Moderate") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (risk === "Moderate" || risk === "Moderately High") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default function FundSearchPicker({
  value,
  onChange
}: FundSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [category, setCategory] = useState("All");

  const results = useMemo(
    () => searchMutualFunds(query, category),
    [query, category]
  );

  function selectFund(fund: MutualFundOption) {
    setQuery(fund.name);
    setOpen(false);
    onChange(fund.name, fund);
  }

  function clearFund() {
    setQuery("");
    setOpen(true);
    onChange("");
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="text-sm font-bold text-slate-700">Fund name</span>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search mutual fund"
            className="w-full rounded-lg border border-slate-200 bg-white px-12 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          {query ? (
            <button
              type="button"
              onClick={clearFund}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear fund"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          )}
        </div>
      </label>

      {open ? (
        <div>
          <button
            type="button"
            aria-label="Close fund search"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 right-0 z-40 mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50 p-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mutualFundCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                      category === item
                        ? "bg-[#07111f] text-white"
                        : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[390px] overflow-auto p-2">
              {results.length > 0 ? (
                results.map((fund) => {
                  const selected = fund.name === value;

                  return (
                    <button
                      key={fund.id}
                      type="button"
                      onClick={() => selectFund(fund)}
                      className="flex w-full items-center gap-4 rounded-lg p-4 text-left transition hover:bg-blue-50"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#07111f] text-white">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-base font-black text-slate-950">
                            {fund.name}
                          </p>

                          {selected ? (
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                            {fund.amc}
                          </span>

                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            {fund.category}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${riskClass(
                              fund.risk
                            )}`}
                          >
                            <ShieldAlert className="h-3 w-3" />
                            {fund.risk}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-base font-black text-slate-950">
                    No fund found
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Try searching by AMC, category, or fund name.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}