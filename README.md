# AGRIMASTERS HR — نظام إدارة الموارد البشرية

**أجريماسترز — Human Resources Management System**

A complete, professional, Arabic-first HR management platform for a manufacturing company. Built as a static web application (HTML / CSS / vanilla JS) that runs entirely in the browser and deploys cleanly to GitHub Pages — no backend, no server, no cloud dependencies.

---

## 📌 Project Description

AGRIMASTERS HR is a manager/HR-only platform covering the complete employee lifecycle, attendance, shifts, leave, payroll, insurance, recruitment, training, disciplinary actions, documents, reporting, and administration.

The application is **Arabic-first (RTL)** with full **English (LTR)** support, **mobile-first responsive**, and uses a restrained corporate palette based on **forest green, white, and light gray** — suitable for an industrial company.

The system ships with **350+ fictional demo employees** (clearly marked `isDemo: true`) and interconnected records across every module. All demo data can be removed without affecting real user records.

---

## ✨ Implemented Modules (v2.0.0)

### Main
- **Dashboard** — Real-time KPIs computed from stored records: total/active/archived employees, present/late/absent today, missing attendance punches, missing check-outs, pending leaves, pending attendance corrections, on-leave count, today's overtime hours, monthly payroll (with status), allowances/rewards/deductions totals, expiring contracts (60d), expiring documents (30d), open disciplinary cases, offboarding in progress. Plus 4 charts (department distribution, status donut, attendance trend, payroll trend, hiring trend, leave distribution) and Quick Actions panel.
- **Employees** — Full CRUD, search, multi-filter (department / status / type), sort, pagination, archive (with history-preserving warning when employee has attendance/payroll records), detailed employee profile with tabs, XLSX export (real .xlsx via SheetJS), **XLSX/CSV import with preview, column auto-mapping, and duplicate detection**.
- **Attendance** — Daily records with check-in/out, late/overtime/absence tracking, overnight shift support, date-range + status filters, summary stats.
- **Fingerprint Import** — Full workflow: drag-and-drop CSV/XLSX/TXT upload, automatic column mapping, preview (recognized / unknown / duplicate / error counts), manual linking of unknown IDs to employees, rejected-records export, import history with batch management, reconciliation (converts raw punches into attendance records with shift-aware status calculation), and a device-adapter interface (no real connectivity claimed — requires vendor SDK + local service).
- **Leaves** — Annual / sick / emergency / unpaid / other; full lifecycle (pending → approved/rejected/cancelled), overlap detection, day count validation.

### Finance
- **Payroll** — Period-based records with tested calculation model:
  - `Gross = Basic + Allowances + Rewards + Overtime`
  - `Total Deductions = Deductions + Penalties + Insurance(employee) + Tax + Loan installment + Other`
  - `Net = Gross − Total Deductions`
  - Includes month-generation tool that auto-pulls all related records, payslip printing, and XLSX export.
- **Rewards / Allowances / Penalties / Deductions** — Shared finance module pattern (factory) with type, amount, effective date, payroll period, status, and notes. All exports use real `.xlsx` via SheetJS.
- **Insurance & Taxes** — Configurable employee/employer rates, editable tax brackets. **Calculations are configurable placeholders for testing only — verify against current Egyptian legal rates with a licensed accountant.**
- **Loans & Advances** — Original amount, installments, paid/remaining balance, next installment date, automated payment recording.

### Human Resources
- **Departments** — Card-based directory with manager assignment, employee counts, safe-delete protection.
- **Shifts** — Fixed / rotating / day / night / overnight (cross-midnight) / flexible schedules with start/end times, breaks, grace periods, working days, active/inactive status.
- **Documents** — Employee document management: employment contracts, national IDs, passports, qualifications, certificates, insurance docs, medical fitness, police records, military status, etc. Issue/expiry dates, **expiry reminders (valid/expiring/expired/missing status chips)**, document categories, confidential flag, storage location, audit logging.
- **Disciplinary Actions** — Record incidents, investigation notes, employee responses, warning letters, decisions. Approval workflow (open → under_investigation → pending_decision → approved/rejected → closed). Financial deductions linked to payroll period. Audit trail.
- **Offboarding** — Resignation / termination / end-of-contract / retirement / dismissal. Notice period, last working day, **12-item clearance checklist with progress bar**, exit interview notes, final settlement amount, **automatic employee status update on completion** (preserves all historical attendance/payroll records), printable termination statement.
- **Performance Evaluations** — Multi-criteria scoring with overall score, written feedback, recommendations, follow-up dates.
- **Recruitment** — Vacancies + candidates with pipeline stages (new → screening → interview → offer → hired/rejected).
- **Contracts** — Document/contract tracking with expiration warnings (30/60 days) and reminder dates.

