"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Copy,
  Layers,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion
} from "lucide-react";

import {
  analyticsApi,
  type OverlapFund,
  type OverlapResult
} from "@/lib/api";

type HoldingRow = {
  company: string;
  weight: string;
};

const sampleFundA: HoldingRow[] = [
  { company: "HDFC Bank", weight: "8.5" },
  { company: "ICICI Bank", weight: "7.2" },
  { company: "Infosys", weight: "5.4" },
  { company: "Reliance Industries", weight: "6.1" },
  { company: "Larsen & Toubro", weight: "3.8" }
];

const sampleFundB: HoldingRow[] = [
  { company: "HDFC Bank", weight: "7.9" },
  { company: "Axis Bank", weight: "5.2" },
  { company: "Infosys", weight: "4.8" },
  { company: "Reliance Industries", weight: "5.5" },
  { company: "Bharti Airtel", weight: "4.1" }
];

function rowsToHoldings(rows: HoldingRow[]) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const company = row.company.trim();
    const weight = Number(row.weight);

    if (company && weight > 0) {
      result[company] = weight;
    }

    return result;
  }, {});
}

function riskStyles(risk: OverlapResult["risk_level"]) {
  if (risk === "Low") {
    return {
      icon: ShieldCheck,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200"
    };
  }

  if (risk === "Moderate") {
    return {
      icon: ShieldQuestion,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200"
    };
  }

  return {
    icon: ShieldAlert,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200"
  };
}

function navClass(active: boolean) {
  return active
    ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#07111f] shadow-sm"
    : "rounded-full px-4 py-2 text-sm font-semibold text-white/72 hover:bg-white/10 hover:text-white";
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/70 bg-white/82 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function HoldingEditor({
  title,
  rows,
  onChange
}: {
  title: string;
  rows: HoldingRow[];
  onChange: (rows: HoldingRow[]) => void;
}) {
  function updateRow(index: number, field: keyof HoldingRow, value: string) {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addRow() {
    onChange([...rows, { company: "", weight: "" }]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <Card>
      <div className="border-b border-slate-200/70 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#07111f]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add top holdings and allocation weight.
        </p>
      </div>

      <div className="space-y-3 p-5">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_100px_38px] gap-2">
            <input
              value={row.company}
              onChange={(event) =>
                updateRow(index, "company", event.target.value)
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Company"
            />

            <input
              value={row.weight}
              onChange={(event) =>
                updateRow(index, "weight", event.target.value)
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              min="0"
              step="0.01"
              type="number"
              placeholder="%"
            />

            <button
              type="button"
              onClick={() => removeRow(index)}
              className="h-10 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50"
            >
              x
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="h-10 w-full rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Add holding
        </button>
      </div>
    </Card>
  );
}

export default function OverlapPage() {
  const [fundAName, setFundAName] = useState("Fund A");
  const [fundBName, setFundBName] = useState("Fund B");
  const [fundARows, setFundARows] = useState<HoldingRow[]>(sampleFundA);
  const [fundBRows, setFundBRows] = useState<HoldingRow[]>(sampleFundB);
  const [result, setResult] = useState<OverlapResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fundAHoldings = useMemo(() => rowsToHoldings(fundARows), [fundARows]);
  const fundBHoldings = useMemo(() => rowsToHoldings(fundBRows), [fundBRows]);

  async function calculateOverlap() {
    setLoading(true);
    setMessage("");

    const funds: OverlapFund[] = [
      {
        fund_name: fundAName || "Fund A",
        holdings: fundAHoldings
      },
      {
        fund_name: fundBName || "Fund B",
        holdings: fundBHoldings
      }
    ];

    try {
      const response = await analyticsApi.overlap(funds);
      setResult(response.overlap_results[0] || null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not calculate overlap."
      );
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setFundAName("Parag Parikh Flexi Cap Fund");
    setFundBName("Axis Flexi Cap Fund");
    setFundARows(sampleFundA);
    setFundBRows(sampleFundB);
    setResult(null);
    setMessage("");
  }

  const risk = result ? riskStyles(result.risk_level) : null;
  const RiskIcon = risk?.icon;

  return (
    <main className="min-h-screen">
      <header className="relative overflow-hidden bg-[#07111f] text-white">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.34), transparent 36%), linear-gradient(90deg, rgba(245,158,11,0.22), transparent 44%)"
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
            backgroundSize: "46px 46px"
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                <Layers size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">FundLENS</h1>
                <p className="text-sm text-white/60">Fund overlap analysis</p>
              </div>
            </div>

            <nav className="flex items-center gap-2 rounded-full bg-white/8 p-1 ring-1 ring-white/12">
              <Link href="/" className={navClass(false)}>
                Dashboard
              </Link>
              <Link href="/overlap" className={navClass(true)}>
                Overlap
              </Link>
              <Link href="/prediction" className={navClass(false)}>
                Prediction
              </Link>
            </nav>
          </div>

          <section className="grid gap-6 py-10 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Diversification scan
              </p>
              <h2 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
                Find hidden concentration before adding another fund.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/64">
                Compare holdings, discover common stocks, and classify overlap
                risk with a clear low, moderate, or high signal.
              </p>
            </div>

            <div className="rounded-3xl border border-white/14 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-sm text-white/58">Current result</p>
              <div className="mt-2 text-4xl font-semibold">
                {result ? `${result.overlap_percent.toFixed(2)}%` : "--"}
              </div>
              <p className="mt-1 text-sm text-white/58">
                {result
                  ? `${result.common_holdings} common holdings`
                  : "Run a comparison to see overlap"}
              </p>
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_300px]">
          <Card className="p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Fund A name
              </span>
              <input
                value={fundAName}
                onChange={(event) => setFundAName(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
          </Card>

          <Card className="p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Fund B name
              </span>
              <input
                value={fundBName}
                onChange={(event) => setFundBName(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
          </Card>

          <Card className="flex gap-3 p-4">
            <button
              type="button"
              onClick={calculateOverlap}
              disabled={loading}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#07111f] px-4 font-semibold text-white shadow-[0_14px_35px_rgba(7,17,31,0.22)] transition hover:bg-[#122033]"
            >
              <BarChart3 size={18} />
              {loading ? "Checking" : "Calculate"}
            </button>

            <button
              type="button"
              onClick={loadSample}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-blue-700 hover:bg-blue-50"
              aria-label="Load sample data"
            >
              <Copy size={18} />
            </button>
          </Card>
        </div>

        {result && risk && RiskIcon && (
          <section
            className={`mb-6 rounded-3xl border ${risk.border} ${risk.bg} p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)]`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {result.fund_a} vs {result.fund_b}
                </p>
                <h2 className="mt-2 text-6xl font-semibold tracking-tight text-[#07111f]">
                  {result.overlap_percent.toFixed(2)}%
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {result.common_holdings} common holdings
                </p>
              </div>

              <div className={`flex items-center gap-3 ${risk.color}`}>
                <RiskIcon size={44} />
                <div>
                  <p className="text-sm text-slate-500">Risk level</p>
                  <p className="text-4xl font-semibold">{result.risk_level}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <HoldingEditor
            title="Fund A holdings"
            rows={fundARows}
            onChange={setFundARows}
          />
          <HoldingEditor
            title="Fund B holdings"
            rows={fundBRows}
            onChange={setFundBRows}
          />
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white/82 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur-xl">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}