"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BrainCircuit,
  ChevronRight,
  LineChart,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

type PredictionPoint = {
  day: number;
  predicted_nav: number;
};

type PredictionResponse = {
  fund_name: string;
  method: string;
  predictions: PredictionPoint[];
};

type NavRow = {
  id: number;
  label: string;
  nav: string;
};

type ChartDatum = {
  label: string;
  history: number | null;
  forecast: number | null;
};

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    value?: number;
    dataKey?: string;
    color?: string;
  }>;
};

const sampleRows: NavRow[] = [
  { id: 1, label: "Day -5", nav: "72.35" },
  { id: 2, label: "Day -4", nav: "72.85" },
  { id: 3, label: "Day -3", nav: "73.10" },
  { id: 4, label: "Day -2", nav: "74.20" },
  { id: 5, label: "Day -1", nav: "74.65" },
  { id: 6, label: "Today", nav: "75.00" }
];

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value);
}

function methodName(method: string) {
  if (!method) return "Moving average";
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function navClass(path: string) {
  return path === "/prediction"
    ? "bg-white text-[#07111f] shadow-sm"
    : "text-white/72 hover:bg-white/10 hover:text-white";
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
      className={`rounded-lg border border-white/60 bg-white/86 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "blue"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "blue" | "green" | "rose" | "amber";
}) {
  const colors = {
    blue: "from-blue-600 to-cyan-500 text-blue-950",
    green: "from-emerald-500 to-lime-400 text-emerald-950",
    rose: "from-rose-500 to-orange-400 text-rose-950",
    amber: "from-amber-400 to-orange-500 text-amber-950"
  };

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${colors[tone]}`} />
      <div className="p-6">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
      </div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const visible = payload.find((item) => typeof item.value === "number");

  if (!visible || typeof visible.value !== "number") return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">
        NAV {formatNumber(visible.value, 4)}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {visible.dataKey === "forecast" ? "Predicted value" : "Historical value"}
      </p>
    </div>
  );
}

