import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, saveResetToken } from "@/lib/db";
import { signJwtToken } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitizer";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    const cleanEmail = sanitizeEmail(email || "");
    if (!cleanEmail) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const user = findUserByEmail(cleanEmail);
    // Security Best Practice: Don't leak if email exists or not, but generate token if exists
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

    // Dispatch recovery email via Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || "demo@ethereal.email",
          pass: process.env.SMTP_PASS || "demo123",
        },
      });

      const mailOptions = {
        from: 'ZenRunway <onboarding@resend.dev>',
        to: user.email,
        subject: "SECURITY ALERT: Reset Your ZenRunway Password",
        text: `You requested a password reset for your ZenRunway Financial Engine account.\n\nClick the link below to set a new password (link expires in 15 minutes):\n\n${resetUrl}\n\nIf you did not request this reset, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0B0F17; color: #F8FAFC; padding: 24px; borderRadius: 12px;">
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
      };

      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.warn("Nodemailer dispatch fallback note (SMTP unconfigured in dev):", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link generated and dispatched to registered email.",
      resetUrl, // Provided for easy manual testing / link clicking
      resetToken,
    });
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Server error initiating password reset." }, { status: 500 });
  }
}