### System
- **Reports** — 20 report types: employee directory, active/inactive, departments, attendance, absence, overtime, leaves, payroll, allowances, rewards, penalties, insurance, loans, contracts, **documents, disciplinary, offboarding, fingerprint imports, audit log**, hiring, performance. All exports use **real `.xlsx` via SheetJS** with frozen header rows, auto-filter, RTL sheet view, branded title row, number/money/date formats.
- **Audit Trail** — Records every significant action: create / update / delete / approve / reject / finalize / import / export / archive / restore. Filter by action, entity, user, date range, free-text search. Export to XLSX. Cap of 5000 entries to prevent unbounded growth.
- **Settings** — General (language / currency / access code), company info, work rules (working days, grace, breaks, overtime rate, leave balances, insurance rates, tax brackets), backup/restore, demo data management, about (with security notes & module list).

---

## 🎨 Branding & Interface

- **Application name:** AGRIMASTERS HR
- **Arabic name:** أجريماسترز — نظام إدارة الموارد البشرية
- **Default language:** Arabic (RTL)
- **Alternate language:** English (LTR)
- **Palette:** Forest green (`#14532d` 900 → `#22c55e` 500), white, light gray
- **Typography:** Cairo (Arabic) + Inter (English) with system fallbacks
- **Layout:** Professional sidebar with grouped navigation, mobile drawer, top bar with global search, breadcrumbs, notifications bell
- **Charts:** Custom CSS/SVG bar charts and donut charts (no external chart library)
- **Print:** Branded print layouts for reports and offboarding statements
- **PWA:** Installable, offline-capable via service worker with versioned cache

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (no framework), HTML5, CSS3 |
| Storage | `localStorage` with schema versioning + one-time legacy-prefix migration |
| XLSX | **SheetJS Community Edition** (loaded via CDN) — real `.xlsx` workbooks with cell styling, frozen panes, auto-filter |
| Charts | Custom CSS/SVG (no external chart library) |
| Routing | Hash-based SPA router |
| i18n | Custom Arabic/English dictionary with `data-i18n` attributes |
| PWA | `manifest.json` + service worker with cache-first strategy |
| Deployment | Static files → GitHub Pages (or any static host) |

---

## 📊 Storage & Backup

- **Schema version:** 3 (with auto-migration from previous versions)
- **Prefix:** `agrimasters:` (one-time migration from legacy `zenhr:` prefix preserves existing user data)
- **Collections:** 30+ collections covering employees, organization, attendance, fingerprint, leaves, payroll, finance, insurance, loans, contracts, documents, disciplinary, offboarding, audit, notifications, training, etc.
- **Backup:** Full JSON export with schema version, timestamp, settings, meta, and all collections
- **Restore:** Replace or merge modes with validation
- **Quota handling:** Detects `QuotaExceededError` and surfaces a clear toast

**Important:** localStorage is per-browser-per-device. Records do **not** synchronize between computers. For multi-user production deployment, see "Production Deployment" below.

---

## 🚀 Deployment

### GitHub Pages (default)

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Choose the `main` branch and `/` (root) folder.
4. Save — your site will be live at `https://<username>.github.io/<repo>/`.

The app is fully static — no build step, no server, no environment variables.

### Local testing

```bash
cd agrimasters-hr
python3 -m http.server 8080
# Open http://localhost:8080/
```

Or any static file server (`npx serve`, `php -S localhost:8080`, etc.).

---

## 🔐 Security Notes (Read Before Production Use)

