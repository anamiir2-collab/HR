# ZenHR — Human Resources Management System

نظام إدارة الموارد البشرية | Human Resources Management System

A complete, polished, Arabic-first HR management application designed for company managers and HR administrators. Built as a static web application (HTML/CSS/vanilla JS) that runs entirely in the browser and deploys cleanly to GitHub Pages — no backend, no server, no cloud dependencies.

---

## 📌 Project Description

ZenHR is a manager/HR-only platform for managing a company with **350+ fictional demo employees** and realistic interconnected records across payroll, attendance, leaves, allowances, rewards, penalties, deductions, insurance, loans, contracts, performance, recruitment, and reports.

The application is **Arabic-first** (RTL) with full **English** support (LTR), and is mobile-first responsive across phones, tablets, and desktops.

---

## ✨ Main Features

- **Dashboard** — Live KPIs (employees, attendance, payroll, contracts, vacancies) + charts (department distribution, attendance trend, monthly payroll, hiring trend, leave distribution) all calculated from stored records.
- **Employee Management** — Full CRUD with search, multi-filter (department/status/type), sort, pagination, archiving, profile detail with tabs (payroll / attendance / leaves / performance / contracts / loans).
- **Departments** — Card-based directory with manager assignment, employee counts, safe-delete protection.
- **Attendance** — Daily records, check-in/out times, late/overtime/absence tracking, date-range + status filters, summary stats.
- **Leaves** — Annual / sick / emergency / unpaid / other; full lifecycle (pending → approved/rejected/cancelled), overlap detection, day count validation.
- **Shifts** — Multiple shifts with start/end times, breaks, grace periods, working days, active/inactive status.
- **Payroll** — Period-based records with tested calculation model:
  - `Gross = Basic + Allowances + Rewards + Overtime`
  - `Total Deductions = Deductions + Penalties + Insurance(employee) + Tax + Loan installment + Other`
  - `Net = Gross − Total Deductions`
  - Includes month-generation tool that auto-pulls all related records, payslip printing, and CSV/Excel export.
- **Allowances / Rewards / Penalties / Deductions** — Shared finance module pattern with type, amount, effective date, payroll period, status, and notes.
- **Insurance & Taxes** — Configurable employee/employer rates, editable tax brackets. **Calculations are estimates for testing only — verify against current legal rates.**
- **Loans & Advances** — Original amount, installments, paid/remaining balance, next installment date, automated payment recording.
- **Contracts** — Document/contract tracking with expiration warnings (30/60 days) and reminder dates.
- **Performance Evaluations** — Multi-criteria scoring with overall score, written feedback, recommendations, follow-up dates.
- **Recruitment** — Vacancies + candidates with pipeline stages (new → screening → interview → offer → hired/rejected).
- **Reports** — 16 report types with print + Excel export, all driven by actual application data.
- **Settings** — General (language/currency/access code), company info, work rules (working days, grace, breaks, overtime rate, leave balances), backup/restore, demo data management, about.
- **Backup & Restore** — JSON export with schema version + timestamp; restore with validation and overwrite confirmation.
- **PWA** — Installable, offline-capable via service worker with versioned cache.

---

## 🛠 Technology Stack

- **HTML5** — Semantic markup, RTL/LTR aware
- **CSS3** — Custom design system, no external framework, mobile-first responsive
- **Vanilla JavaScript (ES5/ES6)** — No build step, no transpilation, no dependencies
- **localStorage** — Persistent storage with schema versioning and safe migrations
- **Service Worker** — Offline-first PWA support
- **Web Fonts** — Cairo (Arabic) + Inter (English) with system fallbacks
- **No backend, no database, no paid services**

---

## 📁 Repository Structure

