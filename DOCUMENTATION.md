# ZenRunway Financial SaaS — Technical Specification & Security Architecture

---

## 1. Executive Summary

**ZenRunway** is a production-grade, full-stack Financial SaaS Web Application architected with Next.js (App Router), React, and Tailwind CSS. Engineered specifically for startup founders, treasury managers, and financial analysts, ZenRunway delivers real-time visibility into enterprise burn rates, cash reserves, and multi-currency liquidity projections.

### Core Value Propositions
* **Automated Runway Forecasting**: Dynamic algorithmically derived runway metrics (liquid vs. projected days) that instantly adjust based on incoming invoices, tax withholding rates, and operational burn.
* **Dynamic Multi-Currency Treasury Tracking**: Seamless real-time conversion between United States Dollars ($ USD) and Pakistani Rupees (Rs. PKR) with live FX rate synchronization.
* **Real-Time Burn Rate Analysis**: Continuous burn calculation (`monthlyBurn / 30`) combined with automated overdue risk detection and safety threshold monitoring.
* **Anti-Tampering State Security**: Enterprise-grade client-side anti-tampering guards and server-side cryptographic validations to prevent browser DOM manipulation during live financial presentations.

---

## 2. System Architecture & Tech Stack

ZenRunway is structured as a resilient, client-first yet server-validated Web Application. The technical stack leverages modern serverless patterns and reactive design tokens to achieve sub-millisecond interaction speeds and robust data integrity.

### Architecture & Technology Mapping

| Component Layer | Technology / Specification | Implementation Details & Technical Context |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Server Actions, API Routes) | Modern React 19 framework providing full-stack routing, server-side rendering (SSR), optimized asset delivery, and secure `/api/*` endpoints. |
| **Styling System** | Tailwind CSS (v4) | Custom dark mode design tokens featuring `#0B0F17` dark canvas, `#111622` slate card surface, `#10B981` Emerald safe accent, and 1px glassmorphism borders (`border-slate-800/80 backdrop-blur-md`). |
| **Data Visualization** | Recharts Engine | Monotone curve interpolation (`type="monotone"`) with dynamic area fills, dynamic threshold markers ($30k boundary), and theme-aware custom tooltips. |
| **Integrations** | External APIs & Native Providers | Live FX Market Exchange Rates API integration, Direct Email Dispatch (Resend / Nodemailer) for automated reminders, and LocalStorage state synchronization. |
| **Security Layer** | bcryptjs & Client Anti-Tampering Shield | Cryptographic password hashing on `/api/auth/*` routes, client-side DevTools detection/suppression, and right-click event prevention listeners. |

---

## 3. Feature Breakdown & Functional Logic

```
+-----------------------------------------------------------------------------------+
|                            ZENRUNWAY SYSTEM TOPOLOGY                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Header Toolbar ]  --> Theme Toggle | Currency Selector (USD/PKR) | Tax Mode    |
|                                                                                   |
|  [ Executive Metrics ] (4-Card KPI Grid)                                          |
|   ├── 1. Liquid Buffer    : (Base Checking + Net Received) / Daily Burn            |
|   ├── 2. Projected Buffer : (Liquid Cash + Net Pending Inflows) / Daily Burn      |
|   ├── 3. Red Flags Audit  : Blocked Risk Capital & Overdue Receivables            |
|   └── 4. Quick Add Form   : Add Income/Spend + Client Validation                  |
|                                                                                   |
|  [ Cash Flow Chart ] --> 6-Month Monotone Curve + $30,000 Safety Threshold        |
|                                                                                   |
|  [ Transaction Ledger ] --> Table with Status Badges (Paid, Pending, Overdue)     |
|                             + AI Reminder Mailers & Date Filtering                |
+-----------------------------------------------------------------------------------+
```

### Executive Metrics Engine
The core financial engine evaluates enterprise health through a 4-Card KPI Grid:
1. **Liquid Buffer Card**: Calculates immediately accessible capital (`baseCheckingBalance + netReceivedIncome - totalSettledSpend`) and converts settled cash into exact liquid runway days.
2. **Projected Buffer Card**: Evaluates future financial solvency by combining liquid cash with non-overdue incoming invoices (`liquidCash + netPendingReceivables`), computing projected runway extension.
3. **Red Flag Overdue Audits Card**: Automatically quarantines overdue pending items (`status === 'pending' && dueDate < today`), excluding high-risk receivables from liquid/projected runway metrics while highlighting blocked capital.
4. **Quick Add Entry Form**: Embedded transaction creation portal featuring dynamic conditional field visibility (requiring client email for incoming invoices while automatically defaulting spend status to `Paid`).

### Dynamic Cash Flow Charting
* **Trajectory Engine**: Generates a 6-month cash trajectory featuring natural fluctuating market curves using smooth monotone curve interpolation (`type="monotone"`).
* **Safety Markers**: Embeds a customizable static reference safety line at `$30,000` (or PKR equivalent), dynamically rendering visual status fills in Emerald Green (`#10B981`) when above threshold and Rose Red (`#F43F5E`) when entering the risk zone.
* **Interactive Tooltips**: Displays contextual break-downs on hover with theme-adapted glassmorphism cards.

