import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser } from "@/lib/db";
import { hashPassword, signJwtToken, validatePasswordStrength, AUTH_COOKIE_NAME } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitizer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const cleanEmail = sanitizeEmail(email || "");
    if (!cleanEmail) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const passCheck = validatePasswordStrength(password || "");
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 });
    }

    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(cleanEmail, passwordHash);

    const token = signJwtToken({ userId: user.id, email: user.email });

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: { id: user.id, email: user.email },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Server error creating user account." }, { status: 500 });
  }
}
