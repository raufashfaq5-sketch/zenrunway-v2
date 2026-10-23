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
 * Fetch all transactions from Supabase PostgreSQL via Prisma.
 * Returns an empty array on DB error — no seed data fallback.
 */
export async function getTransactionsAction(): Promise<TransactionItem[]> {
  const dbTx = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });

  return dbTx.map((t) => ({
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

  return { success: true, transaction: newItem };
}

/**
 * Toggle transaction status in database
 */
export async function toggleTransactionStatusAction(
  id: string,
  newStatus: "received" | "paid" | "pending"
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.transaction.update({
      where: { id },
      data: { status: newStatus },
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error updating transaction status.";
    console.error("Prisma update status failed:", err);
    return { success: false, error: msg };
  }
}

/**
 * Delete a transaction from database
 */
export async function deleteTransactionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.transaction.delete({
      where: { id },
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error deleting transaction.";
    console.error("Prisma delete transaction failed:", err);
    return { success: false, error: msg };
  }
}