```
zenhr/
├── index.html                  # App shell with gate + main layout
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (cache-first static, network-first HTML)
├── README.md                   # This file
├── .gitignore
├── .nojekyll                   # Bypass Jekyll on GitHub Pages
├── css/
│   └── style.css               # Complete design system
├── js/
│   ├── utils.js                # Helpers: escape, money, date, time, RNG, download
│   ├── i18n.js                 # Arabic/English translations + RTL/LTR switching
│   ├── storage.js               # localStorage layer with versioning + collections
│   ├── auth.js                 # Manager/HR access gate (local-only)
│   ├── ui.js                   # UI helpers: modal, toast, table, form, charts
│   ├── router.js               # Hash-based routing
│   ├── demo-data.js            # 350+ fictional employee generator (deterministic)
│   ├── app.js                  # Bootstrap + navigation + global actions
│   ├── modules/
│   │   ├── dashboard.js
│   │   ├── employees.js
│   │   ├── departments.js
│   │   ├── attendance.js
│   │   ├── leaves.js
│   │   ├── shifts.js
│   │   ├── payroll.js
│   │   ├── rewards.js
│   │   ├── allowances.js
│   │   ├── penalties.js
│   │   ├── deductions.js
│   │   ├── insurance.js
│   │   ├── loans.js
│   │   ├── contracts.js
│   │   ├── performance.js
│   │   ├── recruitment.js
│   │   ├── reports.js
│   │   ├── settings.js
│   │   └── finance-factory.js  # Shared finance CRUD pattern
│   └── services/
│       ├── export.js           # CSV/Excel/JSON/print export
│       └── backup.js           # JSON backup/restore with validation
└── assets/
    ├── icon.svg                # Source SVG icon
    ├── icon-192.png             # PWA icon 192x192
    └── icon-512.png             # PWA icon 512x512
```

---

## 🚀 How to Run the Application

