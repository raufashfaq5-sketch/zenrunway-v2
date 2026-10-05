"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, Key, Mail } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Step 1: "verify" (OTP Code Entry), Step 2: "reset" (New Password Entry)
  const [step, setStep] = useState<"verify" | "reset">("verify");

  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token") || searchParams.get("otp");
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setOtp(tokenParam);
  }, [searchParams]);

  // Step 1: Submit 6-digit OTP code to /api/auth/verify-otp
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMsg("Please enter your 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined, otp: cleanOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification code is invalid or expired.");
      }

      if (data.email) {
        setEmail(data.email);
      }

      setSuccessMsg("Code verified! Please enter your new password below.");
      setStep("reset");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit new password to /api/auth/reset-password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: otp.trim(),
          otp: otp.trim(),
          email: email.trim() || undefined,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Password update failed.");
      }

      setSuccessMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/?login=true");
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111622] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-snug">ZenRunway Security</h1>
            <p className="text-xs text-slate-400">
              {step === "verify" ? "Step 1: Code Verification" : "Step 2: Update Password"}
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: VERIFY 6-DIGIT CODE */}
        {step === "verify" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-xs text-slate-400">
              Please enter the 6-digit verification code sent to your registered email address.
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-300">Account Email (Optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-[#182030] border border-slate-700 text-slate-100 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-300">Enter 6-Digit Verification Code</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-lg font-mono tracking-widest bg-[#182030] border border-slate-700 text-emerald-400 outline-none focus:border-emerald-500 transition-all text-center"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                href="/"
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all text-center flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancel</span>
              </Link>
              <button
                type="submit"
                disabled={loading || otp.trim().length === 0}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: NEW PASSWORD & CONFIRM PASSWORD */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-xs text-slate-400">
              Code verified! Now enter your new secure password.
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-300">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars with uppercase, lowercase & symbol"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-[#182030] border border-slate-700 text-slate-100 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-300">Confirm Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-[#182030] border border-slate-700 text-slate-100 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all text-center flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
