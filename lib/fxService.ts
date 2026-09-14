export interface FxRateResult {
  rate: number;
  tier: 1 | 2 | 3;
  source: string;
  updatedAt: string;
}

const STATIC_FALLBACK_PKR_RATE = 278;

/**
 * Multi-Tier Resilient FX Service for USD to PKR conversion
 * Tier 1: Primary FX Market API (https://api.exchangerate-api.com/v4/latest/USD) cached for 60 mins
 * Tier 2: Secondary API (https://open.er-api.com/v6/latest/USD) if Tier 1 fails or returns non-200
 * Tier 3: Static fallback baseline (278 PKR / USD)
 */
export async function getUSDToPKRRate(): Promise<FxRateResult> {
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // --- TIER 1: Primary FX Market API ---
  try {
    const res1 = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 3600 }, // Cached for 60 minutes
    });

    if (res1.ok) {
      const data1 = await res1.json();
      if (data1?.rates?.PKR && typeof data1.rates.PKR === "number") {
        const rate = Math.round(data1.rates.PKR * 100) / 100;
        return {
          rate,
          tier: 1,
          source: "Primary FX Market API (api.exchangerate-api.com)",
          updatedAt: timestamp,
        };
      }
    }
  } catch (err) {
    console.warn("FX Service Tier 1 Primary API failed, trying Tier 2 fallback:", err);
  }

  // --- TIER 2: Secondary FX API ---
  try {
    const res2 = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2?.rates?.PKR && typeof data2.rates.PKR === "number") {
        const rate = Math.round(data2.rates.PKR * 100) / 100;
        return {
          rate,
          tier: 2,
          source: "Secondary FX API (open.er-api.com)",
          updatedAt: timestamp,
        };
      }
    }
  } catch (err) {
    console.warn("FX Service Tier 2 Secondary API failed, switching to Tier 3 Static Baseline:", err);
  }

  // --- TIER 3: Static Baseline Fallback ---
  return {
    rate: STATIC_FALLBACK_PKR_RATE,
    tier: 3,
    source: "Static Fallback Baseline (1 USD = 278 PKR)",
    updatedAt: timestamp,
  };
}
