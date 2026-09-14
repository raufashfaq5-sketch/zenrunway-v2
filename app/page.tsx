"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  Trash2,
  Wallet,
  Clock,
  Sparkles,
  Receipt,
  FileText,
  RefreshCw,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  Activity,
  Plus,
  Minus,
  AlertCircle,
  Filter,
  Check,
  Calendar as CalendarIcon,
  Mail,
  Send,
  X,
  Percent,
  Globe,
  Copy,
  Sun,
  Moon,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Settings,
  User,
  LogOut,
  Lock,
  Search,
  Bell,
  Menu,
  Download,
  FileSpreadsheet,
  FolderOpen,
  RotateCcw,
  SearchX,
} from "lucide-react";
import AuthModal, { AuthTab } from "@/components/AuthModal";
import { useSecurityShield } from "@/hooks/useSecurityShield";
import { sanitizeInput } from "@/lib/sanitizer";
import {
  getTransactionsAction,
  addTransactionAction,
  toggleTransactionStatusAction,
  deleteTransactionAction,
  calculateFinancialMetricsAction,
} from "@/app/actions/financials";

// --- TYPES & INTERFACES ---
export type TransactionType = "income" | "spend";
export type TransactionStatus = "received" | "paid" | "pending";
export type CurrencyCode = "USD" | "PKR";
export type ThemeMode = "dark" | "light";
export type DashboardView = "grid" | "calendar";

export interface TransactionItem {
  id: string;
  description: string;
  amount: number; // Stored in USD baseline float
  type: TransactionType;
  status: TransactionStatus;
  dueDate: string; // ISO format: YYYY-MM-DD
  category: string;
  clientEmail?: string;
  isSubscription?: boolean; // Monthly subscription marker
}

export interface ForecastMonthData {
  month: string;
  balance: number;
  income: number;
  burn: number;
  netChange: number;
  isSafe: boolean;
  daysRemaining: number;
}

// Global Storage & Visual Constants
const LOCAL_STORAGE_KEY = "zenrunway_dashboard_state_v1";
const SAFETY_THRESHOLD_USD = 30000;
const COLOR_SAFE = "#10B981"; // Emerald
const COLOR_DANGER = "#F43F5E"; // Rose

// Initial Default Fallback Data
const DEFAULT_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-101",
    description: "Acme Corp Monthly Retainer",
    amount: 10000,
    type: "income",
    status: "received",
    dueDate: "2026-08-01",
    category: "Retainer",
    clientEmail: "billing@acmecorp.com",
  },
  {
    id: "tx-102",
    description: "Starlight Media Design Sprint",
    amount: 7500,
    type: "income",
    status: "pending",
    dueDate: "2026-08-25",
    category: "Project",
    clientEmail: "accounts@starlightmedia.co",
  },
  {
    id: "tx-103",
    description: "Vanguard Tech Systems Audit",
    amount: 6000,
    type: "income",
    status: "pending",
    dueDate: "2026-08-05",
    category: "Audit",
    clientEmail: "finance@vanguardtech.io",
  },
  {
    id: "tx-104",
    description: "AWS Cloud High-Performance Cluster",
    amount: 3200,
    type: "spend",
    status: "pending",
    dueDate: "2026-08-10",
    category: "Infrastructure",
    clientEmail: "cloud-billing@aws.amazon.com",
    isSubscription: true,
  },
  {
    id: "tx-105",
    description: "Nexus Labs Mobile Integration",
    amount: 4500,
    type: "income",
    status: "pending",
    dueDate: "2026-08-02",
    category: "Development",
    clientEmail: "payables@nexuslabs.dev",
  },
  {
    id: "tx-106",
    description: "Figma Design System License",
    amount: 1500,
    type: "spend",
    status: "paid",
    dueDate: "2026-08-15",
    category: "Software",
    clientEmail: "billing@figma.com",
    isSubscription: true,
  },
  {
    id: "tx-107",
    description: "Dev Workstation Monitor Equipment",
    amount: 850,
    type: "spend",
    status: "paid",
    dueDate: "2026-08-14",
    category: "Equipment",
  },
];

