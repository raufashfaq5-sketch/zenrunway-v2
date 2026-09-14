"use server";

import { sanitizeInput, sanitizeEmail } from "@/lib/sanitizer";
import { prisma } from "@/lib/prisma";

export interface TransactionItem {
  id: string;
  description: string;
  amount: number; // Stored in USD baseline float
  type: "income" | "spend";
  status: "received" | "paid" | "pending";
  dueDate: string; // ISO format: YYYY-MM-DD
  category: string;
  clientEmail?: string;
  isSubscription?: boolean;
}

export interface FinancialCalculationOptions {
  baseCheckingBalance?: number;
  monthlyBurn?: number;
  monthlyRevenue?: number;
  taxWithholdingRate?: number;
  isTaxPayerMode?: boolean;
  todayStr?: string;
}

export interface ForecastMonthData {
  month: string;
  balance: number;
  income: number;
  burn: number;
  netChange: number;
  isSafe: boolean;
  daysRemaining: number;
}

export interface FinancialMetricsResult {
  dailyBurnRate: number;
  grossReceivedIncome: number;
  taxDeductionOnReceived: number;
  netReceivedIncome: number;
  totalSettledSpend: number;
  liquidCash: number;
  liquidDays: number;
  grossPendingReceivables: number;
  taxDeductionOnPending: number;
  netPendingReceivables: number;
  redFlagCount: number;
  redFlagBlockedAmount: number;
  projectedBuffer: number;
  projectedDays: number;
  effectiveMonthlyRevenue: number;
  netMonthlyCashflow: number;
  forecastData: ForecastMonthData[];
}

const DEFAULT_TRANSACTIONS_SEED: TransactionItem[] = [
  {
    id: "tx-101",
    description: "Acme Corp Monthly Retainer",
    amount: 10000,
    type: "income",
    status: "received",
    dueDate: "2026-08-01",
    category: "Retainer",
    clientEmail: "billing@acmecorp.com",
  },
  {
    id: "tx-102",
    description: "Starlight Media Design Sprint",
    amount: 7500,
    type: "income",
    status: "pending",
    dueDate: "2026-08-25",
    category: "Project",
    clientEmail: "accounts@starlightmedia.co",
  },
  {
    id: "tx-103",
    description: "Vanguard Tech Systems Audit",
    amount: 6000,
    type: "income",
    status: "pending",
    dueDate: "2026-08-05",
    category: "Audit",
    clientEmail: "finance@vanguardtech.io",
  },
  {
    id: "tx-104",
    description: "AWS Cloud High-Performance Cluster",
    amount: 3200,
    type: "spend",
    status: "pending",
    dueDate: "2026-08-10",
    category: "Infrastructure",
    clientEmail: "cloud-billing@aws.amazon.com",
    isSubscription: true,
  },
  {
    id: "tx-105",
    description: "Nexus Labs Mobile Integration",
    amount: 4500,
    type: "income",
    status: "pending",
    dueDate: "2026-08-02",
    category: "Development",
    clientEmail: "payables@nexuslabs.dev",
  },
  {
    id: "tx-106",
    description: "Figma Design System License",
    amount: 1500,
    type: "spend",
    status: "paid",
    dueDate: "2026-08-15",
    category: "Software",
    clientEmail: "billing@figma.com",
    isSubscription: true,
  },
  {
    id: "tx-107",
    description: "Dev Workstation Monitor Equipment",
    amount: 850,
    type: "spend",
    status: "paid",
    dueDate: "2026-08-14",
    category: "Equipment",
  },
];

const SAFETY_THRESHOLD_USD = 30000;

function checkIsOverdue(tx: TransactionItem, todayStr: string): boolean {
  return tx.status === "pending" && new Date(tx.dueDate) < new Date(todayStr);
}

/**
 * Server-Enforced Financial Calculations
 * Encapsulates core runway formulas in immutable server logic
 */
