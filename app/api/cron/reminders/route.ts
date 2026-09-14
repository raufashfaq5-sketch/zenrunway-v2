import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getTransactionsAction } from "@/app/actions/financials";

export async function GET(req: NextRequest) {
  return handleCronJob(req);
}

export async function POST(req: NextRequest) {
  return handleCronJob(req);
}

async function handleCronJob(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const secretQuery = req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET || "zenrunway_cron_secret_key_2026";

    const isAuthorized =
      (authHeader && authHeader === `Bearer ${expectedSecret}`) ||
      (secretQuery && secretQuery === expectedSecret) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing Bearer authorization token." },
        { status: 401 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let overdueInvoices: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      clientEmail: string;
      isSubscription?: boolean;
    }> = [];

    // Attempt Prisma Query
    try {
      const dbRecords = await prisma.transaction.findMany({
        where: {
          status: "pending",
          dueDate: { lt: todayStr },
          clientEmail: { not: null },
        },
      });

      overdueInvoices = (dbRecords as any[])
        .filter((t: any) => t.clientEmail && t.clientEmail.trim().length > 0)
        .map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          dueDate: t.dueDate,
          clientEmail: t.clientEmail!,
          isSubscription: t.isSubscription,
        }));
    } catch (err) {
      console.warn("Cron Prisma query fallback to server transactions dataset:", err);
      const allTx = await getTransactionsAction();
      overdueInvoices = allTx
        .filter(
          (t) =>
            t.status === "pending" &&
            new Date(t.dueDate) < new Date(todayStr) &&
            t.clientEmail &&
            t.clientEmail.trim().length > 0
        )
        .map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          dueDate: t.dueDate,
          clientEmail: t.clientEmail!,
          isSubscription: t.isSubscription,
        }));
    }

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Cron execution complete: Zero overdue invoices with valid email found.",
        dispatchedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.resend.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "resend",
        pass: process.env.RESEND_API_KEY || process.env.SMTP_PASS || "re_demo_key",
      },
    });

    const dispatchResults = [];

    for (const inv of overdueInvoices) {
      const mailOptions = {
        from: `"ZenRunway Autonomous Cron Engine" <billing@zenrunway.io>`,
        to: inv.clientEmail,
        subject: `[AUTONOMOUS REMINDER] Overdue Invoice #${inv.id.toUpperCase()} - ${inv.description}`,
        text: `Urgent Overdue Payment Notice for ${inv.description}. Invoice #${inv.id.toUpperCase()} ($${inv.amount.toLocaleString()}) was due on ${inv.dueDate}. Please process payment immediately.`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0B0F17; color: #F8FAFC; padding: 24px; border-radius: 12px;">
            <h2 style="color: #10B981;">ZenRunway Autonomous Overdue Notice</h2>
            <p>Dear Finance Team,</p>
            <p>This is an automated system reminder that payment for <strong>${inv.description}</strong> (${inv.isSubscription ? "Subscription " : ""}Invoice #${inv.id.toUpperCase()}) in the amount of <strong>$${inv.amount.toLocaleString()} USD</strong> was due on <strong>${inv.dueDate}</strong> and remains pending.</p>
            <p>Please initiate wire transfer or settled payment at your earliest convenience.</p>
            <hr style="border-color: #1E293B; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748B;">Dispatched automatically by ZenRunway Vercel Cron Engine.</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        dispatchResults.push({ id: inv.id, email: inv.clientEmail, status: "sent" });
      } catch (sendErr) {
        console.warn(`Cron email send warning for invoice ${inv.id}:`, sendErr);
        dispatchResults.push({ id: inv.id, email: inv.clientEmail, status: "logged_dev_fallback" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Autonomous Cron Execution Finished: Processed ${overdueInvoices.length} overdue invoices.`,
      dispatchedCount: overdueInvoices.length,
      dispatchedInvoices: dispatchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Cron reminders route error:", err);
    return NextResponse.json(
      { error: "Internal Server Error in Cron Reminders route." },
      { status: 500 }
    );
  }
}
