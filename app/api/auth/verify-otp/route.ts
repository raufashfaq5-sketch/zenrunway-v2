import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "zenrunway-secret-key-2026";

export async function POST(req: NextRequest) {
  try {
    const { email, userCode, otp, token } = await req.json();

    // Support both field names: userCode (new) and otp (legacy)
    const submittedCode = (userCode || otp || "").toString().trim();
    const otpToken = token || "";

    if (!submittedCode) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    if (!otpToken) {
      return NextResponse.json({ error: "OTP session token is missing. Please request a new code." }, { status: 400 });
    }

    // Verify and decode the JWT — this validates signature + expiry automatically
    let decoded: { email: string; code: string };
    try {
      decoded = jwt.verify(otpToken, JWT_SECRET) as { email: string; code: string };
    } catch (jwtErr: any) {
      const isExpired = jwtErr?.name === "TokenExpiredError";
      return NextResponse.json(
        { error: isExpired ? "Verification code has expired. Please request a new one." : "Invalid session token." },
        { status: 400 }
      );
    }

    // Validate email matches
    if (email && decoded.email && decoded.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Verification code does not match this email address." },
        { status: 400 }
      );
    }

    // Validate the 6-digit code
    if (decoded.code !== submittedCode) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code matched successfully.",
      email: decoded.email || email,
    });
  } catch (err: any) {
    console.error("VERIFY OTP ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