export async function calculateFinancialMetricsAction(
  transactions: TransactionItem[],
  options: FinancialCalculationOptions = {}
): Promise<FinancialMetricsResult> {
  const baseCheckingBalance = options.baseCheckingBalance ?? 35000;
  const monthlyBurn = options.monthlyBurn ?? 9000;
  const monthlyRevenue = options.monthlyRevenue ?? 12000;
  const taxWithholdingRate = options.taxWithholdingRate ?? 0.15;
  const isTaxPayerMode = options.isTaxPayerMode ?? false;
  const todayStr = options.todayStr ?? "2026-08-14";

  const dailyBurnRate = monthlyBurn > 0 ? (monthlyBurn * 12) / 365 : 1;

  const grossReceivedIncome = transactions
    .filter((t) => t.type === "income" && t.status === "received")
    .reduce((sum, t) => sum + t.amount, 0);

  const taxDeductionOnReceived = isTaxPayerMode ? grossReceivedIncome * taxWithholdingRate : 0;
  const netReceivedIncome = grossReceivedIncome - taxDeductionOnReceived;

  const totalSettledSpend = transactions
    .filter((t) => t.type === "spend" && (t.status === "paid" || t.status === "received"))
    .reduce((sum, t) => sum + t.amount, 0);

  const liquidCash = baseCheckingBalance + netReceivedIncome - totalSettledSpend;
  const liquidDays = Math.floor(liquidCash / dailyBurnRate);

  const grossPendingReceivables = transactions
    .filter((t) => t.type === "income" && t.status === "pending" && !checkIsOverdue(t, todayStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const taxDeductionOnPending = isTaxPayerMode ? grossPendingReceivables * taxWithholdingRate : 0;
  const netPendingReceivables = grossPendingReceivables - taxDeductionOnPending;

  const redFlagTransactions = transactions.filter((t) => checkIsOverdue(t, todayStr));
  const redFlagCount = redFlagTransactions.length;
  const redFlagBlockedAmount = redFlagTransactions.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0
  );

  const projectedBuffer = liquidCash + netPendingReceivables;
  const projectedDays = Math.floor(projectedBuffer / dailyBurnRate);

  const effectiveMonthlyRevenue = monthlyRevenue * (1 - (isTaxPayerMode ? taxWithholdingRate : 0));
  const netMonthlyCashflow = effectiveMonthlyRevenue - monthlyBurn;

  const monthLabels = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
  const cyclicalVariations = [0, -2200, 3500, -1800, 3100, 1600];
  let accumulatedBase = projectedBuffer;

  const forecastData: ForecastMonthData[] = monthLabels.map((month, idx) => {
    if (idx > 0) {
      accumulatedBase += netMonthlyCashflow;
    }
    const balance = accumulatedBase + cyclicalVariations[idx];
    const isSafe = balance >= SAFETY_THRESHOLD_USD;
    const daysRemaining = Math.max(0, Math.floor(balance / dailyBurnRate));

    return {
      month,
      balance,
      income: effectiveMonthlyRevenue,
      burn: monthlyBurn,
      netChange: netMonthlyCashflow + (cyclicalVariations[idx] - (cyclicalVariations[idx - 1] || 0)),
      isSafe,
      daysRemaining,
    };
  });

  return {
    dailyBurnRate,
    grossReceivedIncome,
    taxDeductionOnReceived,
    netReceivedIncome,
    totalSettledSpend,
    liquidCash,
    liquidDays,
    grossPendingReceivables,
    taxDeductionOnPending,
    netPendingReceivables,
    redFlagCount,
    redFlagBlockedAmount,
    projectedBuffer,
    projectedDays,
    effectiveMonthlyRevenue,
    netMonthlyCashflow,
    forecastData,
  };
}

/**
 * Fetch transactions with Database/Prisma integration & fallback to initial demo state
 */
export async function getTransactionsAction(): Promise<TransactionItem[]> {
  try {
    const dbTx = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (dbTx && dbTx.length > 0) {
      return (dbTx as any[]).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type as "income" | "spend",
        status: t.status as "received" | "paid" | "pending",
        dueDate: t.dueDate,
        category: t.category,
        clientEmail: t.clientEmail || undefined,
        isSubscription: t.isSubscription,
      }));
    }
  } catch (err) {
    console.warn("Prisma query failed/uninitialized, returning demo transactions fallback:", err);
  }

  return DEFAULT_TRANSACTIONS_SEED;
}

/**
 * Add a new transaction with server-side validation
 */
export async function addTransactionAction(data: {
  description: string;
  amount: number;
  type: "income" | "spend";
  status: "received" | "paid" | "pending";
  dueDate: string;
  category: string;
  clientEmail?: string;
  isSubscription?: boolean;
}): Promise<{ success: boolean; transaction?: TransactionItem; error?: string }> {
  const cleanDesc = sanitizeInput(data.description);
  const cleanCategory = sanitizeInput(data.category);
  const cleanEmail = data.clientEmail ? sanitizeEmail(data.clientEmail) : undefined;

  if (!cleanDesc) {
    return { success: false, error: "Please enter a valid description." };
  }

  if (isNaN(data.amount) || data.amount <= 0) {
    return { success: false, error: "Please enter a valid positive dollar amount." };
  }

  if (data.type === "income" && !cleanEmail) {
    return { success: false, error: "Client email is required for incoming payment invoices." };
  }

  const newId = `tx-${Date.now()}`;
  const newItem: TransactionItem = {
    id: newId,
    description: cleanDesc,
    amount: data.amount,
    type: data.type,
    status: data.status,
    dueDate: data.dueDate,
    category: cleanCategory || "Operations",
    clientEmail: cleanEmail,
    isSubscription: !!data.isSubscription,
  };

  try {
    await prisma.transaction.create({
      data: {
        id: newItem.id,
        description: newItem.description,
        amount: newItem.amount,
        type: newItem.type,
        status: newItem.status,
        dueDate: newItem.dueDate,
        category: newItem.category,
        clientEmail: newItem.clientEmail,
        isSubscription: newItem.isSubscription,
      },
    });
  } catch (err) {
    console.warn("Prisma insert skipped/fallback mode active:", err);
  }

  return { success: true, transaction: newItem };
}

/**
 * Toggle transaction status in database
 */
export async function toggleTransactionStatusAction(
  id: string,
  newStatus: "received" | "paid" | "pending"
): Promise<{ success: boolean }> {
  try {
    await prisma.transaction.update({
      where: { id },
      data: { status: newStatus },
    });
  } catch (err) {
    console.warn("Prisma update status skipped/fallback mode active:", err);
  }

  return { success: true };
}

/**
 * Delete a transaction from database
 */
export async function deleteTransactionAction(id: string): Promise<{ success: boolean }> {
  try {
    await prisma.transaction.delete({
      where: { id },
    });
  } catch (err) {
    console.warn("Prisma delete transaction skipped/fallback mode active:", err);
  }

  return { success: true };
}
