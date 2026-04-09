# StockFlow — Inventory Intelligence

React + Vite frontend with a companion C++ engine. Deploys to GitHub Pages.

---

## 📁 File Structure

```
stockflow/
├── index.html                  ← HTML entry
├── vite.config.js              ← Vite config  (set your repo base path here)
├── package.json                ← npm deps + scripts
└── src/
    ├── main.jsx                ← Entire React app (UI, state, charts)
    ├── index.css               ← All styles
    └── stockflow_engine.cpp    ← C++ inventory engine (see below)
```

---

## 🧠 C++ Engine — `src/stockflow_engine.cpp`

The C++ file is a **self-contained inventory engine** that implements the same
core logic as the React UI. It is intended as:

- A runnable reference implementation of StockFlow's business rules
- A demonstration that the data model is UI-independent
- A starting point for a native CLI, server back-end, or desktop port

### What it implements

| Section | Responsibility |
|---------|----------------|
| **Product model** | Validated `Product` struct with `totalValue()`, `statusLabel()`, `isLowStock()` |
| **InventoryEngine** | CRUD, `buyStock`, `sellStock`, search, category stats, top-N by value, CSV I/O |
| **TransactionLedger** | Ring-buffer ledger (≤ 500 entries) recording every mutation with ISO timestamps |
| **ReportPrinter** | Plain-text console output: summary, category breakdown, top products, alert table, ledger view |
| **CSV import/export** | Reads/writes the exact same CSV format as the browser UI's "Export CSV" button |
| **Self-test suite** | 9 unit checks that run on startup — CRUD, buy/sell, oversell guard, search, CSV round-trip, validation |
| **Interactive CLI** | Menu-driven app exercising every subsystem |

### Build & run

```bash
# Requires C++17 or later (GCC, Clang, MSVC all work)
g++ -std=c++17 -O2 -o stockflow src/stockflow_engine.cpp
./stockflow
```

The binary runs self-tests first, then shows an interactive menu:

```
  [SELF-TEST] All checks passed.

  ╔════════════════════════════════════════════════════════╗
  ║         S T O C K F L O W   E N G I N E               ║
  ║     C++ Inventory Core — companion to the React UI     ║
  ╚════════════════════════════════════════════════════════╝
  ┌─ MENU ──────────────────────────────────┐
  │  1  Dashboard summary                   │
  │  2  Category breakdown                  │
  │  3  Top products by value               │
  │  4  Low-stock alerts                    │
  │  5  Search products                     │
  │  6  Add new product                     │
  │  7  Buy / Sell stock                    │
  │  8  Transaction ledger                  │
  │  9  Export CSV                          │
  │  0  Quit                                │
  └─────────────────────────────────────────┘
```

### How the C++ and React sides map to each other

| React (main.jsx) | C++ engine |
|------------------|------------|
| `DEFAULT_DATA` array | `InventoryEngine::seed()` |
| `useInventory` hook — `addProduct` / `updateProduct` / `deleteProduct` | `InventoryEngine::addProduct` / `updateProduct` / `deleteProduct` |
| `buyStock` / `sellStock` | `InventoryEngine::buyStock` / `sellStock` |
| `logSnapshot()` + `TX_KEY` in localStorage | `TransactionLedger::record()` |
| `exportCSV()` | `InventoryEngine::exportCSV()` |
| `DashboardPanel` metrics | `ReportPrinter::printSummary()` |
| `ReportsPanel` category grid | `ReportPrinter::printCategoryBreakdown()` |
| `LowStockPanel` | `ReportPrinter::printAlerts()` |

---

## 💻 Run the React UI locally

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 🚀 Deploy to GitHub Pages

### Step 1 — Create a GitHub repo
Go to github.com → New repository → name it `stockflow`

### Step 2 — Edit vite.config.js
```js
base: '/stockflow/',   // ← must match your repo name exactly
```

### Step 3 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stockflow.git
git push -u origin main
```

### Step 4 — Deploy
```bash
npm run deploy
```

### Step 5 — Enable GitHub Pages
1. Repo → **Settings** → **Pages**
2. Source: branch `gh-pages`, folder `/ (root)`
3. **Save**

Live at: `https://YOUR_USERNAME.github.io/stockflow/`

---

## ⌨️ Keyboard Shortcuts (React UI)

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Add new product |
| `Ctrl+E` | Export CSV |
| `Ctrl+F` | Focus search |
| `Esc`    | Close modal |
