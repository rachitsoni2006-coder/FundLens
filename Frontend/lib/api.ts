const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001";

export type UserPublic = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserPublic;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type TransactionType = "BUY" | "SELL";

export type FundPublic = {
  id: number;
  name: string;
  category: string | null;
  amc: string | null;
  scheme_code: string | null;
  current_nav: number | null;
  created_at: string;
};

export type TransactionPublic = {
  id: number;
  user_id: number;
  fund_id: number;
  transaction_type: TransactionType;
  amount: number;
  units: number;
  nav: number;
  transaction_date: string;
  note: string | null;
  created_at: string;
  fund: FundPublic;
};

export type TransactionCreatePayload = {
  fund_id?: number;
  fund_name?: string;
  transaction_type: TransactionType;
  amount: number;
  units?: number;
  nav?: number;
  transaction_date: string;
  note?: string;
};

export type FundPosition = {
  fund_id: number;
  fund_name: string;
  category: string | null;
  invested_amount: number;
  redeemed_amount: number;
  net_invested: number;
  units: number;
  average_buy_nav: number | null;
  current_nav: number | null;
  current_value: number | null;
  gain_loss: number | null;
  gain_loss_percent: number | null;
  allocation_percent: number | null;
};

export type PortfolioSummary = {
  total_buy_amount: number;
  total_redeemed_amount: number;
  net_invested: number;
  current_value: number | null;
  gain_loss: number | null;
  gain_loss_percent: number | null;
  total_funds: number;
  total_transactions: number;
  positions: FundPosition[];
};

export type NAVUpdatePayload = {
  date: string;
  nav: number;
};

export type XIRRResponse = {
  xirr: number;
  xirr_percent: number;
};

export type OverlapFund = {
  fund_name: string;
  holdings: Record<string, number>;
};

export type OverlapResult = {
  fund_a: string;
  fund_b: string;
  common_holdings: number;
  overlap_percent: number;
  risk_level: "Low" | "Moderate" | "High";
};

export type OverlapResponse = {
  overlap_results: OverlapResult[];
};

export type PredictionPoint = {
  day: number;
  predicted_nav: number;
};

export type PredictionResponse = {
  fund_name: string;
  method: string;
  predictions: PredictionPoint[];
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : "Something went wrong. Please try again.";

    throw new Error(message);
  }

  return data as T;
}

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload
    });
  },

  me(token: string) {
    return apiRequest<UserPublic>("/auth/me", {
      token
    });
  }
};

export const portfolioApi = {
  summary(token: string) {
    return apiRequest<PortfolioSummary>("/portfolio/summary", {
      token
    });
  },

  transactions(token: string) {
    return apiRequest<TransactionPublic[]>("/portfolio/transactions", {
      token
    });
  },

  xirr(token: string) {
    return apiRequest<XIRRResponse>("/portfolio/xirr", {
      token
    });
  },

  addTransaction(token: string, payload: TransactionCreatePayload) {
    return apiRequest<TransactionPublic>("/portfolio/transactions", {
      method: "POST",
      token,
      body: payload
    });
  },

  deleteTransaction(token: string, transactionId: number) {
    return apiRequest<void>(`/portfolio/transactions/${transactionId}`, {
      method: "DELETE",
      token
    });
  },

  updateFundNav(token: string, fundId: number, payload: NAVUpdatePayload) {
    return apiRequest(`/funds/${fundId}/nav`, {
      method: "POST",
      token,
      body: payload
    });
  }
};

export const analyticsApi = {
  overlap(funds: OverlapFund[]) {
    return apiRequest<OverlapResponse>("/analytics/overlap", {
      method: "POST",
      body: { funds }
    });
  },

  predictNav(payload: {
    fund_name: string;
    nav_values: number[];
    days: number;
  }) {
    return apiRequest<PredictionResponse>("/analytics/predict-nav", {
      method: "POST",
      body: payload
    });
  }
};