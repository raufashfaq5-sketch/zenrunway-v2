import { NextResponse } from "next/server";
import { Resend } from "resend";
import { signJwtToken } from "@/lib/auth";
import { saveResetToken, findUserByEmail } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: RESEND_API_KEY environment variable is missing.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // Generate secure time-limited JWT reset token & save to database
    const user = findUserByEmail(email);
    const resetToken = signJwtToken({ userId: user?.id || "usr-reset", email }, "15m");
    saveResetToken(email, resetToken, 15 * 60 * 1000);

    const resetLink = `https://zenrunway-v2-zenway1.vercel.app/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;

    console.log("Attempting to send email via Resend to:", email, "with link:", resetLink);

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Reset Your Password - ZenRunway",
      html: `
        <p>Hello,</p>
        <p>You requested a password reset for your ZenRunway account.</p>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
      `,
    });

    if (error) {
      console.error("RESEND API ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("RESEND SUCCESS:", data);
    return NextResponse.json({ success: true, id: data?.id, resetToken, resetLink });
  } catch (err: any) {
    console.error("UNHANDLED FORGOT PASSWORD ERROR:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