This application is a **single-user local application**. The default access code (`admin`) is a convenience feature, **not real security**.

### What this means

- All data is stored in `localStorage` on whichever browser the user opens.
- The access code can be changed in Settings but is stored in plaintext alongside the data.
- There are **no employee accounts**, **no role-based access control**, and **no server-side authorization**.
- Multiple users on different computers cannot share or synchronize data automatically.
- Direct connection to a fingerprint device requires a **vendor SDK + local service** (browser security prevents direct device communication from a static page).

### For multi-user production deployment

A suitable secured backend is required. Recommended architecture:

- **Frontend:** This static app (deployed to GitHub Pages or CDN).
- **Backend:** Node.js / Express or similar, with authenticated routes.
- **Database:** PostgreSQL or MySQL with role-based authorization.
- **Auth:** JWT or session-based with password hashing (bcrypt/argon2).
- **Audit log:** Server-side table recording every write operation.
- **File storage:** For document uploads (not supported in this version).
- **Device bridge:** Local service (e.g. Node.js on a machine in the device's network) that exposes a REST/WebSocket API the frontend can call.

**No plaintext passwords, device credentials, or secrets should ever be stored in frontend code.**

---

## 🧪 Testing

### Automated test suite (v2.2.0+)

The project ships with a **Vitest + jsdom** test suite that exercises the core
business logic without a browser. Run it locally:

```bash
cd agrimasters-hr
npm install         # one-time, installs vitest + jsdom
npm test            # runs all tests once
npm run test:watch  # re-runs on file changes
npm run syntax-check  # node --check on every JS file
```

**Current coverage:**

| Suite | Tests | What it verifies |
|-------|-------|------------------|
| `unit/storage.test.js` | 22 | CRUD, schema versioning, quota handling, import/export, clearAllDemo, safety guards |
| `unit/utils.test.js` | 29 | HTML escape, money/date/time formatting, time math, initials, clone, debounce |
| `unit/i18n.test.js` | 13 | ar/en translation, language switching, RTL/LTR, DOM `data-i18n` application |
| `unit/audit.test.js` | 9 | Audit log create/query/filter, convenience wrappers, size cap, auditEnabled toggle |
| `unit/confirm-dialog.test.js` | 19 | Standardized Arabic text, double-click prevention, async support, error retry, focus, a11y |
| `integration/employees.test.js` | 12 | Employee CRUD, search, linked-record delete protection, archive flow, audit on delete |
| **Total** | **104** | All passing ✓ |

#### Deletion-confirmation coverage

Every deletion path in the application goes through the shared `UI.confirm()`
dialog in `js/ui.js`. The test suite verifies:

- ✅ Title is forced to `تأكيد الحذف` for any delete-related action
- ✅ Message is forced to `هل أنت متأكد من الحذف؟`
- ✅ Confirm button label is `تأكيد`, cancel is `إلغاء`
- ✅ Clicking `إلغاء` never invokes `onConfirm`
- ✅ Clicking the `×` close button never invokes `onConfirm`
- ✅ Clicking the backdrop never invokes `onConfirm`
- ✅ Repeated rapid clicks on `تأكيد` invoke `onConfirm` **exactly once**
- ✅ Buttons are disabled immediately after confirm click
- ✅ Async `onConfirm` is awaited before the dialog closes
- ✅ If `onConfirm` throws, the dialog stays open and shows an error toast (no false success)
- ✅ After a throw, buttons are re-enabled for retry
- ✅ Focus moves to the confirm button on open (keyboard accessible)
- ✅ Dialog has `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- ✅ Employees with linked records (payroll/attendance/etc.) **cannot** be hard-deleted — must be archived
- ✅ Employees with no linked records can be deleted, but only after confirmation
- ✅ Every confirmed delete writes an audit-log entry

### Manual / in-browser verification (v2.0.0 — still applies)

All JavaScript files pass `node --check` syntax validation. The following scenarios were verified during development:

- ✅ Application boots without console errors
- ✅ Login gate accepts default `admin` code
- ✅ Demo data initializes on first run (350+ employees + interconnected records)
- ✅ All 23 modules render without errors
- ✅ Employee CRUD: create, edit, view detail, archive (with history warning)
- ✅ Duplicate employee ID prevention (auto-incremented sequential IDs)
- ✅ Employee XLSX export → opens in Excel with Arabic headers, frozen rows, autofilter
- ✅ Employee XLSX/CSV import with preview and column auto-mapping
- ✅ Attendance manual entry with overnight shift support
- ✅ Late and overtime calculation based on shift grace/break
- ✅ Fingerprint CSV import with preview, recognized/unknown/duplicate counts
- ✅ Fingerprint reconciliation generates attendance records (skips existing)
- ✅ Leave request and approval workflow
- ✅ Payroll calculation preview and period locking
- ✅ Payslip printing (branded AGRIMASTERS HR layout)
- ✅ Reports center: 20 report types viewable, all with XLSX export
- ✅ Audit trail records create/update/delete/approve/reject/import/export actions
- ✅ Backup JSON export and restore (replace mode)
- ✅ Backup restore (merge mode) preserves existing user records
- ✅ Mobile layout (sidebar drawer, responsive tables)
- ✅ RTL (Arabic) and LTR (English) layouts both render correctly
- ✅ Language toggle preserves current page and data
- ✅ Print layouts branded with AGRIMASTERS HR forest-green theme
- ✅ Legacy `zenhr:` data migrated to `agrimasters:` prefix on first load (existing user data preserved)

### Features requiring external dependencies (NOT tested / NOT claimed)

- ❌ **Direct fingerprint device connection** — Requires confirmed device model, vendor SDK, and a local service. The adapter interface is declared but no real connectivity is claimed.
- ❌ **Legal payroll formula verification** — Insurance rates, tax brackets, and exemption thresholds are configurable placeholders. Must be verified against current Egyptian law by a licensed accountant before official payroll use.
- ❌ **Multi-user role-based permissions** — Requires a secured backend with database-level authorization. The current local-only version does not enforce real role separation.
- ❌ **Employee self-service portal** — Requires authenticated employee accounts. The current version does not include employee logins.
- ❌ **Browser push notifications while the browser is closed** — The internal notification center works in-tab; for closed-browser delivery a push service (VAPID + push API) is required and is not implemented.

---

## 📁 Project Structure

```
agrimasters-hr/
├── index.html              # App shell, branding, script loader
├── manifest.json           # PWA manifest (AGRIMASTERS HR branding)
├── sw.js                   # Service worker (versioned cache v2.2.0)
├── package.json            # Test tooling (vitest + jsdom)
├── vitest.config.js        # Test runner configuration
├── README.md               # This file
├── assets/                 # Icons (PNG/SVG)
├── css/
│   ├── style.css           # CSS manifest (@imports the split files in order)
│   ├── variables.css       # CSS reset + :root design tokens + base body
│   ├── gate.css            # Access gate (login screen)
│   ├── forms.css           # Form field styles
│   ├── buttons.css         # Buttons + icon buttons
│   ├── layout.css          # App shell, sidebar, topbar, main content
│   ├── components.css      # Cards, stats, toolbar, tables, pagination, empty, modal, toast, drawer, charts, detail, tabs
│   ├── responsive.css      # Responsive media queries
│   ├── premium.css         # Premium UI enhancement layer
│   └── modules.css         # Module-specific styles (upload zone, alerts, document chips, print, shift planner)
└── js/
    ├── app.js              # Bootstrap, nav groups, module registry
    ├── auth.js             # Local access gate (convenience only)
    ├── demo-data.js        # 350+ fictional employees + records (seeded RNG)
    ├── i18n.js             # Arabic/English dictionary
    ├── router.js           # Hash-based SPA router
    ├── storage.js          # localStorage layer with schema versioning + migration
    ├── ui.js               # Modals, toasts, tables, badges, charts, forms, shared confirm dialog
    ├── utils.js            # Formatting, dates, money, escape, download, print
    ├── services/
    │   ├── audit.js        # Audit trail logging service
    │   ├── backup.js       # Backup/restore helpers
    │   ├── export.js       # CSV + real .xlsx (SheetJS) + JSON + print
    │   ├── xlsx-import.js  # Generic XLSX/CSV/TXT file reader + validator
    │   ├── rounding.js     # Financial rounding helpers
    │   ├── finance-rules.js # Payroll calculation rules
    │   └── rest-days.js    # Rest-day / weekly-rest helpers
    ├── modules/
    │   ├── dashboard.js
    │   ├── employees.js
    │   ├── departments.js
    │   ├── attendance.js
    │   ├── fingerprint.js       # Fingerprint import & reconciliation
    │   ├── leaves.js
    │   ├── shifts.js
    │   ├── shift-planner.js     # Shift assignment & rotation planner
    │   ├── payroll.js
    │   ├── rewards.js
    │   ├── allowances.js
    │   ├── penalties.js
    │   ├── deductions.js
    │   ├── insurance.js
    │   ├── loans.js
    │   ├── contracts.js
    │   ├── documents.js         # Employee document management
    │   ├── disciplinary.js      # Disciplinary actions & investigations
    │   ├── offboarding.js       # Resignation/termination workflow
    │   ├── performance.js
    │   ├── recruitment.js
    │   ├── reports.js
    │   ├── audit.js             # Audit trail viewer
    │   ├── settings.js
    │   ├── central-settings.js  # Payroll & shift central settings
    │   └── finance-factory.js   # Factory for rewards/allowances/penalties/deductions
    └── tests/
        ├── setup.js             # Vitest setup — loads sources into jsdom
        ├── helpers/
        │   └── reset.js         # resetStorage() helper
        ├── unit/
        │   ├── storage.test.js
        │   ├── utils.test.js
        │   ├── i18n.test.js
        │   ├── audit.test.js
        │   └── confirm-dialog.test.js
        └── integration/
            └── employees.test.js
```

---

## 🆕 v2.2.0 Changelog — Refactor, Testing, Confirmation Hardening

### Codebase reorganization
- **Split the 1969-line `css/style.css`** into 9 focused files (`variables.css`, `gate.css`, `forms.css`, `buttons.css`, `layout.css`, `components.css`, `responsive.css`, `premium.css`, `modules.css`). The main `style.css` is now a small manifest that uses `@import` to pull them in the exact original cascade order — visual behavior is unchanged.
- **Removed 4 dead legacy files** (`js/attendance.js`, `js/employees.js`, `js/leaves.js`, `js/reports.js`) that defined obsolete `ZenStore.setEmployees()` / `ZenStore.setLeaves()` APIs no longer present in the codebase. They were not loaded by `index.html` and only caused confusion.
- **Service worker `CORE_ASSETS`** list updated to cache every split CSS file for offline use.

### Shared confirmation dialog hardening (`js/ui.js`)
- **Double-click prevention**: the confirm button is disabled the moment it is clicked; `onConfirm` can only run once per dialog instance. Repeated rapid clicks (or repeated Enter presses) cannot trigger duplicate deletions.
- **Async support**: `onConfirm` may return a Promise. The dialog stays open with buttons disabled while the promise is in flight, then closes on success.
- **Error recovery**: if `onConfirm` throws (e.g. a `QuotaExceededError`), the dialog stays open, the error is surfaced via a toast, and the buttons are re-enabled so the user can retry. A storage failure can no longer produce a false success notification.
- **Focus management**: focus moves to the confirm button on open for keyboard users.
- **Accessibility**: the dialog now has `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby="confirm-dlg-title"`, `aria-describedby="confirm-dlg-msg"`.
- **Standardized Arabic text**: any delete-related title or message (matched by `حذف | delete | remove | إزالة`) is forced to:
  - Title: `تأكيد الحذف`
  - Message: `هل أنت متأكد من الحذف؟`
  - Confirm: `تأكيد`
  - Cancel: `إلغاء`
- **Informational dialogs preserved**: blocked operations that use `confirm()` without an `onConfirm` (e.g. "cannot delete employee with linked records") keep their custom explanatory text.

### Automated test suite (NEW)
- Added **Vitest + jsdom** test infrastructure with `package.json` and `vitest.config.js`.
- **104 tests** across 6 suites covering storage CRUD, utils, i18n, audit log, the confirm dialog, and employee CRUD integration.
- Run with `npm test` — all tests pass.

### Service worker
- Cache version bumped `v2.1.8 → v2.2.0`.
- `CORE_ASSETS` expanded to include all 9 split CSS files.

---

## 🆕 v2.0.0 Changelog (vs. original ZenHR v1)

### Branding
- Renamed **ZenHR → AGRIMASTERS HR** throughout (HTML, CSS, JS, manifest, service worker, README).
- Forest-green palette: `#0f766e` (teal) → `#14532d` / `#15803d` / `#166534` (forest greens).
- Default company name: `أجريماسترز / AGRIMASTERS`.
- Updated service worker cache name → `agrimasters-hr-v2.0.0`.
- Updated localStorage prefix → `agrimasters:` with one-time migration from `zenhr:` (preserves existing user data).
- Bumped schema version → 3.

### New modules
- **Fingerprint Import** (4 tabs: Import / History / Reconcile / Device Adapters) — full workflow with preview, dedup, unknown linking, reconciliation to attendance, and adapter interface.
- **Disciplinary Actions** — incidents, investigations, employee responses, decisions, approval workflow.
- **Offboarding** — resignation/termination with 12-item clearance checklist, exit interviews, final settlement, auto status update.
- **Documents** — full document management with expiry tracking and status chips (valid/expiring/expired/missing).
- **Audit Trail** — logging service + viewer module with filters, search, and XLSX export.

### Enhancements
- **Real XLSX exports** via SheetJS (replaces HTML-table pseudo-`.xls`). Workbook features: frozen header row, auto-filter, RTL sheet view, branded title row, forest-green header styling, number/money/date formats, column widths.
- **Employee XLSX import** with preview, column auto-mapping, department fuzzy matching, duplicate ID prevention.
- **Enhanced dashboard** with new KPIs: missing attendance, missing check-outs, pending corrections, today's overtime hours, expiring documents, open disciplinary, offboarding in progress, payroll status. Added Quick Actions panel.
- **Audit logging** wired into key operations: employee CRUD, archive, finance exports, fingerprint imports, disciplinary approvals, offboarding completion, document CRUD.
- **Reports center** expanded from 16 → 20 report types (added documents, disciplinary, offboarding, fingerprint imports, audit log).
- **Print layouts** rebranded with AGRIMASTERS HR forest-green theme.

### Bug fixes / Safety
- Employee archive now warns when employee has attendance/payroll history and explicitly preserves historical records.
- Employee ID generation now uses a sequential scan to prevent collisions when IDs are manually deleted.
- Legacy `zenhr:*` data is migrated to `agrimasters:*` on first load (one-time, idempotent).
- Service worker skips cross-origin requests (SheetJS CDN) instead of failing.
- Print CSS hides chrome (sidebar, topbar, pagination) for clean printouts.

---

## 📋 Final Deliverables Summary

1. ✅ A complete branded AGRIMASTERS HR application (forest-green palette, Arabic-first, RTL/LTR, mobile-first).
2. ✅ Module-by-module feature list (see "Implemented Modules" above).
3. ✅ Bug fix list (see "v2.0.0 Changelog → Bug fixes / Safety").
4. ✅ Files created and modified (see "Project Structure" + git diff).
5. ✅ Functional attendance and fingerprint import workflow (manual entry + CSV/XLSX/TXT import with preview/dedup/reconciliation).
6. ✅ Professional XLSX import/export (SheetJS, frozen headers, auto-filter, RTL, branded).
7. ✅ Employee, leave, payroll, and reporting modules (all functional).
8. ✅ Data backup and restore (JSON, replace/merge modes, validation).
9. ✅ Updated README and deployment instructions (this file).
10. ✅ Test report with genuine results (see "Testing" section above).
11. ✅ List of features still requiring backend / device / legal confirmation (see "Features requiring external dependencies").

---

## 📝 License & Attribution

This project builds on the original ZenHR codebase and is rebranded/upgraded as AGRIMASTERS HR. SheetJS Community Edition is used under its license (https://sheetjs.com/).

**© 2026 AGRIMASTERS HR. All data shown in the demo is fictional.**
