export type MutualFundRisk =
  | "Low"
  | "Low to Moderate"
  | "Moderate"
  | "Moderately High"
  | "High"
  | "Very High";

export type MutualFundOption = {
  id: string;
  name: string;
  amc: string;
  category: string;
  risk: MutualFundRisk;
  tags: string[];
};

export const mutualFunds: MutualFundOption[] = [
  {
    id: "ppfas-flexi-cap",
    name: "Parag Parikh Flexi Cap Fund",
    amc: "PPFAS Mutual Fund",
    category: "Flexi Cap",
    risk: "Very High",
    tags: ["equity", "flexi cap", "global", "long term"]
  },
  {
    id: "hdfc-flexi-cap",
    name: "HDFC Flexi Cap Fund",
    amc: "HDFC Mutual Fund",
    category: "Flexi Cap",
    risk: "Very High",
    tags: ["equity", "flexi cap"]
  },
  {
    id: "kotak-flexicap",
    name: "Kotak Flexicap Fund",
    amc: "Kotak Mahindra Mutual Fund",
    category: "Flexi Cap",
    risk: "Very High",
    tags: ["equity", "flexi cap"]
  },
  {
    id: "uti-nifty-50-index",
    name: "UTI Nifty 50 Index Fund",
    amc: "UTI Mutual Fund",
    category: "Index Fund",
    risk: "Very High",
    tags: ["index", "nifty 50", "passive"]
  },
  {
    id: "hdfc-index-nifty-50",
    name: "HDFC Index Fund Nifty 50 Plan",
    amc: "HDFC Mutual Fund",
    category: "Index Fund",
    risk: "Very High",
    tags: ["index", "nifty 50", "passive"]
  },
  {
    id: "icici-nifty-50-index",
    name: "ICICI Prudential Nifty 50 Index Fund",
    amc: "ICICI Prudential Mutual Fund",
    category: "Index Fund",
    risk: "Very High",
    tags: ["index", "nifty 50", "passive"]
  },
  {
    id: "sbi-bluechip",
    name: "SBI Bluechip Fund",
    amc: "SBI Mutual Fund",
    category: "Large Cap",
    risk: "Very High",
    tags: ["equity", "large cap", "bluechip"]
  },
  {
    id: "mirae-large-cap",
    name: "Mirae Asset Large Cap Fund",
    amc: "Mirae Asset Mutual Fund",
    category: "Large Cap",
    risk: "Very High",
    tags: ["equity", "large cap"]
  },
  {
    id: "nippon-large-cap",
    name: "Nippon India Large Cap Fund",
    amc: "Nippon India Mutual Fund",
    category: "Large Cap",
    risk: "Very High",
    tags: ["equity", "large cap"]
  },
  {
    id: "axis-bluechip",
    name: "Axis Bluechip Fund",
    amc: "Axis Mutual Fund",
    category: "Large Cap",
    risk: "Very High",
    tags: ["equity", "large cap", "bluechip"]
  },
  {
    id: "motilal-midcap",
    name: "Motilal Oswal Midcap Fund",
    amc: "Motilal Oswal Mutual Fund",
    category: "Mid Cap",
    risk: "Very High",
    tags: ["equity", "mid cap"]
  },
  {
    id: "hdfc-mid-cap-opportunities",
    name: "HDFC Mid-Cap Opportunities Fund",
    amc: "HDFC Mutual Fund",
    category: "Mid Cap",
    risk: "Very High",
    tags: ["equity", "mid cap"]
  },
  {
    id: "kotak-emerging-equity",
    name: "Kotak Emerging Equity Fund",
    amc: "Kotak Mahindra Mutual Fund",
    category: "Mid Cap",
    risk: "Very High",
    tags: ["equity", "mid cap"]
  },
  {
    id: "sbi-small-cap",
    name: "SBI Small Cap Fund",
    amc: "SBI Mutual Fund",
    category: "Small Cap",
    risk: "Very High",
    tags: ["equity", "small cap"]
  },
  {
    id: "nippon-small-cap",
    name: "Nippon India Small Cap Fund",
    amc: "Nippon India Mutual Fund",
    category: "Small Cap",
    risk: "Very High",
    tags: ["equity", "small cap"]
  },
  {
    id: "axis-small-cap",
    name: "Axis Small Cap Fund",
    amc: "Axis Mutual Fund",
    category: "Small Cap",
    risk: "Very High",
    tags: ["equity", "small cap"]
  },
  {
    id: "quant-small-cap",
    name: "Quant Small Cap Fund",
    amc: "Quant Mutual Fund",
    category: "Small Cap",
    risk: "Very High",
    tags: ["equity", "small cap"]
  },
  {
    id: "icici-value-discovery",
    name: "ICICI Prudential Value Discovery Fund",
    amc: "ICICI Prudential Mutual Fund",
    category: "Value Fund",
    risk: "Very High",
    tags: ["equity", "value"]
  },
  {
    id: "hdfc-balanced-advantage",
    name: "HDFC Balanced Advantage Fund",
    amc: "HDFC Mutual Fund",
    category: "Hybrid",
    risk: "Very High",
    tags: ["hybrid", "balanced advantage"]
  },
  {
    id: "icici-balanced-advantage",
    name: "ICICI Prudential Balanced Advantage Fund",
    amc: "ICICI Prudential Mutual Fund",
    category: "Hybrid",
    risk: "High",
    tags: ["hybrid", "balanced advantage"]
  },
  {
    id: "sbi-equity-hybrid",
    name: "SBI Equity Hybrid Fund",
    amc: "SBI Mutual Fund",
    category: "Hybrid",
    risk: "Very High",
    tags: ["hybrid", "equity hybrid"]
  },
  {
    id: "hdfc-corporate-bond",
    name: "HDFC Corporate Bond Fund",
    amc: "HDFC Mutual Fund",
    category: "Debt",
    risk: "Moderate",
    tags: ["debt", "corporate bond"]
  },
  {
    id: "icici-corporate-bond",
    name: "ICICI Prudential Corporate Bond Fund",
    amc: "ICICI Prudential Mutual Fund",
    category: "Debt",
    risk: "Moderate",
    tags: ["debt", "corporate bond"]
  },
  {
    id: "sbi-liquid",
    name: "SBI Liquid Fund",
    amc: "SBI Mutual Fund",
    category: "Liquid",
    risk: "Low to Moderate",
    tags: ["debt", "liquid"]
  },
  {
    id: "hdfc-liquid",
    name: "HDFC Liquid Fund",
    amc: "HDFC Mutual Fund",
    category: "Liquid",
    risk: "Low to Moderate",
    tags: ["debt", "liquid"]
  }
];

export const mutualFundCategories = [
  "All",
  "Flexi Cap",
  "Large Cap",
  "Mid Cap",
  "Small Cap",
  "Index Fund",
  "Value Fund",
  "Hybrid",
  "Debt",
  "Liquid"
];

export function searchMutualFunds(query: string, category = "All") {
  const normalizedQuery = query.trim().toLowerCase();

  return mutualFunds
    .filter((fund) => {
      const matchesCategory = category === "All" || fund.category === category;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      const searchText = [
        fund.name,
        fund.amc,
        fund.category,
        fund.risk,
        ...fund.tags
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchText.includes(normalizedQuery);
    })
    .slice(0, 12);
}