### Multi-Currency & Tax Engine
* **Instant Currency Conversion**: Provides real-time switching between USD ($) and PKR (Rs.) using live exchange rate hooks (`1 USD = 278 PKR` baseline with API fallback). Formats large values automatically (e.g., `$10k` or `Rs 2.8M`).
* **Tax Payer Mode (15%)**: Implements server-side tax mode calculations applying a 15% withholding tax (`TAX_WITHHOLDING_RATE = 0.15`) on gross settled income and pending receivables in real time, re-calculating liquid and projected runway instantly.

### Transaction Ledger System
* **Status Badging**: Multi-state invoice management displaying clear visual pill badges:
  * `Paid` / `Received` (Emerald green badge)
  * `Pending` (Amber yellow badge)
  * `Overdue` / `Red Flag` (Rose red warning badge)
* **Expandable View States**: Supports full table list view and interactive monthly calendar view grid (35/42 day cell grid) with date-click invoice filtering.
* **Automated Action Triggers**: Direct one-click AI Email Reminder launcher populating custom overdue notices for dispatch via native mail client or SMTP dispatch.

---

## 4. Security & Anti-Tampering Protocols

ZenRunway incorporates multi-layered cybersecurity defense mechanisms tailored for financial data protection.

```
+-----------------------------------------------------------------------------------+
|                             SECURITY SHIELD ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+
|  [ Client Layer ]                                                                 |
|   ├── Context Menu Blocker (Suppresses right-click in live sessions)               |
|   ├── DevTools Inspector Detection & Console Suppression                          |
|   └── LocalStorage State Integrity Checks                                         |
+-----------------------------------------------------------------------------------+
|  [ Transport Layer ]                                                              |
|   └── TLS 1.3 / HTTPS Encryption + REST/JSON Payload Validation                   |
+-----------------------------------------------------------------------------------+
|  [ Server Layer ]                                                                 |
|   ├── bcryptjs Password & Passkey Cryptographic Hashing (/api/auth/*)              |
|   ├── Zod Payload Sanitization & Currency Override Prevention                     |
|   └── Immutable Math Calculations (Server-validated tax & runway metrics)         |
+-----------------------------------------------------------------------------------+
```

### Authentication & Passkey Hashing
* **Cryptographic Passkeys**: User authentication and administrative actions are protected via passkeys hashed using `bcryptjs` with salt rounds set to 10+.
* **API Route Isolation**: Authentication endpoints housed under `/api/auth/*` validate access tokens and signatures, preventing unauthorized payload modification or session hijacking.

### Client Anti-Tampering Shield
* **DevTools Detection & Suppression**: Client-side monitoring hooks detect open browser Developer Tools windows, suppressing DOM inspection and preventing runtime parameter tampering during client presentations.
* **Event Listener Protection**: Prevents native context menu events (`contextmenu` right-click) and common inspection hotkeys (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U`) to safeguard sensitive client financial states in public or shared display environments.

### Input Sanitization & State Integrity
* **Server-Validated Parameters**: All monetary entries, transaction dates, and currency parameters undergo strict server-side schema validation (via Zod schemas) to prevent price manipulation, currency override exploits, or script injection.
* **Calculation Immutability**: Critical runway metrics (daily burn, tax withholding deductions, liquid days) are computed in immutable server logic, ensuring front-end modifications cannot corrupt core financial reports.

---

## 5. Local Deployment & Maintenance Guide

### Prerequisites
* **Node.js**: v18.17.0 or higher
* **Package Manager**: `npm` (v9+) or `yarn` / `pnpm`

### Installation & Execution Setup

1. **Clone the Repository & Navigate to Directory**:
```bash
git clone https://github.com/zenrunway/zenrunway-app.git
cd zenrunway-app
```

2. **Install Project Dependencies**:
```bash
npm install
```

3. **Configure Environment Variables**:
Create a `.env.local` file in the root directory and populate the required credentials:
```env
# Email Dispatch Provider Credentials
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend


# FX Market Rate API Endpoint
NEXT_PUBLIC_FX_API_URL=https://api.exchangerate-api.com/v4/latest/USD

# Cryptographic Authentication Secret
AUTH_SECRET=a8f9c1e3b2d4567890abcdef1234567890abcdef1234567890abcdef12345678
```

4. **Launch Local Development Server**:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

5. **Production Build & Verification**:
To test optimized production bundles locally:
```bash
npm run build
npm start
```

---

## 6. Maintenance & Operational Best Practices

* **Dependency Updates**: Audit dependencies bi-weekly using `npm audit` to patch potential vulnerabilities in Next.js or React sub-packages.
* **FX Rate Cache TTL**: Maintain a 60-minute local caching strategy for FX market exchange rates to optimize API call usage while ensuring currency precision.
* **Audit Logging**: Monitor server action execution logs on `/api/validate-financials` to detect anomalous entry patterns or repeated failed validation attempts.
