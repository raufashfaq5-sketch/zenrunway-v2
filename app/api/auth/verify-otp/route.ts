import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, code } = await req.json();
    const otpCode = (otp || code || "").toString().trim();

    if (!otpCode) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    // Verify OTP code against stored db tokens
    const verification = verifyResetToken(otpCode);

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Invalid or expired 6-digit verification code." },
        { status: 400 }
      );
    }

    // If email was provided, check matching email address
    if (email && verification.email && verification.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Verification code does not match this email address." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code matched successfully.",
      email: verification.email || email,
    });
  } catch (err: any) {
    console.error("VERIFY OTP ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
