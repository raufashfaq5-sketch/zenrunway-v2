import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveResetToken } from "@/lib/db";

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

    // Generate a random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP temporarily with user email (valid for 15 minutes)
    saveResetToken(email, otp, 15 * 60 * 1000);

    console.log("Attempting to send OTP email via Resend to:", email, "OTP:", otp);

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your Password Reset Code - ZenRunway",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0B0F17; color: #ffffff; border-radius: 12px; text-align: center;">
          <h2 style="color: #10B981; margin-top: 0;">ZenRunway Verification Code</h2>
          <p style="color: #94A3B8;">Use the following 6-digit verification code to reset your password:</p>
          <h1 style="letter-spacing: 5px; color: #38BDF8; font-size: 36px; margin: 24px 0; font-family: monospace;">${otp}</h1>
          <p style="font-size: 12px; color: #64748B;">This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("RESEND API ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("RESEND SUCCESS:", data);
    return NextResponse.json({ success: true, id: data?.id, otp });
  } catch (err: any) {
    console.error("UNHANDLED FORGOT PASSWORD ERROR:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