export default function EnhancedFinancialDashboard() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // --- AUTHENTICATION STATES & MODAL CONTROL ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [initialResetToken, setInitialResetToken] = useState<string>("");
  const [initialEmail, setInitialEmail] = useState<string>("");

  // --- SIDEBAR & SEARCH NAVIGATION STATES ---
  const [sidebarTab, setSidebarTab] = useState<string>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  // --- LIVE FX RATE TIMESTAMP & EMAIL DISPATCH STATE ---
  const [lastFxRateUpdate, setLastFxRateUpdate] = useState<string>("Aug 30, 2026 07:43 PM");
  const [sendingDirectEmail, setSendingDirectEmail] = useState<boolean>(false);

  // --- DYNAMIC EXCHANGE RATE & TAX CONFIGURATION STATES ---
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(278);
  const [taxWithholdingRate, setTaxWithholdingRate] = useState<number>(0.15); // 15%
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempPkrRate, setTempPkrRate] = useState<string>("278");
  const [tempTaxRate, setTempTaxRate] = useState<string>("15");

  // Dashboard Theme, View & Toggles
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const isDark = theme === "dark";

  const [activeView, setActiveView] = useState<DashboardView>("grid");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(7); // 0-indexed: 7 = August

  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [isTaxPayerMode, setIsTaxPayerMode] = useState<boolean>(false);

  // Automated Subscription Engine Last Processed Month
  const [lastProcessedMonth, setLastProcessedMonth] = useState<string>("2026-08");

  // Base Financial States
  const [baseCheckingBalance] = useState<number>(35000);
  const [monthlyBurn] = useState<number>(9000);
  const [monthlyRevenue] = useState<number>(12000);

  // Audit Reference Date
  const todayStr = "2026-08-14";

  // Master Transactions State
  const [transactions, setTransactions] = useState<TransactionItem[]>(DEFAULT_TRANSACTIONS);

  // --- CLIENT-SIDE ANTI-TAMPERING & DEVTOOLS BREACH PROTECTION ---
  const { devToolsDetected } = useSecurityShield({
    onSecurityEvent: (reason) => {
      showToast(`SECURITY PROTECT: ${reason}`);
    },
  });

  // --- VERIFY SESSION & CHECK FOR RESET TOKEN IN URL ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("resetToken");
      const emailParam = params.get("email");
      if (tokenParam) {
        setInitialResetToken(tokenParam);
        if (emailParam) setInitialEmail(emailParam);
        setAuthTab("reset");
        setIsAuthModalOpen(true);
      }
    }

    const verifyActiveSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        } else {
          setIsAuthenticated(false);
          setIsAuthModalOpen(true);
        }
      } catch (err) {
        setIsAuthenticated(false);
        setIsAuthModalOpen(true);
      }
    };
    verifyActiveSession();
  }, []);

  // --- AUTOMATED LIVE USD TO PKR EXCHANGE RATE FETCH (3-TIER RESILIENT FX SERVICE) ---
  useEffect(() => {
    const fetchLiveExchangeRate = async () => {
      try {
        const cachedRate = localStorage.getItem("zenrunway_fx_pkr");
        const cachedTime = localStorage.getItem("zenrunway_fx_time");
        if (cachedTime) setLastFxRateUpdate(cachedTime);
        if (cachedRate) {
          const num = parseFloat(cachedRate);
          if (!isNaN(num)) {
            setUsdToPkrRate(num);
            setTempPkrRate(String(num));
          }
        }

        const res = await fetch("/api/fx-rate");
        if (res.ok) {
          const data = await res.json();
          if (data?.rate) {
            const liveRate = data.rate;
            setUsdToPkrRate(liveRate);
            setTempPkrRate(String(liveRate));
            const timeStr = data.updatedAt || new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            setLastFxRateUpdate(timeStr);
            localStorage.setItem("zenrunway_fx_pkr", String(liveRate));
            localStorage.setItem("zenrunway_fx_time", timeStr);
          }
        }
      } catch (err) {
        console.warn("Could not fetch live exchange rates, keeping fallback/cached rate:", err);
      }
    };
    fetchLiveExchangeRate();
  }, []);

  // --- PRISMA SERVER-SIDE HYDRATION & LOCAL STORAGE PREFERENCES ---
  useEffect(() => {
    setMounted(true);
    const loadServerData = async () => {
      try {
        const serverTx = await getTransactionsAction();
        if (serverTx && serverTx.length > 0) {
          setTransactions(serverTx);
        }
      } catch (err) {
        console.warn("Could not load transactions from server action fallback:", err);
      }

      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved.theme) setTheme(saved.theme);
          if (saved.currency) setCurrency(saved.currency);
          if (typeof saved.isTaxPayerMode === "boolean") setIsTaxPayerMode(saved.isTaxPayerMode);
          if (typeof saved.usdToPkrRate === "number") {
            setUsdToPkrRate(saved.usdToPkrRate);
            setTempPkrRate(String(saved.usdToPkrRate));
          }
          if (typeof saved.taxWithholdingRate === "number") {
            setTaxWithholdingRate(saved.taxWithholdingRate);
            setTempTaxRate(String(saved.taxWithholdingRate * 100));
          }
          if (saved.lastProcessedMonth) setLastProcessedMonth(saved.lastProcessedMonth);
        }
      } catch (err) {
        console.warn("Could not read preferences from localStorage:", err);
      } finally {
        setIsHydrated(true);
      }
    };
    loadServerData();
  }, []);

  // --- LOCAL STORAGE PERSISTENCE (SAVE ON CHANGE EFFECT) ---
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const stateToSave = {
        transactions,
        theme,
        currency,
        isTaxPayerMode,
        usdToPkrRate,
        taxWithholdingRate,
        lastProcessedMonth,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn("Could not write dashboard state to localStorage:", err);
    }
  }, [transactions, theme, currency, isTaxPayerMode, usdToPkrRate, taxWithholdingRate, lastProcessedMonth, isHydrated]);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- AUTOMATED DATE-BASED SUBSCRIPTION ENGINE ---
  useEffect(() => {
    if (!isHydrated) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1; // 1-indexed (1-12)
    const currentMonthKey = `${currentYear}-${currentMonthNum < 10 ? "0" + currentMonthNum : currentMonthNum}`;

    if (currentMonthKey > lastProcessedMonth) {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.isSubscription) {
            return { ...t, status: "pending" };
          }
          return t;
        })
      );
      setLastProcessedMonth(currentMonthKey);
      showToast(`Automated Subscription Engine: Reset recurring subscriptions to Pending for ${currentMonthKey}.`);
    }
  }, [isHydrated, lastProcessedMonth]);

  // Dynamic Currency Formatter using Dynamic USD/PKR Rate
  const formatCurrency = (amountUSD: number): string => {
    if (currency === "PKR") {
      const pkrVal = Math.round(amountUSD * usdToPkrRate);
      return `Rs. ${pkrVal.toLocaleString("en-US")}`;
    }
    return `$${Math.round(amountUSD).toLocaleString("en-US")}`;
  };

  // Short Currency Formatter for Chart Axes
  const formatShortCurrency = (amountUSD: number): string => {
    if (currency === "PKR") {
      const pkrVal = amountUSD * usdToPkrRate;
      if (Math.abs(pkrVal) >= 1000000) {
        return `Rs ${(pkrVal / 1000000).toFixed(1)}M`;
      }
      if (Math.abs(pkrVal) >= 1000) {
        return `Rs ${(pkrVal / 1000).toFixed(0)}k`;
      }
      return `Rs ${Math.round(pkrVal)}`;
    }
    if (Math.abs(amountUSD) >= 1000) {
      return `$${(amountUSD / 1000).toFixed(0)}k`;
    }
    return `$${amountUSD}`;
  };

  // FORM STATES
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formType, setFormType] = useState<TransactionType>("income");
  const [formStatus, setFormStatus] = useState<TransactionStatus>("received");
  const [formDueDate, setFormDueDate] = useState<string>("2026-08-30");
  const [formCategory, setFormCategory] = useState<string>("Operations");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formIsSubscription, setFormIsSubscription] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  const handleTypeChange = (newType: TransactionType) => {
    setFormType(newType);
    if (newType === "spend") {
      setFormStatus("paid");
      setFormEmail("");
    } else {
      setFormStatus("received");
    }
  };

  // AI EMAIL REMINDER MODAL STATE
  const [emailModalTx, setEmailModalTx] = useState<TransactionItem | null>(null);
  const [customEmailSubject, setCustomEmailSubject] = useState<string>("");
  const [customEmailBody, setCustomEmailBody] = useState<string>("");
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  const isOverdue = (tx: TransactionItem): boolean => {
    return tx.status === "pending" && new Date(tx.dueDate) < new Date(todayStr);
  };

  // Manual trigger for new billing cycle
  const handleSimulateNewMonthCycle = () => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.isSubscription) {
          const parts = t.dueDate.split("-");
          let yr = parseInt(parts[0]);
          let mo = parseInt(parts[1]) + 1;
          if (mo > 12) {
            mo = 1;
            yr += 1;
          }
          const newDueDate = `${yr}-${mo < 10 ? "0" + mo : mo}-${parts[2]}`;
          return { ...t, status: "pending", dueDate: newDueDate };
        }
        return t;
      })
    );
    showToast("New Billing Cycle Triggered! Recurring subscriptions set to Pending for the new month.");
  };

  const handleOpenEmailModal = (tx: TransactionItem) => {
    setEmailModalTx(tx);
    const overdueDays = Math.max(1, Math.floor((new Date(todayStr).getTime() - new Date(tx.dueDate).getTime()) / 86400000));
    const recipient = tx.clientEmail || "billing@client.com";
    const displayAmt = formatCurrency(tx.amount);

    const subject = `URGENT REMINDER: Overdue ${tx.isSubscription ? "Subscription / " : ""}Invoice #${tx.id.toUpperCase()} - ${tx.description}`;
    const body = `Dear ${tx.description} Billing Team,

I hope this message finds you well.

This is an automated priority reminder regarding ${tx.isSubscription ? "Monthly Subscription " : ""}Invoice #${tx.id.toUpperCase()} (${tx.description}) in the amount of ${displayAmt}, which was due on ${tx.dueDate} and is now ${overdueDays} days past due.

To avoid service disruptions or account locks, please confirm payment processing at your earliest convenience.

Payment Method: Wire Transfer / Direct Deposit
Reference: Invoice #${tx.id.toUpperCase()}

Thank you for your prompt attention.

Best regards,
Treasury Operations
ZenRunway Financial Controller`;

    setCustomEmailSubject(subject);
    setCustomEmailBody(body);
    setCopiedDraft(false);
  };

  const handleSendOneClickEmail = () => {
    if (!emailModalTx) return;
    const recipient = emailModalTx.clientEmail || "billing@client.com";
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(customEmailSubject)}&body=${encodeURIComponent(customEmailBody)}`;
    window.open(mailtoUrl, "_blank");
    showToast(`Launching direct email client for ${recipient}...`);
  };

  const handleCopyEmailDraft = async () => {
    try {
      await navigator.clipboard.writeText(`${customEmailSubject}\n\n${customEmailBody}`);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
      showToast("Email draft copied to clipboard!");
    } catch (err) {
      showToast("Clipboard copy failed. Please copy text manually.");
    }
  };

  // --- RESET SEED DEMO DATA HANDLER ---
  const handleResetSeedDemoData = () => {
    setTransactions(DEFAULT_TRANSACTIONS);
    showToast("Restored client seed demo data successfully!");
  };

  // --- CSV REPORT EXPORT FUNCTIONALITY ---
  const handleExportCSV = (itemsToExport: TransactionItem[] = transactions) => {
    if (itemsToExport.length === 0) {
      showToast("No transaction data available to export.");
      return;
    }

    const headers = ["ID", "Description", "Amount USD", "Type", "Status", "Due Date", "Category", "Client Email", "Subscription"];
    const rows = itemsToExport.map((t) => [
      `"${t.id}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      `"${t.type}"`,
      `"${t.status}"`,
      `"${t.dueDate}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.clientEmail ? t.clientEmail.replace(/"/g, '""') : ""}"`,
      t.isSubscription ? "Yes" : "No",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const todayFilename = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `ZenRunway_Financial_Ledger_${todayFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${itemsToExport.length} transactions to CSV report!`);
  };

  // --- ACCURATE DAILY BURN RATE FORMULA ((monthlyBurn * 12) / 365) ---
  const dailyBurnRate = useMemo(() => {
    return monthlyBurn > 0 ? (monthlyBurn * 12) / 365 : 1;
  }, [monthlyBurn]);

  // Gross Settled Received Income
  const grossReceivedIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income" && t.status === "received")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Tax Deduction Amount on Received Income
  const taxDeductionOnReceived = useMemo(() => {
    return isTaxPayerMode ? grossReceivedIncome * taxWithholdingRate : 0;
  }, [grossReceivedIncome, isTaxPayerMode, taxWithholdingRate]);

  // Net Settled Income after Tax
  const netReceivedIncome = useMemo(() => {
    return grossReceivedIncome - taxDeductionOnReceived;
  }, [grossReceivedIncome, taxDeductionOnReceived]);

  // Settled Completed Spend Total
  const totalSettledSpend = useMemo(() => {
    return transactions
      .filter((t) => t.type === "spend" && (t.status === "paid" || t.status === "received"))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Liquid Cash
  const liquidCash = useMemo(() => {
    return baseCheckingBalance + netReceivedIncome - totalSettledSpend;
  }, [baseCheckingBalance, netReceivedIncome, totalSettledSpend]);

  // Liquid Days Remaining
  const liquidDays = useMemo(() => {
    return Math.floor(liquidCash / dailyBurnRate);
  }, [liquidCash, dailyBurnRate]);

  // Gross Active Pending Receivables
  const grossPendingReceivables = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income" && t.status === "pending" && !isOverdue(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Tax Deduction on Pending Receivables
  const taxDeductionOnPending = useMemo(() => {
    return isTaxPayerMode ? grossPendingReceivables * taxWithholdingRate : 0;
  }, [grossPendingReceivables, isTaxPayerMode, taxWithholdingRate]);

  // Net Pending Receivables
  const netPendingReceivables = useMemo(() => {
    return grossPendingReceivables - taxDeductionOnPending;
  }, [grossPendingReceivables, taxDeductionOnPending]);

  // Overdue Pending Transactions (Red Flags)
  const redFlagTransactions = useMemo(() => {
    return transactions.filter((t) => isOverdue(t));
  }, [transactions]);

  const redFlagBlockedAmount = useMemo(() => {
    return redFlagTransactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  }, [redFlagTransactions]);

  // Projected Cash Buffer
  const projectedBuffer = useMemo(() => {
    return liquidCash + netPendingReceivables;
  }, [liquidCash, netPendingReceivables]);

  // Projected Days
  const projectedDays = useMemo(() => {
    return Math.floor(projectedBuffer / dailyBurnRate);
  }, [projectedBuffer, dailyBurnRate]);

  // Net Monthly Revenue after tax
  const effectiveMonthlyRevenue = useMemo(() => {
    return monthlyRevenue * (1 - (isTaxPayerMode ? taxWithholdingRate : 0));
  }, [monthlyRevenue, isTaxPayerMode, taxWithholdingRate]);

  // Net Monthly Cash Flow
  const netMonthlyCashflow = useMemo(() => {
    return effectiveMonthlyRevenue - monthlyBurn;
  }, [effectiveMonthlyRevenue, monthlyBurn]);

  // Forecast Data (Refined with realistic financial fluctuations: mid-month expense dips & invoice collection spikes)
  const forecastData = useMemo<ForecastMonthData[]>(() => {
    const monthLabels = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
    // Cyclical financial variations: mid-month expense dips & invoice collection spikes
    // Maintains baseline growth trajectory connected to projectedBuffer and netMonthlyCashflow
    const cyclicalVariations = [0, -2200, 3500, -1800, 3100, 1600];
    let accumulatedBase = projectedBuffer;

    return monthLabels.map((month, idx) => {
      if (idx > 0) {
        accumulatedBase += netMonthlyCashflow;
      }
      const balance = accumulatedBase + cyclicalVariations[idx];
      const isSafe = balance >= SAFETY_THRESHOLD_USD;
      const daysRemaining = Math.max(0, Math.floor(balance / dailyBurnRate));

      return {
        month,
        balance,
        income: effectiveMonthlyRevenue,
        burn: monthlyBurn,
        netChange: netMonthlyCashflow + (cyclicalVariations[idx] - (cyclicalVariations[idx - 1] || 0)),
        isSafe,
        daysRemaining,
      };
    });
  }, [projectedBuffer, netMonthlyCashflow, effectiveMonthlyRevenue, monthlyBurn, dailyBurnRate]);

  // AUTHENTICATION & SESSION HANDLERS
  const handleAuthSuccess = (userData: { id: string; email: string }) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    showToast(`Authenticated session active: Welcome, ${userData.email}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {}
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAuthTab("login");
    setIsAuthModalOpen(true);
    showToast("Logged out of ZenRunway Financial Engine.");
  };

  // DIRECT BACKGROUND EMAIL SENDER VIA NEXT.JS API ROUTE
  const handleSendDirectEmailNow = async () => {
    if (!emailModalTx) return;
    setSendingDirectEmail(true);
    try {
      const recipient = emailModalTx.clientEmail || "billing@client.com";
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: customEmailSubject,
          bodyText: customEmailBody,
          invoiceId: emailModalTx.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Direct email dispatch failed.");
      }

      showToast(`Email dispatched directly to ${recipient} via ZenRunway AI Mail Gateway!`);
      setEmailModalTx(null);
    } catch (err: any) {
      showToast(`Direct email failed: ${err.message}`);
    } finally {
      setSendingDirectEmail(false);
    }
  };

  // TRANSACTION SUBMIT HANDLER WITH XSS SANITIZATION & SERVER VALIDATION
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanDesc = sanitizeInput(formDescription);
    const cleanCategory = sanitizeInput(formCategory);
    const cleanEmail = sanitizeInput(formEmail);

    if (!cleanDesc.trim()) {
      setFormError("Please enter a valid description.");
      return;
    }

    let numAmt = parseFloat(formAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setFormError("Please enter a positive numeric dollar amount.");
      return;
    }

    if (formType === "income" && !cleanEmail.trim()) {
      setFormError("Client email is required for incoming payment invoices.");
      return;
    }

    if (cleanEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail.trim())) {
      setFormError("Please enter a valid client email address.");
      return;
    }

    // Dynamic currency conversion
    if (currency === "PKR") {
      numAmt = numAmt / usdToPkrRate;
    }

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      description: cleanDesc,
      amount: numAmt,
      type: formType,
      status: formStatus,
      dueDate: formDueDate,
      category: cleanCategory || "Operations",
      clientEmail: cleanEmail.trim() || undefined,
      isSubscription: formIsSubscription,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Persist to Database via Server Action
    addTransactionAction(newTx).catch(() => {});

    // Dispatch Server-Side Validation API Call
    fetch("/api/validate-financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: [newTx, ...transactions],
        baseCheckingBalance,
        monthlyBurn,
        taxWithholdingRate,
        isTaxPayerMode,
      }),
    }).catch(() => {});

    if (newTx.type === "spend" && newTx.status === "paid") {
      showToast(`Added Paid Spend entry "${newTx.description}". Updated Liquid Cash & Buffer!`);
    } else if (newTx.status === "received") {
      showToast(`Added Settled Income "${newTx.description}". Updated Liquid Cash & Buffer!`);
    } else if (isOverdue(newTx)) {
      showToast(`Added ${newTx.description} past due date. Flagged as OVERDUE RED FLAG!`);
    } else {
      showToast(`Added Pending ${newTx.type.toUpperCase()} "${newTx.description}". Extended Projected Buffer!`);
    }

    setFormDescription("");
    setFormAmount("");
    setFormEmail("");
    setFormIsSubscription(false);
    setFormError("");
  };

  const handleToggleStatus = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          let newStatus: TransactionStatus;
          if (t.type === "spend") {
            newStatus = t.status === "pending" ? "paid" : "pending";
          } else {
            newStatus = t.status === "pending" ? "received" : "pending";
          }
          const actionText =
            newStatus === "paid"
              ? "SETTLED as PAID"
              : newStatus === "received"
              ? "SETTLED as RECEIVED"
              : "Marked as PENDING";
          showToast(`Transaction "${t.description}" ${actionText}. Metrics recalculated!`);

          // Persist status change via Server Action
          toggleTransactionStatusAction(id, newStatus).catch(() => {});

          return { ...t, status: newStatus };
        }
        return t;
      })
    );
  };

  const handleDeleteTransaction = (id: string, description: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteTransactionAction(id).catch(() => {});
    showToast(`Removed transaction "${description}". Updated ledger.`);
  };

  // CALENDAR DATA COMPUTATION
  const calendarMonthData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      transactions: TransactionItem[];
    }> = [];

    const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const mStr = prevMonth + 1 < 10 ? `0${prevMonth + 1}` : `${prevMonth + 1}`;
      const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
      const dateStr = `${prevYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        transactions: transactions.filter((t) => t.dueDate === dateStr),
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = calendarMonth + 1 < 10 ? `0${calendarMonth + 1}` : `${calendarMonth + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const dateStr = `${calendarYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        transactions: transactions.filter((t) => t.dueDate === dateStr),
      });
    }

    const totalCells = days.length > 35 ? 42 : 35;
    const nextPadding = totalCells - days.length;
    for (let d = 1; d <= nextPadding; d++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const mStr = nextMonth + 1 < 10 ? `0${nextMonth + 1}` : `${nextMonth + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const dateStr = `${nextYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        transactions: transactions.filter((t) => t.dueDate === dateStr),
      });
    }

    return {
      monthName: monthNames[calendarMonth],
      year: calendarYear,
      days,
    };
  }, [calendarYear, calendarMonth, transactions]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  // DISPLAYED TRANSACTIONS WITH SEARCH QUERY & DATE FILTERING
  const displayedLedgerTransactions = useMemo(() => {
    let list = transactions;
    if (selectedCalendarDate) {
      list = list.filter((t) => t.dueDate === selectedCalendarDate);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.clientEmail && t.clientEmail.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, selectedCalendarDate, searchQuery]);

  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ForecastMonthData = payload[0].payload;
      return (
        <div
          className={`backdrop-blur-xl p-4 rounded-xl shadow-2xl space-y-2.5 min-w-[240px] border ${
            isDark
              ? "bg-[#111622] border-[rgba(255,255,255,0.08)] text-[#d4e4fa]"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
              {label} Forecast ({currency})
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                data.isSafe
                  ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20"
                  : "bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20"
              }`}
            >
              {data.isSafe ? "Safe Cash Zone" : "Danger Zone"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-baseline">
              <span className={isDark ? "text-[#94A3B8]" : "text-slate-600"}>Ending Balance:</span>
              <span
                className={`text-sm font-mono font-bold ${
                  data.isSafe ? "text-[#4edea3]" : "text-[#ffb4ab]"
                }`}
              >
                {formatCurrency(data.balance)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className={isDark ? "text-[#94A3B8]" : "text-slate-600"}>Runway Coverage:</span>
              <span className={`font-mono font-semibold ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>
                {data.daysRemaining} Days
              </span>
            </div>

            {isTaxPayerMode && (
              <div className="flex justify-between items-center text-[11px] text-amber-400">
                <span>Tax Mode ({Math.round(taxWithholdingRate * 100)}% Withholding):</span>
                <span>Active</span>
              </div>
            )}
          </div>

          <div className={`pt-2 border-t text-[10px] flex justify-between ${isDark ? "border-[rgba(255,255,255,0.08)] text-[#94A3B8]" : "border-slate-200 text-slate-500"}`}>
            <span>Monthly Net Flow:</span>
            <span className="text-[#4edea3] font-mono">+{formatCurrency(netMonthlyCashflow)}/mo</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!mounted || !isHydrated) {
    return (
      <div className={`min-h-screen font-sans ${isDark ? "bg-[#0B0F17] text-[#d4e4fa]" : "bg-[#F8FAFC] text-slate-900"}`}>
        <div className="flex">
          {/* Sidebar Skeleton */}
          <div className={`hidden lg:block w-[264px] h-screen border-r p-6 space-y-6 ${isDark ? "bg-[#0B0F17] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#182030] skeleton-shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-[#182030] rounded w-3/4 skeleton-shimmer" />
                <div className="h-3 bg-[#182030] rounded w-1/2 skeleton-shimmer" />
              </div>
            </div>
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 bg-[#182030] rounded-xl skeleton-shimmer" />
              ))}
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 min-h-screen flex flex-col">
            <div className={`h-16 border-b px-6 flex items-center justify-between ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
              <div className="h-9 bg-[#182030] rounded-xl w-64 skeleton-shimmer" />
              <div className="flex gap-3">
                <div className="h-9 bg-[#182030] rounded-xl w-24 skeleton-shimmer" />
                <div className="h-9 bg-[#182030] rounded-xl w-24 skeleton-shimmer" />
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-48 rounded-2xl border p-5 space-y-4 ${isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200"}`}>
                    <div className="h-4 bg-[#182030] rounded w-1/2 skeleton-shimmer" />
                    <div className="h-8 bg-[#182030] rounded w-3/4 skeleton-shimmer" />
                    <div className="h-16 bg-[#182030] rounded-xl skeleton-shimmer" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 h-[420px] rounded-2xl border p-6 space-y-4 ${isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200"}`}>
                  <div className="h-5 bg-[#182030] rounded w-1/3 skeleton-shimmer" />
                  <div className="h-[320px] bg-[#182030]/40 rounded-xl skeleton-shimmer flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
                      <Sparkles className="w-4 h-4 text-[#10B981] animate-spin" />
                      <span>Initializing ZenRunway Financial Engine...</span>
                    </div>
                  </div>
                </div>

                <div className={`h-[420px] rounded-2xl border p-5 space-y-3 ${isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200"}`}>
                  <div className="h-5 bg-[#182030] rounded w-1/2 skeleton-shimmer" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-[#182030] rounded-xl skeleton-shimmer" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans antialiased relative transition-colors duration-300 selection:bg-[#10B981]/30 selection:text-[#4edea3] ${
        isDark ? "bg-[#0B0F17] text-[#d4e4fa]" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      {/* Background Glow Accents */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-[#10B981]/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Interactive Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 border backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 animate-bounce ${
            isDark
              ? "bg-[#111622] border-[#10B981]/40 text-[#4edea3]"
              : "bg-white border-emerald-500/50 text-emerald-700 shadow-emerald-500/10"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================================ */}
      {/* STRUCTURAL LAYOUT INTEGRATION: FIXED LEFT SIDEBAR (Width: 264px)              */}
      {/* ============================================================================ */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[264px] flex flex-col justify-between border-r transition-transform duration-300 ${
          isDark ? "bg-[#0B0F17] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200"
        } ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] to-teal-400 flex items-center justify-center shadow-lg shadow-[#10B981]/20">
                <Wallet className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className={`text-xl font-bold tracking-tight font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                    Zen<span className="text-[#10B981]">Runway</span>
                  </h1>
                </div>
                <p className={`text-[11px] font-medium ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                  Enterprise Financial Engine
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setSidebarTab("dashboard");
                setActiveView("grid");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === "dashboard" && activeView === "grid"
                  ? isDark
                    ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/30 shadow-lg shadow-[#10B981]/10"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "text-[#94A3B8] hover:bg-[#111622] hover:text-[#d4e4fa]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#10B981]" />
              <span>Financial Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarTab("analytics");
                setActiveView("grid");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === "analytics"
                  ? isDark
                    ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/30"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "text-[#94A3B8] hover:bg-[#111622] hover:text-[#d4e4fa]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Wealth & Forecast</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarTab("transactions");
                setActiveView("grid");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === "transactions"
                  ? isDark
                    ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/30"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "text-[#94A3B8] hover:bg-[#111622] hover:text-[#d4e4fa]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Receipt className="w-4 h-4 text-teal-400" />
              <span>Invoice Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarTab("calendar");
                setActiveView("calendar");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === "calendar"
                  ? isDark
                    ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/30 shadow-lg shadow-[#10B981]/10"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "text-[#94A3B8] hover:bg-[#111622] hover:text-[#d4e4fa]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              <span>Calendar Audit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTempPkrRate(String(usdToPkrRate));
                setTempTaxRate(String(taxWithholdingRate * 100));
                setIsSettingsOpen(true);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? "text-[#94A3B8] hover:bg-[#111622] hover:text-[#d4e4fa]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>System Settings</span>
            </button>
          </nav>

          {/* Quick System Indicators */}
          <div className={`p-3 rounded-xl border text-[11px] space-y-2 ${
            isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#10B981]" />
                Live FX Rate:
              </span>
              <span className="font-mono font-bold text-[#d4e4fa]">278 PKR/$</span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-400" />
                Tax Mode:
              </span>
              <span className={`font-mono font-bold ${isTaxPayerMode ? "text-amber-400" : "text-[#94A3B8]"}`}>
                {isTaxPayerMode ? "15% Active" : "Disabled"}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Admin User Summary Card */}
        <div className={`p-4 border-t ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#111622]/50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10B981] to-indigo-600 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0">
                {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="overflow-hidden">
                <div className={`text-xs font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                  {currentUser?.email || "admin@zenrunway.io"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#10B981] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span>{isAuthenticated ? "Authenticated" : "Admin Demo Session"}</span>
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg border transition-colors ${
                  isDark ? "bg-[#182030] hover:bg-rose-500/20 text-rose-400 border-[rgba(255,255,255,0.08)]" : "bg-slate-100 hover:bg-rose-100 text-rose-600 border-slate-200"
                }`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthTab("login");
                  setIsAuthModalOpen(true);
                }}
                className="bg-[#10B981] hover:bg-[#4edea3] text-slate-950 p-2 rounded-lg transition-colors shadow"
                title="Sign In"
              >
                <User className="w-3.5 h-3.5 font-bold" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* ============================================================================ */}
      {/* MAIN CONTAINER CONTENT AREA (Offset by 264px on Desktop)                      */}
      {/* ============================================================================ */}
      <div className="lg:ml-[264px] min-h-screen flex flex-col">

        {/* --- TOP NAVIGATION BAR (STICKY HEADER) --- */}
        <header
          className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
            isDark ? "bg-[#0B0F17]/90 border-[rgba(255,255,255,0.08)]" : "bg-white/90 border-slate-200 shadow-sm"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Left: Mobile Menu Toggle & Search Bar Input */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border text-[#94A3B8] border-[rgba(255,255,255,0.08)]"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="relative w-full">
                <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDark ? "text-[#94A3B8]" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Search transactions, entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${
                    isDark
                      ? "bg-[#111622] border-[rgba(255,255,255,0.08)] text-[#d4e4fa] placeholder-[#94A3B8] focus:border-[#10B981]"
                      : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Controls: Currency Toggle, Tax Switcher, Dark/Light Mode, Bell Icon */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">

              {/* CURRENCY TOGGLE (PKR / USD) */}
              <div className={`flex items-center border rounded-xl p-0.5 ${isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-slate-100 border-slate-200"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("USD");
                    showToast("Switched currency display to USD ($)");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    currency === "USD"
                      ? "bg-[#10B981] text-slate-950 shadow font-extrabold"
                      : isDark ? "text-[#94A3B8] hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>USD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("PKR");
                    showToast(`Switched currency display to PKR (Rs. ${usdToPkrRate}/USD)`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    currency === "PKR"
                      ? "bg-[#10B981] text-slate-950 shadow font-extrabold"
                      : isDark ? "text-[#94A3B8] hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>PKR</span>
                </button>
              </div>

              {/* TAX MODE SWITCHER */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isTaxPayerMode;
                  setIsTaxPayerMode(nextState);
                  showToast(
                    nextState
                      ? `Tax Payer Mode ENABLED (${Math.round(taxWithholdingRate * 100)}% Withholding Tax deducted)`
                      : "Tax Payer Mode DISABLED (Gross income applied)"
                  );
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isTaxPayerMode
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow"
                    : isDark
                    ? "bg-[#111622] text-[#94A3B8] border-[rgba(255,255,255,0.08)] hover:text-[#d4e4fa]"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
                title="Toggle 15% Withholding Tax Mode"
              >
                <Percent className={`w-3.5 h-3.5 ${isTaxPayerMode ? "text-amber-400 animate-pulse" : ""}`} />
                <span className="hidden sm:inline">Tax Mode</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isTaxPayerMode ? "bg-amber-400 text-slate-950 font-black" : isDark ? "bg-[#182030] text-[#94A3B8]" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isTaxPayerMode ? `${Math.round(taxWithholdingRate * 100)}% ON` : "OFF"}
                </span>
              </button>

              {/* DARK / LIGHT MODE TOGGLE */}
              <button
                type="button"
                onClick={() => {
                  const nextTheme = isDark ? "light" : "dark";
                  setTheme(nextTheme);
                  showToast(`Switched theme to ${nextTheme.toUpperCase()} mode.`);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-xs font-bold ${
                  isDark
                    ? "bg-[#111622] text-amber-400 border-[rgba(255,255,255,0.08)] hover:bg-[#182030]"
                    : "bg-slate-100 text-indigo-600 border-slate-200 hover:bg-slate-200"
                }`}
                title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              </button>

              {/* NOTIFICATION BELL WITH STATUS BADGE */}
              <button
                type="button"
                onClick={() => {
                  if (redFlagTransactions.length > 0) {
                    handleOpenEmailModal(redFlagTransactions[0]);
                  } else {
                    showToast("No overdue red flag alerts. Financial runway safe!");
                  }
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  isDark
                    ? "bg-[#111622] text-[#d4e4fa] border-[rgba(255,255,255,0.08)] hover:bg-[#182030]"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
                title={`${redFlagTransactions.length} Overdue Red Flag Alerts`}
              >
                <Bell className="w-4 h-4 text-[#94A3B8]" />
                {redFlagTransactions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F43F5E] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {redFlagTransactions.length}
                  </span>
                )}
              </button>

              {/* SETTINGS MODAL BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setTempPkrRate(String(usdToPkrRate));
                  setTempTaxRate(String(taxWithholdingRate * 100));
                  setIsSettingsOpen(true);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
                  isDark
                    ? "bg-[#111622] text-indigo-400 border-[rgba(255,255,255,0.08)] hover:bg-[#182030]"
                    : "bg-slate-100 text-indigo-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="System Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">

          {/* TAX PAYER MODE ALERT BANNER */}
          {isTaxPayerMode && (
            <div className={`border rounded-2xl p-3.5 flex items-center justify-between text-xs backdrop-blur-md ${
              isDark ? "bg-amber-950/30 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900"
            }`}>
              <div className="flex items-center gap-2.5">
                <Percent className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className={isDark ? "text-amber-300" : "text-amber-950"}>Tax Payer Mode Active ({Math.round(taxWithholdingRate * 100)}% Retention):</strong> Deducting {Math.round(taxWithholdingRate * 100)}% tax withholding ({formatCurrency(taxDeductionOnReceived + taxDeductionOnPending)}) from income streams.
                </span>
              </div>
              <button
                onClick={() => setIsTaxPayerMode(false)}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold underline cursor-pointer shrink-0"
              >
                Disable Tax Mode
              </button>
            </div>
          )}

          {/* OVERDUE RED FLAG ALERT BANNER */}
          {redFlagTransactions.length > 0 && (
            <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md shadow-xl ${
              isDark ? "bg-[#111622] border-[#F43F5E]/30" : "bg-rose-50 border-rose-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/30 flex items-center justify-center text-[#ffb4ab] shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-[#ffb4ab]" : "text-rose-900"}`}>
                      Red Flag Alert: {redFlagTransactions.length} Overdue Items
                    </h3>
                    <span className="text-[10px] font-black bg-[#F43F5E]/20 text-[#ffb4ab] border border-[#F43F5E]/30 px-2 py-0.5 rounded uppercase">
                      Risk Capital
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-[#94A3B8]" : "text-rose-800"}`}>
                    Overdue payments totaling <span className="font-mono font-bold text-[#ffb4ab]">{formatCurrency(redFlagBlockedAmount)}</span> are past due and excluded from liquid cash.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEmailModal(redFlagTransactions[0])}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>AI Reminder</span>
                </button>

                <button
                  onClick={() => {
                    const firstOverdue = redFlagTransactions[0];
                    if (firstOverdue) handleToggleStatus(firstOverdue.id);
                  }}
                  className="bg-[#F43F5E] hover:bg-rose-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-lg shadow-[#F43F5E]/20"
                >
                  Settle Invoice
                </button>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* VIEW SWITCHER & 4-CARD KPI GRID SECTION                                      */}
          {/* ============================================================================ */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  <Layers className="w-5 h-5 text-[#10B981]" />
                  Financial Engine Overview
                </h2>
                <p className={`text-xs ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                  Real-time cash flow monitoring, liquid runway reserves, and transaction management.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSimulateNewMonthCycle}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? "bg-[#111622] text-indigo-300 border-[rgba(255,255,255,0.08)] hover:border-indigo-500/50"
                      : "bg-slate-100 text-indigo-700 border-slate-200 hover:bg-slate-200"
                  }`}
                  title="Simulate start of new month: sets recurring subscriptions to Pending"
                >
                  <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Simulate New Month</span>
                </button>

                <div className={`flex items-center border rounded-xl p-0.5 ${isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-slate-100 border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("grid");
                      showToast("Switched to Main Grid View");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeView === "grid"
                        ? "bg-[#10B981] text-slate-950 shadow font-extrabold"
                        : isDark ? "text-[#94A3B8] hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("calendar");
                      showToast("Switched to Interactive Calendar View");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeView === "calendar"
                        ? "bg-[#10B981] text-slate-950 shadow font-extrabold"
                        : isDark ? "text-[#94A3B8] hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Calendar View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* --- 4-CARD KPI GRID --- */}
            {activeView === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* CARD 1: LIQUID BUFFER */}
                <div className={`border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                  isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] hover:border-[#10B981]/30" : "bg-white border-slate-200 shadow-slate-200/50 hover:border-slate-300"
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#4edea3]">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>Liquid Buffer</span>
                      </div>
                      <span className="text-xs font-bold font-mono bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +12.4% Safe
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>Settled Liquid Cash</span>
                      <div className={`text-2xl font-extrabold font-mono tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {formatCurrency(liquidCash)}
                      </div>
                      <p className="text-[11px] font-semibold text-[#4edea3]">
                        {liquidDays} Days Safe Buffer
                      </p>
                    </div>

                    <div className={`border rounded-xl p-3 space-y-1.5 text-xs ${isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)]" : "bg-slate-100 border-slate-200"}`}>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Base Checking:</span>
                        <span className={`font-mono ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>{formatCurrency(baseCheckingBalance)}</span>
                      </div>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Net Income ({isTaxPayerMode ? `-${Math.round(taxWithholdingRate * 100)}% Tax` : "Gross"}):</span>
                        <span className="font-mono text-[#4edea3]">+{formatCurrency(netReceivedIncome)}</span>
                      </div>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Paid Expenses:</span>
                        <span className="font-mono text-[#ffb4ab]">-{formatCurrency(totalSettledSpend)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className={`w-full rounded-full h-1.5 overflow-hidden border ${isDark ? "bg-[#0B0F17] border-[rgba(255,255,255,0.08)]" : "bg-slate-200 border-slate-300"}`}>
                      <div
                        className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (liquidDays / 180) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 2: PROJECTED BUFFER */}
                <div className={`border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                  isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] hover:border-indigo-500/30" : "bg-white border-slate-200 shadow-slate-200/50 hover:border-slate-300"
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>Projected Buffer</span>
                      </div>
                      <span className="text-xs font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +18.6% Extended
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>Projected Capital</span>
                      <div className={`text-2xl font-extrabold font-mono tracking-tight ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>
                        {formatCurrency(projectedBuffer)}
                      </div>
                      <p className="text-[11px] font-semibold text-indigo-400">
                        {projectedDays} Days Safe Buffer
                      </p>
                    </div>

                    <div className={`border rounded-xl p-3 space-y-1.5 text-xs ${isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)]" : "bg-slate-100 border-slate-200"}`}>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Liquid Cash:</span>
                        <span className="font-mono text-[#4edea3]">{formatCurrency(liquidCash)}</span>
                      </div>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Net Pending:</span>
                        <span className="font-mono text-indigo-400">+{formatCurrency(netPendingReceivables)}</span>
                      </div>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Extended Days:</span>
                        <span className="font-mono text-indigo-400 font-bold">
                          +{Math.floor(netPendingReceivables / dailyBurnRate)} Days
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className={`w-full rounded-full h-1.5 overflow-hidden border ${isDark ? "bg-[#0B0F17] border-[rgba(255,255,255,0.08)]" : "bg-slate-200 border-slate-300"}`}>
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (projectedDays / 240) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 3: RED FLAGS AUDIT */}
                <div className={`border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                  isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] hover:border-[#F43F5E]/30" : "bg-white border-slate-200 shadow-slate-200/50 hover:border-slate-300"
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 flex items-center justify-center text-[#ffb4ab]">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>Red Flags Audit</span>
                      </div>
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          redFlagTransactions.length > 0
                            ? "bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20"
                            : "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20"
                        }`}
                      >
                        <ArrowDownRight className="w-3 h-3" />
                        {redFlagTransactions.length} Overdue
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>Blocked Risk Capital</span>
                      <div className="text-2xl font-extrabold font-mono text-[#ffb4ab] tracking-tight">
                        {formatCurrency(redFlagBlockedAmount)}
                      </div>
                      <p className="text-[11px] font-semibold text-[#ffb4ab]">
                        Excluded from Liquid Cash
                      </p>
                    </div>

                    <div className={`border rounded-xl p-3 space-y-1.5 text-xs ${isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)]" : "bg-slate-100 border-slate-200"}`}>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>Overdue Items:</span>
                        <span className="font-mono text-[#ffb4ab] font-bold">{redFlagTransactions.length} Items</span>
                      </div>
                      <div className={`flex justify-between ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                        <span>AI Reminders:</span>
                        <span className="font-semibold text-indigo-400">Ready to Send</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    {redFlagTransactions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEmailModal(redFlagTransactions[0])}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send AI Reminder</span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-center text-[#10B981] font-mono">
                        No active payment risks
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD 4: QUICK ADD ACTION BOX */}
                <div className={`border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-emerald-500/40 shadow-slate-200/50"
                }`}>
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between border-b pb-2 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#4edea3]">
                          <PlusCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#d4e4fa]" : "text-slate-800"}`}>Quick Add Action Box</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20 px-1.5 py-0.5 rounded">
                        Inverted
                      </span>
                    </div>

                    <form onSubmit={handleAddTransaction} className="space-y-2">
                      <div>
                        <input
                          type="text"
                          placeholder="Description (e.g. AWS / Figma)"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#10B981] border ${
                            isDark
                              ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white placeholder-[#94A3B8]"
                              : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder={`Amount (${currency === "PKR" ? "Rs" : "$"})`}
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#10B981] border ${
                            isDark
                              ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white placeholder-[#94A3B8]"
                              : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                        />

                        <select
                          value={formType}
                          onChange={(e: any) => handleTypeChange(e.target.value)}
                          className={`w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#10B981] border cursor-pointer ${
                            isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                          }`}
                        >
                          <option value="income">+ Income (Received)</option>
                          <option value="spend">- Spend (Paid)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={formStatus}
                          onChange={(e: any) => setFormStatus(e.target.value)}
                          className={`w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#10B981] border cursor-pointer ${
                            isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                          }`}
                        >
                          {formType === "spend" ? (
                            <>
                              <option value="paid">Paid (Settled)</option>
                              <option value="pending">Pending</option>
                            </>
                          ) : (
                            <>
                              <option value="received">Received (Settled)</option>
                              <option value="pending">Pending</option>
                            </>
                          )}
                        </select>

                        <input
                          type="date"
                          value={formDueDate}
                          onChange={(e) => setFormDueDate(e.target.value)}
                          className={`w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#10B981] border ${
                            isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>

                      {/* CLIENT EMAIL INPUT FIELD: CONDITIONAL DISPLAY (Income Only) */}
                      {formType === "income" && (
                        <div>
                          <input
                            type="email"
                            required
                            placeholder="Client Email *"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border ${
                              !formEmail.trim() && formError
                                ? "border-[#F43F5E]"
                                : "focus:border-[#10B981]"
                            } ${
                              isDark
                                ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white placeholder-[#94A3B8]"
                                : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                            }`}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id="isSubscriptionCheck"
                          checked={formIsSubscription}
                          onChange={(e) => setFormIsSubscription(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#10B981] rounded cursor-pointer"
                        />
                        <label htmlFor="isSubscriptionCheck" className={`text-xs font-semibold cursor-pointer flex items-center gap-1 ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
                          <Repeat className="w-3 h-3 text-indigo-400" />
                          <span>Monthly Subscription</span>
                        </label>
                      </div>

                      {formError && (
                        <p className="text-[10px] text-[#ffb4ab] flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{formError}</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-[#10B981] hover:bg-[#4edea3] text-slate-950 font-extrabold py-2 rounded-lg text-xs uppercase tracking-wider shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Entry</span>
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* --- INTERACTIVE CALENDAR VIEW --- */}
            {activeView === "calendar" && (
              <div className={`border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
                isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200 shadow-slate-200/50"
              }`}>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-[#10B981]" />
                      <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Interactive Cash Flow Calendar ({calendarMonthData.monthName} {calendarMonthData.year})
                      </h2>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                      Day-by-day view of incoming revenue, subscription renewals, paid expenses, and overdue red flags. Click a date to filter the ledger below!
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevMonth}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-[#d4e4fa] hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      }`}
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setCalendarYear(2026);
                        setCalendarMonth(7);
                        setSelectedCalendarDate("2026-08-14");
                        showToast("Jumped to Today (Aug 14, 2026)");
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-[#4edea3] hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-emerald-700 hover:bg-slate-200"
                      }`}
                    >
                      Today (Aug 14)
                    </button>

                    <button
                      onClick={handleNextMonth}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-[#d4e4fa] hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      }`}
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {selectedCalendarDate && (
                      <button
                        onClick={() => {
                          setSelectedCalendarDate(null);
                          showToast("Cleared Date Filter");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20 text-xs font-bold hover:bg-[#F43F5E]/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Date Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarMonthData.days.map((dayItem, idx) => {
                    const isSelected = selectedCalendarDate === dayItem.dateStr;
                    const isToday = dayItem.dateStr === todayStr;

                    return (
                      <div
                        key={`day-${idx}-${dayItem.dateStr}`}
                        onClick={() => {
                          setSelectedCalendarDate(isSelected ? null : dayItem.dateStr);
                          if (!isSelected) {
                            showToast(`Filtered transactions for ${dayItem.dateStr}`);
                          } else {
                            showToast("Cleared Date Filter");
                          }
                        }}
                        className={`min-h-[95px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                          isSelected
                            ? "ring-2 ring-[#10B981] border-[#10B981] shadow-lg shadow-[#10B981]/10"
                            : dayItem.isCurrentMonth
                            ? isDark
                              ? "bg-[#182030]/60 border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[#182030]"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                            : isDark
                            ? "bg-[#0B0F17]/40 border-[rgba(255,255,255,0.04)] text-slate-600"
                            : "bg-slate-100/40 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                              isToday
                                ? "bg-[#10B981] text-slate-950 font-black shadow"
                                : dayItem.isCurrentMonth
                                ? isDark ? "text-[#d4e4fa]" : "text-slate-800"
                                : "text-slate-500"
                            }`}
                          >
                            {dayItem.dayNum}
                          </span>

                          {dayItem.transactions.length > 0 && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              isDark ? "bg-[#182030] text-[#d4e4fa]" : "bg-slate-200 text-slate-700"
                            }`}>
                              {dayItem.transactions.length}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 my-1 overflow-hidden">
                          {dayItem.transactions.slice(0, 2).map((tx) => {
                            const overdue = isOverdue(tx);
                            return (
                              <div
                                key={tx.id}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1 ${
                                  overdue
                                    ? "bg-[#F43F5E]/20 text-[#ffb4ab] border border-[#F43F5E]/30"
                                    : tx.isSubscription
                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    : tx.type === "income"
                                    ? "bg-[#10B981]/20 text-[#4edea3] border border-[#10B981]/30"
                                    : isDark
                                    ? "bg-[#182030] text-[#d4e4fa] border border-[rgba(255,255,255,0.08)]"
                                    : "bg-slate-200 text-slate-700 border border-slate-300"
                                }`}
                              >
                                {tx.isSubscription ? (
                                  <Repeat className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                                ) : overdue ? (
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-[#ffb4ab]" />
                                ) : tx.type === "income" ? (
                                  <Plus className="w-2.5 h-2.5 shrink-0 text-[#4edea3]" />
                                ) : (
                                  <Minus className="w-2.5 h-2.5 shrink-0 text-[#94A3B8]" />
                                )}
                                <span className="truncate">{tx.description}</span>
                              </div>
                            );
                          })}
                          {dayItem.transactions.length > 2 && (
                            <div className="text-[8px] text-[#94A3B8] text-center font-mono">
                              +{dayItem.transactions.length - 2} more
                            </div>
                          )}
                        </div>

                        <div className="text-[8px] text-[#94A3B8] font-mono text-right">
                          {isSelected ? "Selected" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ============================================================================ */}
          {/* SPLIT VIEW DASHBOARD AREA (2:1 Column Ratio)                                  */}
          {/* ============================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* --- LEFT (2 COLUMNS): RECHARTS WEALTH GROWTH / FORECAST AREA CHART --- */}
            <section className={`lg:col-span-2 border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
              isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200 shadow-slate-200/50"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#10B981]" />
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Wealth Growth & 6-Month Forecast ({currency})
                    </h2>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                    Visualizing trajectory with smooth emerald curve and subtle gradient fill. <span className="text-[#4edea3] font-semibold">Safe Cash (≥ $30k)</span> vs <span className="text-[#ffb4ab] font-semibold">Danger Zone</span>.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg ${isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)] text-[#d4e4fa]" : "bg-slate-100 border-slate-200 text-slate-700"}`}>
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span>Safe (≥ {formatShortCurrency(SAFETY_THRESHOLD_USD)})</span>
                  </div>
                  <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg ${isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)] text-[#d4e4fa]" : "bg-slate-100 border-slate-200 text-slate-700"}`}>
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                    <span>Danger</span>
                  </div>
                </div>
              </div>

              {/* RECHARTS AREA CHART WITH SMOOTH EMERALD CURVE & SUBTLE GRADIENT FILL */}
              <div className="w-full h-[360px] pt-2">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={forecastData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0"} vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke={isDark ? "#94A3B8" : "#64748B"}
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1" }}
                      />
                      <YAxis
                        stroke={isDark ? "#94A3B8" : "#64748B"}
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1" }}
                        tickFormatter={(val) => formatShortCurrency(val)}
                      />
                      <Tooltip content={<CustomForecastTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />

                      <ReferenceLine
                        y={SAFETY_THRESHOLD_USD}
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                        label={{
                          value: `Safety Threshold (${formatShortCurrency(SAFETY_THRESHOLD_USD)})`,
                          fill: "#F59E0B",
                          fontSize: 11,
                          position: "top",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#emeraldGradient)"
                        dot={{ fill: "#10B981", r: 4, stroke: "#0B0F17", strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: "#4edea3", stroke: "#0B0F17", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm">
                    Loading interactive wealth forecast engine...
                  </div>
                )}
              </div>
            </section>

            {/* --- RIGHT (1 COLUMN): RECENT TRANSACTIONS LEDGER TABLE --- */}
            <section className={`border rounded-2xl p-5 shadow-xl space-y-4 transition-colors flex flex-col justify-between ${
              isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)]" : "bg-white border-slate-200 shadow-slate-200/50"
            }`}>
              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#10B981]" />
                      <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Recent Transactions
                      </h3>
                    </div>
                    <p className={`text-[11px] ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                      Live ledger in <strong className={isDark ? "text-white" : "text-slate-900"}>{currency}</strong> ({displayedLedgerTransactions.length} entries)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCalendarDate && (
                      <button onClick={() => setSelectedCalendarDate(null)} className="text-[10px] text-[#4edea3] underline cursor-pointer mr-1">
                        Clear Date
                      </button>
                    )}
                    <button
                      onClick={() => handleExportCSV(displayedLedgerTransactions)}
                      className="btn-press px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Export Transactions to CSV File"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button
                      onClick={() => setShowAllHistory(true)}
                      className="btn-press px-2.5 py-1 rounded-lg text-xs font-bold bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Open All Historical Transactions Ledger"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>All History</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[380px] pr-1 space-y-2">
                  {displayedLedgerTransactions.length === 0 ? (
                    transactions.length === 0 ? (
                      <div className={`p-8 rounded-2xl border text-center space-y-4 ${isDark ? "bg-[#182030]/40 border-[rgba(255,255,255,0.06)] text-[#d4e4fa]" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto text-[#4edea3] shadow-lg shadow-[#10B981]/10">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs uppercase tracking-wider">No Financial Transactions</h4>
                          <p className={`text-[11px] ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                            Your transaction ledger is currently empty.
                          </p>
                        </div>
                        <button
                          onClick={handleResetSeedDemoData}
                          className="btn-press px-3.5 py-1.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#4edea3] border border-[#10B981]/30 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Load Seed Demo Data</span>
                        </button>
                      </div>
                    ) : (
                      <div className={`p-8 rounded-2xl border text-center space-y-3 ${isDark ? "bg-[#182030]/40 border-[rgba(255,255,255,0.06)]" : "bg-slate-50 border-slate-200"}`}>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                          <SearchX className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs uppercase tracking-wider">No Matching Records</h4>
                          <p className={`text-[11px] ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
                            No entries found matching criteria.
                          </p>
                        </div>
                        <button
                          onClick={() => { setSearchQuery(""); setSelectedCalendarDate(null); }}
                          className="btn-press px-3 py-1 rounded-xl bg-[#182030] hover:bg-slate-800 text-[#4edea3] border border-[rgba(255,255,255,0.1)] text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Clear Filters</span>
                        </button>
                      </div>
                    )
                  ) : (
                    displayedLedgerTransactions.slice(0, 5).map((item) => {
                      const overdueFlag = isOverdue(item);
                      const isCompleted = item.status === "paid" || item.status === "received";

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all space-y-2 ${
                            isDark
                              ? "bg-[#182030]/50 border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold text-xs truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                                  {item.description}
                                </span>
                                {item.isSubscription && (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded shrink-0">
                                    <Repeat className="w-2 h-2" />
                                    Sub
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                                <span>{item.category}</span>
                                <span>•</span>
                                <span>{item.dueDate}</span>
                              </div>
                            </div>

                            <div className={`text-xs font-mono font-bold shrink-0 ${
                              item.type === "income" ? "text-[#4edea3]" : "text-[#ffb4ab]"
                            }`}>
                              {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.04)] text-[10px]">
                            {/* ACTIVE BADGE / PILL STYLING */}
                            <div>
                              {isCompleted ? (
                                <span
                                  onClick={() => handleToggleStatus(item.id)}
                                  className="bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20 px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  {item.type === "spend" ? "Paid" : "Received"}
                                </span>
                              ) : overdueFlag ? (
                                <span
                                  onClick={() => handleToggleStatus(item.id)}
                                  className="bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20 px-2 py-0.5 rounded-full font-black uppercase cursor-pointer inline-flex items-center gap-1 animate-pulse"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Overdue Flag
                                </span>
                              ) : (
                                <span
                                  onClick={() => handleToggleStatus(item.id)}
                                  className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  Pending
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {overdueFlag && (
                                <button
                                  onClick={() => handleOpenEmailModal(item)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                                  title="AI Email Reminder"
                                >
                                  <Mail className="w-2.5 h-2.5" />
                                  <span>AI Email</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTransaction(item.id, item.description)}
                                className="text-[#94A3B8] hover:text-[#ffb4ab] p-1 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`text-[11px] pt-3 border-t flex items-center justify-between ${isDark ? "border-[rgba(255,255,255,0.06)] text-[#94A3B8]" : "border-slate-200 text-slate-500"}`}>
                <span className="text-[10px]">
                  Showing {Math.min(5, displayedLedgerTransactions.length)} of {displayedLedgerTransactions.length} recent entries
                </span>
                <button
                  onClick={() => setShowAllHistory(true)}
                  className="font-bold text-[#4edea3] hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <span>View All History</span>
                  <ArrowUpRight className="w-3 h-3 text-[#10B981]" />
                </button>
              </div>
            </section>

          </div>

        </main>
      </div>

      {/* --- ALL HISTORY FULL TRANSACTION LEDGER MODAL OVERLAY --- */}
      {showAllHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fadeIn">
          <div className={`border rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col relative ${
            isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] text-[#d4e4fa]" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#0B0F17]/60" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#4edea3]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>
                      All Transaction History & Ledger
                    </h3>
                    <span className="text-[10px] font-bold uppercase bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20 px-2 py-0.5 rounded-full font-mono">
                      {displayedLedgerTransactions.length} Total Entries
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Complete historical record of settled income, expenses, pending payments, and overdue red flags.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllHistory(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? "bg-[#182030] hover:bg-slate-800 text-[#94A3B8] hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Sub-bar */}
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#182030]/40" : "border-slate-100 bg-slate-50/50"}`}>
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isDark ? "text-[#94A3B8]" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Filter history by description, email, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border outline-none ${
                    isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white placeholder-[#94A3B8]" : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2 text-[#94A3B8] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => handleExportCSV(displayedLedgerTransactions)}
                  className="btn-press px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Export Transactions to CSV File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                {selectedCalendarDate && (
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    className="px-2.5 py-1 rounded-lg bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Date: {selectedCalendarDate}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                <span className="text-[#94A3B8] text-[11px]">Display Currency: <strong className="text-white">{currency}</strong></span>
              </div>
            </div>

            {/* Table Area */}
            <div className="p-5 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-semibold uppercase text-[10px] tracking-wider sticky top-0 ${
                    isDark ? "border-[rgba(255,255,255,0.08)] bg-[#111622] text-[#94A3B8]" : "border-slate-200 bg-white text-slate-500"
                  }`}>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Description &amp; Entity Email</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Amount ({currency})</th>
                    <th className="py-3 px-3 text-center">Interactive Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-[rgba(255,255,255,0.06)]" : "divide-slate-200"}`}>
                  {displayedLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#94A3B8] text-xs">
                        No historical transactions found for "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    displayedLedgerTransactions.map((item) => {
                      const overdueFlag = isOverdue(item);
                      const isCompleted = item.status === "paid" || item.status === "received";

                      return (
                        <tr key={`modal-${item.id}`} className={`transition-colors ${isDark ? "hover:bg-[#182030]/60" : "hover:bg-slate-50"}`}>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                                item.type === "income"
                                  ? "bg-[#10B981]/10 text-[#4edea3] border border-[#10B981]/20"
                                  : "bg-[#F43F5E]/10 text-[#ffb4ab] border border-[#F43F5E]/20"
                              }`}
                            >
                              {item.type === "income" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {item.type}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{item.description}</span>
                              {item.isSubscription && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                  <Repeat className="w-2.5 h-2.5" />
                                  Sub
                                </span>
                              )}
                            </div>
                            {item.clientEmail && (
                              <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{item.clientEmail}</div>
                            )}
                          </td>

                          <td className={`py-3 px-3 font-mono ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                            {item.category}
                          </td>

                          <td className={`py-3 px-3 font-mono ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>
                            {item.dueDate}
                          </td>

                          <td className={`py-3 px-3 font-mono font-bold ${item.type === "income" ? "text-[#4edea3]" : "text-[#ffb4ab]"}`}>
                            {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {isCompleted ? (
                              <button
                                onClick={() => handleToggleStatus(item.id)}
                                className="bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#4edea3] border border-[#10B981]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="Click to toggle status"
                              >
                                <Check className="w-3 h-3" />
                                <span>{item.type === "spend" ? "Paid (Settled)" : "Received (Settled)"}</span>
                              </button>
                            ) : overdueFlag ? (
                              <button
                                onClick={() => handleToggleStatus(item.id)}
                                className="bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 text-[#ffb4ab] border border-[#F43F5E]/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 animate-pulse"
                                title="Click to settle Red Flag"
                              >
                                <AlertTriangle className="w-3 h-3 text-[#ffb4ab]" />
                                <span>Overdue Flag — Settle</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(item.id)}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="Click to toggle status"
                              >
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Pending — Settle</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {overdueFlag && (
                                <button
                                  onClick={() => handleOpenEmailModal(item)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow"
                                  title="Generate & Send AI Reminder Email"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>AI Email</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTransaction(item.id, item.description)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isDark
                                    ? "bg-[#182030] hover:bg-rose-500/20 text-[#94A3B8] hover:text-[#ffb4ab] border-[rgba(255,255,255,0.08)]"
                                    : "bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 border-slate-200"
                                }`}
                                title="Delete transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-between shrink-0 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#0B0F17]/60" : "border-slate-200 bg-slate-50"}`}>
              <div className="text-xs text-[#94A3B8]">
                Showing full historical record ({displayedLedgerTransactions.length} entries)
              </div>
              <button
                onClick={() => setShowAllHistory(false)}
                className="bg-[#10B981] hover:bg-[#4edea3] text-slate-950 font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#10B981]/20"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SYSTEM SETTINGS DYNAMIC CONFIGURATION MODAL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col space-y-4 p-6 relative ${
            isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] text-[#d4e4fa]" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>System Financial Settings</h3>
                  <p className="text-[10px] text-[#94A3B8]">Configure Dynamic Exchange & Tax Withholding Rates</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? "bg-[#182030] hover:bg-slate-800 text-[#94A3B8] hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                  PKR Exchange Rate ($1 USD = X PKR)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempPkrRate}
                  onChange={(e) => setTempPkrRate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  placeholder="e.g. 278"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                  Withholding Tax Retention Rate (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempTaxRate}
                  onChange={(e) => setTempTaxRate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  placeholder="e.g. 15"
                />
              </div>

              <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] space-y-1.5">
                <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Client Demo Data Controls
                </label>
                <button
                  type="button"
                  onClick={() => {
                    handleResetSeedDemoData();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full btn-press bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#4edea3] border border-[#10B981]/30 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Client Seed Demo Data</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUsdToPkrRate(278);
                  setTaxWithholdingRate(0.15);
                  setTempPkrRate("278");
                  setTempTaxRate("15");
                  showToast("Reset settings to default (278 PKR/USD, 15% Tax)");
                  setIsSettingsOpen(false);
                }}
                className={`border font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  isDark
                    ? "bg-[#182030] hover:bg-slate-800 text-[#d4e4fa] border-[rgba(255,255,255,0.08)]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                }`}
              >
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={() => {
                  const pkr = parseFloat(tempPkrRate);
                  const tax = parseFloat(tempTaxRate);
                  if (isNaN(pkr) || pkr <= 0) {
                    showToast("Invalid exchange rate.");
                    return;
                  }
                  if (isNaN(tax) || tax < 0 || tax > 100) {
                    showToast("Invalid tax percentage.");
                    return;
                  }
                  setUsdToPkrRate(pkr);
                  setTaxWithholdingRate(tax / 100);
                  showToast(`Updated settings: Rate ${pkr} PKR/USD, Tax ${tax}%`);
                  setIsSettingsOpen(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AI EMAIL REMINDER MODAL --- */}
      {emailModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col space-y-4 p-6 relative ${
            isDark ? "bg-[#111622] border-[rgba(255,255,255,0.08)] text-[#d4e4fa]" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200"}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>AI Email Reminder Assistant</h3>
                  <p className="text-[10px] text-[#94A3B8]">Priority Overdue Notice for {emailModalTx.description}</p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalTx(null)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? "bg-[#182030] hover:bg-slate-800 text-[#94A3B8] hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`border rounded-xl p-3.5 space-y-2 text-xs ${
              isDark ? "bg-[#182030] border-[rgba(255,255,255,0.06)]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between">
                <span className={`font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>Recipient Email:</span>
                <span className="font-mono text-[#4edea3] font-bold">
                  {emailModalTx.clientEmail || "billing@client.com"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>Invoice Amount:</span>
                <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{formatCurrency(emailModalTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${isDark ? "text-[#94A3B8]" : "text-slate-600"}`}>Original Due Date:</span>
                <span className="font-mono text-[#ffb4ab]">{emailModalTx.dueDate} (Past Due)</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Email Subject Line</label>
              <input
                type="text"
                value={customEmailSubject}
                onChange={(e) => setCustomEmailSubject(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                  isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">AI Tailored Reminder Body</label>
              <textarea
                rows={7}
                value={customEmailBody}
                onChange={(e) => setCustomEmailBody(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 ${
                  isDark ? "bg-[#182030] border-[rgba(255,255,255,0.08)] text-[#d4e4fa]" : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyEmailDraft}
                className={`border font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark
                    ? "bg-[#182030] hover:bg-slate-800 text-[#d4e4fa] border-[rgba(255,255,255,0.08)]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedDraft ? "Copied!" : "Copy Draft"}</span>
              </button>

              <button
                type="button"
                onClick={handleSendOneClickEmail}
                className={`border font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark
                    ? "bg-[#182030] hover:bg-slate-800 text-indigo-300 border-indigo-500/30"
                    : "bg-slate-100 hover:bg-slate-200 text-indigo-700 border-indigo-300"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mailto App</span>
              </button>

              <button
                type="button"
                disabled={sendingDirectEmail}
                onClick={handleSendDirectEmailNow}
                className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {sendingDirectEmail ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Send Email Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AUTHENTICATION MODAL WRAPPER --- */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={isAuthenticated ? () => setIsAuthModalOpen(false) : undefined}
        onSuccess={handleAuthSuccess}
        initialTab={authTab}
        initialResetToken={initialResetToken}
        initialEmail={initialEmail}
        isDark={isDark}
      />

    </div>
  );
}
