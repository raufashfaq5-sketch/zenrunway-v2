import { NextRequest, NextResponse } from "next/server";
import { TransactionItem } from "@/app/page";
import { sanitizeInput } from "@/lib/sanitizer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transactions,
      baseCheckingBalance = 35000,
      monthlyBurn = 9000,
      taxWithholdingRate = 0.15,
      isTaxPayerMode = false,
    } = body;

    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: "Invalid transaction ledger payload." }, { status: 400 });
    }

    // 1. Sanitize & Audit Each Transaction Server-Side
    const sanitizedTransactions: TransactionItem[] = transactions.map((t: Partial<TransactionItem>) => {
      const rawAmount = t.amount;
      const amount = Math.max(0, typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount)) || 0);
      return {
        id: sanitizeInput(t.id || `tx-${Date.now()}`),
        description: sanitizeInput(t.description || "Untitled Transaction"),
        amount,
        type: t.type === "spend" ? "spend" : "income",
        status: t.status === "paid" ? "paid" : t.status === "received" ? "received" : "pending",
        dueDate: sanitizeInput(t.dueDate || new Date().toISOString().split("T")[0]),
        category: sanitizeInput(t.category || "General"),
        clientEmail: t.clientEmail ? sanitizeInput(t.clientEmail) : undefined,
        isSubscription: Boolean(t.isSubscription),
      };
    });

    // 2. Authoritative Server-Side Calculation of All Metrics
    const dailyBurnRate = monthlyBurn > 0 ? (monthlyBurn * 12) / 365 : 1;

    const grossReceivedIncome = sanitizedTransactions
      .filter((t) => t.type === "income" && t.status === "received")
      .reduce((sum, t) => sum + t.amount, 0);

    const taxDeductionOnReceived = isTaxPayerMode ? grossReceivedIncome * taxWithholdingRate : 0;
    const netReceivedIncome = grossReceivedIncome - taxDeductionOnReceived;

    const totalSettledSpend = sanitizedTransactions
      .filter((t) => t.type === "spend" && (t.status === "paid" || t.status === "received"))
      .reduce((sum, t) => sum + t.amount, 0);

    const liquidCash = baseCheckingBalance + netReceivedIncome - totalSettledSpend;
    const liquidDays = Math.floor(liquidCash / dailyBurnRate);

    const grossPendingReceivables = sanitizedTransactions
      .filter((t) => t.type === "income" && t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const taxDeductionOnPending = isTaxPayerMode ? grossPendingReceivables * taxWithholdingRate : 0;
    const netPendingReceivables = grossPendingReceivables - taxDeductionOnPending;

    const projectedBuffer = liquidCash + netPendingReceivables;
    const projectedDays = Math.floor(projectedBuffer / dailyBurnRate);

    return NextResponse.json({
      success: true,
      validatedMetrics: {
        liquidCash,
        liquidDays,
        grossReceivedIncome,
        netReceivedIncome,
        totalSettledSpend,
        projectedBuffer,
        projectedDays,
        dailyBurnRate,
        sanitizedTransactions,
      },
    });
  } catch (err: unknown) {
    console.error("Server Financial Validation Error:", err);
    return NextResponse.json({ error: "Server financial validation failed." }, { status: 500 });
  }
}
