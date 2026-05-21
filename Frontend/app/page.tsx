"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LineChart as LineChartIcon,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  WalletCards
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  authApi,
  portfolioApi,
  type PortfolioSummary,
  type TransactionPublic,
  type TransactionType,
  type UserPublic,
  type XIRRResponse
} from "@/lib/api";

type AuthMode = "login" | "register";

const allocationColors = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 4
});

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return currencyFormatter.format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return numberFormatter.format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return `${value.toFixed(2)}%`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

function MetricCard({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "green" | "blue" | "dark";
}) {
  const toneClass = {
    default: "bg-white/84 text-[#07111f]",
    green: "bg-[#e7fff5] text-[#052e24]",
    blue: "bg-[#eaf2ff] text-[#102b5c]",
    dark: "bg-[#07111f] text-white"
  }[tone];

  const helperClass = tone === "dark" ? "text-white/58" : "text-slate-500";

  return (
    <div className={`rounded-2xl border border-white/70 p-5 shadow-[0_14px_45px_rgba(15,23,42,0.10)] ${toneClass}`}>
      <p className={`text-sm font-semibold ${helperClass}`}>{label}</p>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <p className={`mt-1 text-sm ${helperClass}`}>{helper}</p>
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("Rachit");
  const [email, setEmail] = useState("rachit@example.com");
  const [password, setPassword] = useState("strongpass123");
  const [showPassword, setShowPassword] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [xirr, setXirr] = useState<XIRRResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionPublic[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const [fundName, setFundName] = useState("Parag Parikh Flexi Cap Fund");
  const [transactionType, setTransactionType] = useState<TransactionType>("BUY");
  const [amount, setAmount] = useState("10000");
  const [nav, setNav] = useState("75");
  const [units, setUnits] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayISO());
  const [note, setNote] = useState("First investment");

  const [selectedFundId, setSelectedFundId] = useState("");
  const [currentNav, setCurrentNav] = useState("");
  const [currentNavDate, setCurrentNavDate] = useState(todayISO());

  const sortedPositions = useMemo(() => summary?.positions || [], [summary]);
  const hasPortfolio = Boolean(summary && summary.total_transactions > 0);

  const allocationData = useMemo(() => {
    return sortedPositions
      .filter((position) => (position.current_value || 0) > 0)
      .map((position) => ({
        name: position.fund_name,
        value: position.current_value || 0
      }));
  }, [sortedPositions]);

  const valueChartData = useMemo(() => {
    return sortedPositions.map((position) => ({
      name:
        position.fund_name.length > 18
          ? `${position.fund_name.slice(0, 18)}...`
          : position.fund_name,
      invested: position.net_invested,
      current: position.current_value || 0
    }));
  }, [sortedPositions]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("fundlens_token");
    if (!savedToken) return;

    setToken(savedToken);

    authApi
      .me(savedToken)
      .then((currentUser) => {
        setUser(currentUser);
        loadPortfolio(savedToken);
      })
      .catch(() => {
        window.localStorage.removeItem("fundlens_token");
        setToken(null);
      });
  }, []);

  useEffect(() => {
    if (!selectedFundId && sortedPositions.length > 0) {
      const firstPosition = sortedPositions[0];
      setSelectedFundId(String(firstPosition.fund_id));
      setCurrentNav(
        firstPosition.current_nav !== null ? String(firstPosition.current_nav) : ""
      );
    }
  }, [selectedFundId, sortedPositions]);

  async function loadPortfolio(authToken = token) {
    if (!authToken) return;

    setPortfolioLoading(true);

    try {
      const [summaryResult, transactionResult] = await Promise.all([
        portfolioApi.summary(authToken),
        portfolioApi.transactions(authToken)
      ]);

      setSummary(summaryResult);
      setTransactions(transactionResult);

      try {
        const xirrResult = await portfolioApi.xirr(authToken);
        setXirr(xirrResult);
      } catch {
        setXirr(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load portfolio."
      );
    } finally {
      setPortfolioLoading(false);
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result =
        mode === "register"
          ? await authApi.register({ name, email, password })
          : await authApi.login({ email, password });

      window.localStorage.setItem("fundlens_token", result.access_token);
      setToken(result.access_token);
      setUser(result.user);
      setMessage(mode === "register" ? "Account created." : "Logged in.");
      await loadPortfolio(result.access_token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setLoading(true);
    setMessage("");

    try {
      await portfolioApi.addTransaction(token, {
        fund_name: fundName,
        transaction_type: transactionType,
        amount: Number(amount),
        nav: nav ? Number(nav) : undefined,
        units: units ? Number(units) : undefined,
        transaction_date: transactionDate,
        note
      });

      setMessage("Transaction added.");
      setNote("");
      await loadPortfolio(token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCurrentNav(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedFundId) return;

    setLoading(true);
    setMessage("");

    try {
      await portfolioApi.updateFundNav(token, Number(selectedFundId), {
        nav: Number(currentNav),
        date: currentNavDate
      });

      setMessage("Current NAV updated.");
      await loadPortfolio(token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update current NAV."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    if (!token) return;

    setLoading(true);
    setMessage("");

    try {
      await portfolioApi.deleteTransaction(token, transactionId);
      setMessage("Transaction deleted.");
      await loadPortfolio(token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("fundlens_token");
    setToken(null);
    setUser(null);
    setSummary(null);
    setXirr(null);
    setTransactions([]);
    setMessage("");
  }

  if (user && token) {
    return (
      <main className="min-h-screen">
        <header className="relative overflow-hidden bg-[#07111f] text-white">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.36), transparent 34%), linear-gradient(90deg, rgba(16,185,129,0.26), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.08), transparent)"
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "48px 48px"
            }}
          />

          <div className="relative mx-auto max-w-7xl px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                  <LineChartIcon size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">FundLENS</h1>
                  <p className="text-sm text-white/60">
                    Portfolio intelligence command center
                  </p>
                </div>
              </div>

              <nav className="flex items-center gap-2 rounded-full bg-white/8 p-1 ring-1 ring-white/12">
                <a href="/" className={navClass(true)}>
                  Dashboard
                </a>
                <a href="/overlap" className={navClass(false)}>
                  Overlap
                </a>
                <a href="/prediction" className={navClass(false)}>
                  Prediction
                </a>
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadPortfolio()}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/16 hover:bg-white/16"
                  aria-label="Refresh portfolio"
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  onClick={logout}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#07111f] shadow-sm hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            </div>

            <section className="grid gap-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
                  Live portfolio view
                </p>
                <h2 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
                  Track capital, return, and concentration in one sharp workspace.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/64">
                  Add investments, update NAV, inspect allocation, compare fund
                  overlap, and forecast NAV without leaving your dashboard.
                </p>
              </div>

              <div className="rounded-3xl border border-white/14 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 text-[#07111f]">
                    <p className="text-sm font-semibold text-slate-500">
                      Current value
                    </p>
                    <div className="mt-2 text-3xl font-semibold tracking-tight">
                      {formatCurrency(summary?.current_value)}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {summary?.total_funds || 0} funds
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#dcfff1] p-5 text-[#052e24]">
                    <p className="text-sm font-semibold text-[#3f6f5e]">
                      Gain / loss
                    </p>
                    <div className="mt-2 text-3xl font-semibold tracking-tight">
                      {formatCurrency(summary?.gain_loss)}
                    </div>
                    <p className="mt-1 text-sm text-[#3f6f5e]">
                      {formatPercent(summary?.gain_loss_percent)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/56">Signed in as</p>
                      <p className="text-lg font-semibold">{user.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-200">
                      <ShieldCheck size={20} />
                      <span className="text-sm font-semibold">Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Net invested"
              value={formatCurrency(summary?.net_invested)}
              helper={`${summary?.total_transactions || 0} transactions`}
              tone="blue"
            />
            <MetricCard
              label="XIRR"
              value={xirr ? `${xirr.xirr_percent.toFixed(2)}%` : "Not available"}
              helper="Annualized return"
              tone="green"
            />
            <MetricCard
              label="Total buy amount"
              value={formatCurrency(summary?.total_buy_amount)}
              helper="Before redemptions"
            />
            <MetricCard
              label="Redeemed"
              value={formatCurrency(summary?.total_redeemed_amount)}
              helper="Sell transactions"
              tone="dark"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[390px_1fr]">
            <aside className="space-y-6">
              <Card className="p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <WalletCards size={21} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#07111f]">
                        Add transaction
                      </h2>
                      <p className="text-sm text-slate-500">Buy or sell units</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Fund name
                    </span>
                    <input
                      value={fundName}
                      onChange={(event) => setFundName(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setTransactionType("BUY")}
                      className={`h-10 rounded-xl text-sm font-semibold transition ${
                        transactionType === "BUY"
                          ? "bg-[#07111f] text-white shadow-sm"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType("SELL")}
                      className={`h-10 rounded-xl text-sm font-semibold transition ${
                        transactionType === "SELL"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Amount
                      </span>
                      <input
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        min="1"
                        required
                        type="number"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        NAV
                      </span>
                      <input
                        value={nav}
                        onChange={(event) => setNav(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        min="0.01"
                        step="0.01"
                        type="number"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Units
                      </span>
                      <input
                        value={units}
                        onChange={(event) => setUnits(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        min="0.0001"
                        step="0.0001"
                        type="number"
                        placeholder="Auto"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Date
                      </span>
                      <input
                        value={transactionDate}
                        onChange={(event) =>
                          setTransactionDate(event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        required
                        type="date"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Note
                    </span>
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Optional"
                    />
                  </label>

                  <button
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07111f] px-4 font-semibold text-white shadow-[0_14px_35px_rgba(7,17,31,0.22)] transition hover:bg-[#122033]"
                  >
                    <Plus size={18} />
                    Add transaction
                  </button>
                </form>

                {message && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {message}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-[#07111f]">
                    Update current NAV
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Change latest NAV to recalculate value.
                  </p>
                </div>

                <form onSubmit={handleUpdateCurrentNav} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Fund
                    </span>
                    <select
                      value={selectedFundId}
                      onChange={(event) => {
                        const nextFundId = event.target.value;
                        setSelectedFundId(nextFundId);
                        const position = sortedPositions.find(
                          (item) => String(item.fund_id) === nextFundId
                        );
                        setCurrentNav(
                          position?.current_nav !== null &&
                            position?.current_nav !== undefined
                            ? String(position.current_nav)
                            : ""
                        );
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[#07111f] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      required
                    >
                      <option value="">Select fund</option>
                      {sortedPositions.map((position) => (
                        <option key={position.fund_id} value={position.fund_id}>
                          {position.fund_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Current NAV
                      </span>
                      <input
                        value={currentNav}
                        onChange={(event) => setCurrentNav(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        min="0.01"
                        required
                        step="0.01"
                        type="number"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        NAV date
                      </span>
                      <input
                        value={currentNavDate}
                        onChange={(event) =>
                          setCurrentNavDate(event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        required
                        type="date"
                      />
                    </label>
                  </div>

                  <button
                    disabled={loading || sortedPositions.length === 0}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white shadow-[0_14px_35px_rgba(16,185,129,0.22)] transition hover:bg-emerald-700"
                  >
                    <RefreshCw size={18} />
                    Update NAV
                  </button>
                </form>
              </Card>
            </aside>

            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Gain / loss
                  </p>
                  <div
                    className={`mt-2 flex items-center gap-2 text-3xl font-semibold ${
                      (summary?.gain_loss || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {(summary?.gain_loss || 0) >= 0 ? (
                      <TrendingUp size={26} />
                    ) : (
                      <TrendingDown size={26} />
                    )}
                    {formatCurrency(summary?.gain_loss)}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatPercent(summary?.gain_loss_percent)}
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-semibold text-slate-500">XIRR</p>
                  <div
                    className={`mt-2 text-3xl font-semibold ${
                      (xirr?.xirr_percent || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {xirr ? `${xirr.xirr_percent.toFixed(2)}%` : "N/A"}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Annualized return
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Total buy amount
                  </p>
                  <div className="mt-2 text-3xl font-semibold text-[#07111f]">
                    {formatCurrency(summary?.total_buy_amount)}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Before redemptions
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Redeemed
                  </p>
                  <div className="mt-2 text-3xl font-semibold text-[#07111f]">
                    {formatCurrency(summary?.total_redeemed_amount)}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Sell transactions
                  </p>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <div className="border-b border-slate-200/70 px-5 py-4">
                    <h2 className="text-lg font-semibold text-[#07111f]">
                      Allocation
                    </h2>
                    <p className="text-sm text-slate-500">
                      Current value split by fund
                    </p>
                  </div>

                  <div className="h-[320px] p-5">
                    {allocationData.length === 0 ? (
                      <div className="grid h-full place-items-center text-sm text-slate-500">
                        Add transactions and NAV to see allocation.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocationData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={68}
                            outerRadius={104}
                            paddingAngle={4}
                          >
                            {allocationData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  allocationColors[
                                    index % allocationColors.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="border-b border-slate-200/70 px-5 py-4">
                    <h2 className="text-lg font-semibold text-[#07111f]">
                      Invested vs current
                    </h2>
                    <p className="text-sm text-slate-500">
                      Compare cost and latest value
                    </p>
                  </div>

                  <div className="h-[320px] p-5">
                    {valueChartData.length === 0 ? (
                      <div className="grid h-full place-items-center text-sm text-slate-500">
                        Add transactions to see comparison.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={valueChartData}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                          <XAxis dataKey="name" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Bar
                            dataKey="invested"
                            fill="#2563eb"
                            name="Invested"
                            radius={[8, 8, 0, 0]}
                          />
                          <Bar
                            dataKey="current"
                            fill="#10b981"
                            name="Current"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>

              <Card>
                <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#07111f]">
                      Fund positions
                    </h2>
                    <p className="text-sm text-slate-500">
                      Current allocation and performance
                    </p>
                  </div>
                  {portfolioLoading && (
                    <span className="text-sm text-slate-500">Loading...</span>
                  )}
                </div>

                {!hasPortfolio ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    Add your first transaction to see portfolio positions.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
                          <th className="px-5 py-3 font-semibold">Fund</th>
                          <th className="px-5 py-3 font-semibold">Units</th>
                          <th className="px-5 py-3 font-semibold">Invested</th>
                          <th className="px-5 py-3 font-semibold">Current</th>
                          <th className="px-5 py-3 font-semibold">Gain</th>
                          <th className="px-5 py-3 font-semibold">Allocation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPositions.map((position) => (
                          <tr
                            key={position.fund_id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-[#07111f]">
                                {position.fund_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Avg NAV {formatNumber(position.average_buy_nav)} ·
                                Current NAV {formatNumber(position.current_nav)}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {formatNumber(position.units)}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {formatCurrency(position.net_invested)}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {formatCurrency(position.current_value)}
                            </td>
                            <td
                              className={`px-5 py-4 font-semibold ${
                                (position.gain_loss || 0) >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {formatCurrency(position.gain_loss)}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {formatPercent(position.allocation_percent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card>
                <div className="border-b border-slate-200/70 px-5 py-4">
                  <h2 className="text-lg font-semibold text-[#07111f]">
                    Recent transactions
                  </h2>
                  <p className="text-sm text-slate-500">
                    Buys and sells linked to your account
                  </p>
                </div>

                {transactions.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    No transactions yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_120px_120px_40px] md:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                transaction.transaction_type === "BUY"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {transaction.transaction_type}
                            </span>
                            <span className="font-semibold text-[#07111f]">
                              {transaction.fund.name}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {transaction.transaction_date} · NAV{" "}
                            {formatNumber(transaction.nav)} · Units{" "}
                            {formatNumber(transaction.units)}
                          </p>
                        </div>

                        <div className="font-semibold text-[#07111f]">
                          {formatCurrency(transaction.amount)}
                        </div>

                        <div className="text-sm text-slate-500">
                          {transaction.note || "No note"}
                        </div>

                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                          aria-label="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_470px]">
      <section className="relative flex min-h-[520px] items-center overflow-hidden bg-[#07111f] px-8 py-10 text-white lg:px-14">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.34), transparent 36%), linear-gradient(90deg, rgba(16,185,129,0.22), transparent 44%)"
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

        <div className="relative max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/16">
            <LineChartIcon size={18} />
            FundLENS
          </div>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Mutual fund intelligence with a dashboard that thinks with you.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
            Track investments, calculate XIRR, inspect overlap, update NAV, and
            forecast fund movement from one polished workspace.
          </p>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/16">
              <p className="text-sm text-white/58">Auth</p>
              <p className="mt-1 font-semibold">Ready</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/16">
              <p className="text-sm text-white/58">Analytics</p>
              <p className="mt-1 font-semibold">Live</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/16">
              <p className="text-sm text-white/58">Charts</p>
              <p className="mt-1 font-semibold">Included</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center bg-white/88 px-6 py-10 shadow-[0_0_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[#07111f]">
              {mode === "login" ? "Login" : "Create account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Use your local FundLENS backend running on port 8001.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                mode === "login"
                  ? "bg-white text-[#07111f] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                mode === "register"
                  ? "bg-white text-[#07111f] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[#07111f] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="you@example.com"
                type="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </span>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                <Lock className="ml-3 text-slate-500" size={18} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-[#07111f] outline-none"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="grid h-10 w-10 place-items-center text-slate-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07111f] px-4 font-semibold text-white shadow-[0_16px_42px_rgba(7,17,31,0.24)] transition hover:bg-[#122033]"
            >
              {mode === "register" ? <UserPlus size={18} /> : <LogIn size={18} />}
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Create account"
                  : "Login"}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}