"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

export type AuthTab = "login" | "signup" | "forgot" | "reset";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: { id: string; email: string }) => void;
  initialTab?: AuthTab;
  initialResetToken?: string;
  initialEmail?: string;
  isDark?: boolean;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "login",
  initialResetToken = "",
  initialEmail = "",
  isDark = true,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>(initialResetToken);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveTab(initialTab);
      if (initialEmail) setEmail(initialEmail);
      if (initialResetToken) setResetToken(initialResetToken);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialTab, initialResetToken, initialEmail]);

  if (!isOpen) return null;

  // Password strength logic for signup
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score++;
    return score; // 0 to 5
  };

  const passStrength = calculatePasswordStrength(password);

  const parseResponseSafely = async (res: Response, defaultError: string) => {
    let data: any = {};
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = { error: defaultError };
      }
    } else {
      const rawText = await res.text().catch(() => "");
      const cleanErr = rawText && rawText.length < 120 && !rawText.includes("<!DOCTYPE")
        ? rawText.trim()
        : `${defaultError} (HTTP ${res.status})`;
      data = { error: cleanErr };
    }

    if (!res.ok) {
      throw new Error(data.error || defaultError);
    }
    return data;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponseSafely(res, "Login failed.");

      setSuccessMsg("Logged in successfully!");
      setTimeout(() => {
        onSuccess(data.user || { id: "usr-admin-1", email: email || "admin@zenrunway.io" });
      }, 600);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponseSafely(res, "Signup failed.");

      setSuccessMsg("Account created successfully!");
      setTimeout(() => {
        onSuccess(data.user || { id: `usr-${Date.now()}`, email });
      }, 600);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDemoResetUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await parseResponseSafely(res, "Password reset request failed.");

      setSuccessMsg("Password reset email dispatched successfully!");
      if (data.resetUrl) {
        setDemoResetUrl(data.resetUrl);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: password }),
      });

      await parseResponseSafely(res, "Password reset failed.");

      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        setActiveTab("login");
        setPassword("");
        setConfirmPassword("");
        setSuccessMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-[#111622] border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header Bar */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? "border-slate-800 bg-[#0B0F17]/50" : "border-slate-100 bg-slate-50/50"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-snug">ZenRunway Security</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Financial Engine Authentication
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b text-xs font-semibold ${isDark ? "border-slate-800 bg-[#0B0F17]/30" : "border-slate-100 bg-slate-50"}`}>
          <button
            onClick={() => { setActiveTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "login"
                ? "border-emerald-500 text-emerald-500"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "signup"
                ? "border-emerald-500 text-emerald-500"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN VIEW */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Account Email
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@zenrunway.io"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("forgot"); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-xs text-emerald-500 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-3 ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Controller</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className={`text-center pt-3 text-xs border-t ${isDark ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"}`}>
                Default Admin: <code className="text-emerald-400 font-mono">admin@zenrunway.io</code> / <code className="text-emerald-400 font-mono">Password123!</code>
              </div>
            </form>
          )}

          {/* SIGNUP VIEW */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Account Email
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Strong Password
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars (Uppercase, Lowercase, Symbol/Num)"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-3 ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-slate-700/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passStrength <= 2
                            ? "w-1/3 bg-rose-500"
                            : passStrength <= 4
                            ? "w-2/3 bg-amber-500"
                            : "w-full bg-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Strength: {passStrength <= 2 ? "Weak" : passStrength <= 4 ? "Medium" : "Strong"}</span>
                      <span>Requirements: 8+ chars, A-Z, a-z, 0-9/symbol</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Secure Account</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {activeTab === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                Enter your registered email address below. We will send a secure, time-limited JWT reset token link directly to your inbox.
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              {demoResetUrl && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Reset Token Link Generated:
                  </div>
                  <a
                    href={demoResetUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      const urlObj = new URL(demoResetUrl);
                      setResetToken(urlObj.searchParams.get("resetToken") || "");
                      setActiveTab("reset");
                    }}
                    className="underline text-emerald-400 font-mono text-[11px] break-all hover:text-emerald-300 block"
                  >
                    Click to Open Reset Password View
                  </a>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setActiveTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`flex-1 py-3 px-4 rounded-xl border font-semibold text-sm transition-all ${
                    isDark
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Send Reset Email"}
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD VIEW */}
          {activeTab === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                Enter your new secure password below to complete password recovery.
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste JWT Reset Token"
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono border outline-none transition-all ${
                    isDark
                      ? "bg-[#182030] border-slate-700 text-emerald-400"
                      : "bg-slate-50 border-slate-200 text-emerald-600"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars with uppercase & symbol"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 absolute left-3 top-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                      isDark
                        ? "bg-[#182030] border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setActiveTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`flex-1 py-3 px-4 rounded-xl border font-semibold text-sm transition-all ${
                    isDark
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save New Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
