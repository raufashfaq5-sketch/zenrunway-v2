import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, saveResetToken } from "@/lib/db";
import { signJwtToken } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitizer";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    const cleanEmail = sanitizeEmail(email || "");
    if (!cleanEmail) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND EXECUTION ERROR: process.env.RESEND_API_KEY is undefined");
      return NextResponse.json(
        { error: "RESEND_API_KEY is undefined in environment variables." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const user = findUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been dispatched.",
      });
    }

    // Generate secure time-limited JWT reset token (expires in 15 minutes)
    const resetToken = signJwtToken({ userId: user.id, email: user.email }, "15m");
    saveResetToken(user.email, resetToken, 15 * 60 * 1000);

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/?resetToken=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

    console.log("BEFORE RESEND EMAIL SEND: Initiating email dispatch to", user.email);

    let data, error;
    try {
      const resendResponse = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: user.email,
        subject: "SECURITY ALERT: Reset Your ZenRunway Password",
        text: `You requested a password reset for your ZenRunway Financial Engine account.\n\nClick the link below to set a new password (link expires in 15 minutes):\n\n${resetUrl}\n\nIf you did not request this reset, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0B0F17; color: #F8FAFC; padding: 24px; border-radius: 12px;">
            <h2 style="color: #10B981; margin-top: 0;">ZenRunway Security Alert</h2>
            <p>You requested a password reset for your ZenRunway Financial Engine account.</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #10B981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password Now
              </a>
            </p>
            <p style="font-size: 12px; color: #94A3B8;">Or copy and paste this secure link into your browser:</p>
            <p style="font-size: 11px; font-family: monospace; color: #38BDF8; word-break: break-all;">${resetUrl}</p>
            <hr style="border-color: #1E293B; margin-top: 24px;" />
            <p style="font-size: 11px; color: #64748B;">This link is time-limited and expires in 15 minutes. If you did not request a password reset, no action is required.</p>
          </div>
        `,
      });
      data = resendResponse.data;
      error = resendResponse.error;
      console.log("AFTER RESEND EMAIL SEND: Resend response received:", { data, error });
    } catch (catchErr: any) {
      console.error("RESEND EXECUTION ERROR:", catchErr);
      return NextResponse.json(
        { error: catchErr?.message || "Failed to send email via Resend." },
        { status: 500 }
      );
    }

    if (error) {
      console.error("RESEND EXECUTION ERROR:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send email via Resend." },
        { status: 500 }
      );
    }

    if (!data?.id) {
      const missingIdError = { message: "Resend did not return a valid email ID." };
      console.error("RESEND EXECUTION ERROR:", missingIdError);
      return NextResponse.json(
        { error: missingIdError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link generated and dispatched to registered email.",
      id: data.id,
      resetUrl,
      resetToken,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Server error initiating password reset." }, { status: 500 });
  }
}