export default function PredictionPage() {
  const [fundName, setFundName] = useState("Parag Parikh Flexi Cap Fund");
  const [days, setDays] = useState(14);
  const [rows, setRows] = useState<NavRow[]>(sampleRows);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navValues = useMemo(
    () =>
      rows
        .map((row) => Number(row.nav))
        .filter((value) => Number.isFinite(value) && value > 0),
    [rows]
  );

  const latestNav = navValues.at(-1) || 0;
  const firstNav = navValues[0] || 0;
  const finalPrediction = result?.predictions.at(-1)?.predicted_nav || 0;
  const forecastMove = finalPrediction && latestNav ? finalPrediction - latestNav : 0;
  const forecastMovePercent = latestNav ? (forecastMove / latestNav) * 100 : 0;
  const historyMovePercent =
    firstNav && latestNav ? ((latestNav - firstNav) / firstNav) * 100 : 0;

  const chartData = useMemo<ChartDatum[]>(() => {
    const history = navValues.map((nav, index) => ({
      label: rows[index]?.label || `NAV ${index + 1}`,
      history: nav,
      forecast: null
    }));

    if (!result || navValues.length === 0) return history;

    const forecast = [
      {
        label: "Today",
        history: latestNav,
        forecast: latestNav
      },
      ...result.predictions.map((point) => ({
        label: `Day ${point.day}`,
        history: null,
        forecast: point.predicted_nav
      }))
    ];

    return [...history, ...forecast];
  }, [latestNav, navValues, result, rows]);

  const predictionTone = forecastMove >= 0 ? "green" : "rose";
  const TrendIcon = forecastMove >= 0 ? TrendingUp : TrendingDown;

  function updateRow(id: number, key: "label" | "nav", value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
    setResult(null);
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        label: `Day ${current.length + 1}`,
        nav: ""
      }
    ]);
    setResult(null);
  }

  function removeRow(id: number) {
    if (rows.length <= 3) {
      setMessage("Prediction needs at least three NAV values.");
      return;
    }

    setRows((current) => current.filter((row) => row.id !== id));
    setResult(null);
  }

  function loadSample() {
    setFundName("Parag Parikh Flexi Cap Fund");
    setDays(14);
    setRows(sampleRows);
    setResult(null);
    setMessage("Sample NAV history loaded.");
  }

  async function runPrediction() {
    setMessage("");

    if (!fundName.trim()) {
      setMessage("Enter a fund name first.");
      return;
    }

    if (navValues.length < 3) {
      setMessage("Add at least three valid NAV values.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/analytics/predict-nav`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fund_name: fundName.trim(),
          nav_values: navValues,
          days
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Prediction failed.");
      }

      setResult(data as PredictionResponse);
      setMessage("Prediction ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-12 text-slate-950">
      <header className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(37,99,235,0.28),transparent_42%),linear-gradient(90deg,rgba(16,185,129,0.22),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-[#07111f] shadow-lg">
              <LineChart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">FundLENS</h1>
              <p className="text-sm font-medium text-white/62">
                Portfolio intelligence dashboard
              </p>
            </div>
          </Link>

          <nav className="hidden rounded-lg border border-white/12 bg-white/8 p-1 backdrop-blur md:flex">
            <Link href="/" className={`rounded-md px-4 py-2 text-sm font-bold ${navClass("/")}`}>
              Dashboard
            </Link>
            <Link
              href="/overlap"
              className={`rounded-md px-4 py-2 text-sm font-bold ${navClass("/overlap")}`}
            >
              Overlap
            </Link>
            <Link
              href="/prediction"
              className={`rounded-md px-4 py-2 text-sm font-bold ${navClass("/prediction")}`}
            >
              Prediction
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 pb-10 pt-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              <BrainCircuit className="h-4 w-4" />
              NAV Forecast Engine
            </div>
            <h2 className="mt-6 max-w-3xl text-5xl font-black leading-tight">
              Predict the next NAV move before it reaches your portfolio.
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-white/68">
              Feed recent NAV values into FundLENS and get a short-term forecast using
              moving average and trend behaviour from your backend.
            </p>
          </div>

          <div className="rounded-lg border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase text-white/50">Forecast status</p>
              <Sparkles className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4 text-slate-950">
                <p className="text-sm font-semibold text-slate-500">History points</p>
                <p className="mt-2 text-3xl font-black">{navValues.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-300 p-4 text-emerald-950">
                <p className="text-sm font-semibold">Forecast days</p>
                <p className="mt-2 text-3xl font-black">{days}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white/58">Backend route</p>
              <p className="mt-1 font-mono text-sm text-cyan-100">
                POST /analytics/predict-nav
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 px-6 lg:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-blue-600">Inputs</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                NAV history
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Add at least three NAV values in oldest to newest order.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
            >
              Sample
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Fund name</span>
              <input
                value={fundName}
                onChange={(event) => {
                  setFundName(event.target.value);
                  setResult(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Prediction days</span>
              <input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(event) => {
                  setDays(Number(event.target.value));
                  setResult(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-xs font-black uppercase text-slate-400">
                <span>Label</span>
                <span>NAV</span>
                <span />
              </div>

              <div className="mt-2 space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_36px] gap-2">
                    <input
                      value={row.label}
                      onChange={(event) =>
                        updateRow(row.id, "label", event.target.value)
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={row.nav}
                      onChange={(event) => updateRow(row.id, "nav", event.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-md border border-slate-200 bg-white text-sm font-black text-slate-500 hover:border-rose-200 hover:text-rose-600"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
            >
              Add NAV row
            </button>

            <button
              type="button"
              onClick={runPrediction}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#07111f] px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/20 hover:bg-blue-950"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              {loading ? "Running prediction..." : "Run prediction"}
            </button>

            {message && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                {message}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Latest NAV"
              value={latestNav ? formatNumber(latestNav, 4) : "--"}
              helper="Newest value entered"
              tone="blue"
            />
            <MetricCard
              label="Forecast NAV"
              value={finalPrediction ? formatNumber(finalPrediction, 4) : "--"}
              helper="Last predicted day"
              tone={predictionTone}
            />
            <MetricCard
              label="Expected move"
              value={
                result
                  ? `${forecastMove >= 0 ? "+" : ""}${formatNumber(
                      forecastMovePercent,
                      2
                    )}%`
                  : "--"
              }
              helper="From latest NAV"
              tone={predictionTone}
            />
            <MetricCard
              label="Past trend"
              value={
                navValues.length >= 2
                  ? `${historyMovePercent >= 0 ? "+" : ""}${formatNumber(
                      historyMovePercent,
                      2
                    )}%`
                  : "--"
              }
              helper="Across entered history"
              tone={historyMovePercent >= 0 ? "green" : "rose"}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-blue-600">
                  Forecast curve
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Historical NAV vs predicted NAV
                </h3>
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600" />
                  History
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Forecast
                </div>
              </div>
            </div>

            <div className="h-[390px] p-5">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData}>
                  <CartesianGrid stroke="#dbe7f5" strokeDasharray="5 5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: "#94a3b8" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: "#94a3b8" }}
                    tickLine={false}
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="history"
                    stroke="#2563eb"
                    strokeWidth={4}
                    dot={{ r: 5, fill: "#2563eb", strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#10b981"
                    strokeWidth={4}
                    strokeDasharray="7 7"
                    dot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-lg ${
                    forecastMove >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <TrendIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase text-slate-400">
                    Prediction summary
                  </p>
                  <h3 className="text-2xl font-black text-slate-950">
                    {result
                      ? forecastMove >= 0
                        ? "Positive short-term trend"
                        : "Weak short-term trend"
                      : "Waiting for prediction"}
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm font-semibold leading-7 text-slate-600">
                {result ? (
                  <>
                    <p>
                      FundLENS used{" "}
                      <span className="font-black text-slate-950">
                        {methodName(result.method)}
                      </span>{" "}
                      on your latest NAV sequence.
                    </p>
                    <p>
                      The model expects NAV to move from{" "}
                      <span className="font-black text-slate-950">
                        {formatNumber(latestNav, 4)}
                      </span>{" "}
                      to{" "}
                      <span className="font-black text-slate-950">
                        {formatNumber(finalPrediction, 4)}
                      </span>{" "}
                      over the next {days} days.
                    </p>
                  </>
                ) : (
                  <p>
                    Add recent NAV values and run prediction to see the forecast
                    direction, chart, and day-by-day values.
                  </p>
                )}
              </div>

              <Link
                href="/overlap"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                Check overlap next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/80 p-6">
                <div>
                  <p className="text-sm font-bold uppercase text-blue-600">
                    Day-by-day forecast
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">
                    Predicted NAV values
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setMessage("Prediction cleared.");
                  }}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  aria-label="Clear prediction"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>

              {result ? (
                <div className="grid max-h-[360px] gap-3 overflow-auto p-6 sm:grid-cols-2 xl:grid-cols-3">
                  {result.predictions.map((point) => (
                    <div
                      key={point.day}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-black uppercase text-slate-400">
                        Day {point.day}
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {formatNumber(point.predicted_nav, 4)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-[260px] place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-blue-50 text-blue-700">
                      <BrainCircuit className="h-8 w-8" />
                    </div>
                    <h4 className="mt-5 text-xl font-black text-slate-950">
                      No prediction yet
                    </h4>
                    <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                      Run the forecast and the predicted values will appear here.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}