### Option 1: Direct browser
Open `index.html` directly in a modern browser. (Note: service worker requires HTTP, not file://.)

### Option 2: Local server
```bash
cd zenhr
python3 -m http.server 8080
# Visit http://localhost:8080
```

### Option 3: GitHub Pages
1. Push the project to a GitHub repository (e.g. `username/HR`).
2. In repository settings → Pages → set source to `main` branch, root folder.
3. Wait 1-2 minutes; the app will be live at `https://username.github.io/HR/`.

All asset paths are **relative** (`./js/...`, `./css/...`), so the app works under any subdirectory.

---

## 📦 How GitHub Pages Deployment Works

- All paths use `./` (relative) — works under both root domain and subdirectory.
- A `.nojekyll` file tells GitHub Pages to skip Jekyll processing and serve files as-is.
- The service worker uses relative scope (`./sw.js`) and relative cache paths.
- The first successful load caches all assets; subsequent loads work offline.

---

## 🎭 Demo Data

### Initialization
- On first launch, the app checks `settings.demoInitialized`.
- If demo data has not been initialized, you can initialize it from **Settings → Demo Data Management**.
- The generator uses a **deterministic seed** (mulberry32 RNG), so resetting produces the **same 358 employees** with the same IDs and relationships every time.

### Dataset includes
- **358 fictional employees** across 13 departments (HR, Finance, Sales, Marketing, Warehouse, Production, QA, Customer Service, IT, Administration, Procurement, Maintenance, Operations)
- **5 shifts** (morning, evening, night, weekend, flexible)
- **~11,000 attendance records** over the last 30 working days
- **80 leave requests** across all statuses (pending/approved/rejected/cancelled)
- **~1,400 payroll records** over the last 4 months
- **60 allowances, 35 rewards, 25 penalties, 30 deductions**
- **~280 insurance records**
- **18 active loans** with installments
- **340 contract records** with varied expiration dates
- **100 performance evaluations**
- **8 vacancies and 40 candidates**

### Reset / Delete
- **Reset to Original** — deletes all demo records and regenerates the same dataset.
- **Delete Demo Data** — deletes only records marked `isDemo: true`. **Your real records are preserved.**
- A confirmation dialog always precedes destructive actions.

### Critical safety
- Demo records carry `isDemo: true`.
- User-created records carry `isDemo: false`.
- Reset/delete demo operations filter on `isDemo === true` — they never touch user records.

---

## 💾 How Local Storage Works

- **Settings** (`zenhr:settings`) — language, currency, company info, work rules, tax brackets, demo flag.
- **Collections** (`zenhr:col:<name>`) — one key per collection (employees, attendance, payroll, etc.).
- **Schema versioning** (`schemaVersion`) — currently v2. On load, the version is checked; if it differs, the version is bumped without breaking existing data.
- **Session** (`sessionStorage:zenhr:session`) — login session with 8-hour TTL.
- Quota-exceeded errors are caught and surfaced to the user with a toast.

Storage is **per-browser, per-device**. Clearing browser data will clear all records. Use the **Backup** feature to export a JSON snapshot before clearing.

---

## 📤 Backup & Restore

### Export
1. Go to **Settings → Backup & Restore**.
2. Click **Create Backup** — downloads `zenhr-backup-YYYY-MM-DD.json`.
3. The file contains all collections, settings, schema version, and an export timestamp.

### Restore
1. Click **Restore Backup** and select a JSON file.
2. The app validates: file is valid JSON, schema version is supported, employee records have IDs and names.
3. A confirmation dialog warns that current data will be replaced.
4. On confirm, all collections are replaced with the backup contents.

### Export (per-module)
Most modules (employees, attendance, leaves, payroll, etc.) have an **Export** button that produces an Excel-compatible `.xls` file with BOM-prefixed UTF-8 encoding so **Arabic text renders correctly** in Excel.

---

## 🔐 Security Limitations (Important)

This is a **static site on GitHub Pages**. The following limitations are inherent and documented honestly:

- **No real authentication** — The local access code is a convenience gate, **not real security**. Anyone with browser devtools can bypass it.
- **No real passwords** — The default code is `admin` and is stored in plain localStorage. **Never hardcode real production passwords.**
- **No employee accounts** — There is no employee login, no employee portal, no employee self-registration. The app is exclusively for the manager/HR administrator.
- **No data sync** — localStorage belongs to the current browser/device only. Data is **not** synchronized across devices.
- **No confidential data** — All 350+ employee records are **fictional**. No real names, IDs, bank details, or salary data are stored in the public repository.
- **Tax/insurance rates are estimates** — The default Egyptian tax brackets and social insurance rates are **placeholders for demonstration**. They are **not legally verified**. Update them in Settings → Insurance & Taxes based on current legal rates before relying on calculations.

For real multi-user authentication, server-side validation, and secure data storage, a backend is required — which is explicitly out of scope for this static project.

---

## 🌍 Language & RTL/LTR

- **Arabic is the default language** with full RTL layout.
- Toggle to **English** at any time via the language button (top-right `EN` / `ع`).
- Layout direction (`dir="rtl"` / `dir="ltr"`) flips automatically.
- All dates, numbers, and currency formats localize based on the active language.
- Toast messages, modal dialogs, and form labels are all translated.
- Navigation persists across language switches.

---

## ⚙️ Acceptance Checklist

- [x] Application opens at GitHub Pages URL with relative paths
- [x] Arabic is the default language with RTL
- [x] English translation works throughout
- [x] Manager/HR-only — no employee login portal
- [x] 358 demo employees generated (deterministic)
- [x] Reloading does not duplicate demo data
- [x] Search, sort, filter, pagination work
- [x] Employees can be added, edited, viewed, archived
- [x] Attendance and leave records reference valid employees
- [x] Payroll calculation uses consistent inputs, no double-counting
- [x] Dashboard totals match stored records
- [x] Reports use real application data
- [x] Backup export creates a valid JSON file
- [x] Restore validates and warns before replacing
- [x] Deleting demo data preserves user-created records
- [x] PWA assets load correctly under repository path
- [x] All module files exist and load in correct order

---

## 📋 Known Limitations

- **Browser storage limit** — localStorage typically allows ~5-10MB per origin. With 358 employees + 11,000 attendance records + 1,400 payroll records, the dataset is well within limits, but adding thousands more records could exceed quota.
- **No background notifications** — Browser-closed notifications are not implemented (would require push service + backend). The in-app notification drawer is updated every 60 seconds while the app is open.
- **No document upload** — The Contracts module tracks metadata only. No actual files are uploaded (would require backend or IndexedDB blob storage).
- **Tax/insurance are estimates** — Verify against current legal rates before relying on calculations.
- **No multi-user** — Single-user (manager/HR) only. No role-based access control.
- **Print uses new window** — Browser print dialogs open in a new window; pop-up blockers may interfere.

---

## 📝 Notes

- **All 350+ employee records are fictional** — created exclusively for demonstration and testing.
- **Tax and insurance calculations are NOT legally certified** — verify against applicable current regulations.
- The default access code is `admin` (changeable in Settings).

---

## 📄 License

This project is provided as-is for demonstration purposes.

© 2026 ZenHR · Crafted to manage your team
