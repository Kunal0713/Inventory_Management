# 📦 StockFlow — Inventory Management Dashboard

A modern inventory management system with a clean web dashboard and core logic implemented in C++. Designed for efficient stock tracking, category analysis, and real-time insights — all in a simple and lightweight setup.

🌐 Live Demo: https://kunal0713.github.io/Inventory_Management

---

# ✨ What is StockFlow?

StockFlow is a dashboard-based inventory system that allows you to manage products, track stock levels, and analyze category-wise distribution from a single interface.

The frontend is built using modern web technologies, while the core business logic — including inventory calculations, stock evaluation, and analytics — is implemented in **C++**.

The system is designed to be simple, fast, and portable, with no dependency on external databases or backend services.

---

# 🖥️ Features

| Feature                | Details                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| 📊 Dashboard           | Real-time stats for total products, inventory value, low stock, and out-of-stock items |
| 📦 Product Management  | Add, view, and manage inventory items                                                  |
| 📉 Stock Alerts        | Detect low stock and out-of-stock items instantly                                      |
| 📊 Category Analysis   | Visual breakdown using bar charts and donut charts                                     |
| 📈 Reports Section     | Detailed insights into inventory distribution                                          |
| 🌗 Dark / Light Mode   | Fully responsive theme support                                                         |
| 🔔 Live Alerts         | Ticker-based alerts for stock changes                                                  |
| 💾 Local Data Handling | Works without external database                                                        |

---

# 🧮 Inventory Logic (C++ Core)

The main inventory computations are implemented in C++:

* Total inventory value calculation
* Category-wise aggregation
* Low stock detection
* Out-of-stock identification
* Sorting and filtering of products

Example logic:

Inventory Value = Σ (Price × Quantity)

Low Stock Condition:
If Quantity ≤ Threshold → Mark as Low Stock

Out of Stock:
If Quantity = 0 → Mark as Out of Stock

---

# 🚀 Quick Start

### Requirements:

* Node.js 18+
* npm

```bash
# 1. Clone the repository
git clone https://github.com/Kunal0713/Inventory_Management.git
cd Inventory_Management

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Build for production
npm run build
```

---

# 🗂️ Project Structure

```
inventory-management/
├── public/
│   └── index.html        ← Main dashboard UI
├── src/
│   ├── app.js            ← Frontend logic
│   ├── charts.js         ← Graph rendering
│   └── utils.js          ← Helper functions
├── inventory_engine.cpp  ← Core C++ logic
├── package.json
├── vite.config.js
└── README.md
```

---

# ⚙️ C++ Engine

The inventory engine is implemented in pure C++ to handle all core computations.

### Compile:

```bash
g++ -o inventory_engine inventory_engine.cpp
```

### Run:

```bash
./inventory_engine
```

### Features of C++ Engine:

* Product management logic
* Inventory calculations
* Category grouping
* Low stock detection
* Summary reporting

---

# 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Charts:** Chart.js
* **Build Tool:** Vite
* **Core Logic:** C++
* **Storage:** Local (in-browser or file-based)

---

# 📸 Pages

* **Dashboard** — Overview of inventory stats and charts
* **Products** — Manage and view items
* **Reports** — Category breakdown and analytics
* **Alerts** — Low stock and out-of-stock notifications

---

# 🎯 Key Highlights

* Strong **C++ core implementation**
* Clean and modern UI
* Lightweight and fast
* No external dependencies required
* Designed for academic and real-world use

---

# 📌 Note

This project demonstrates how modern frontend interfaces can be combined with **C++ for core computation**, making it efficient and scalable.

---

# 👨‍💻 Author

Kunal Anil Deshmukh 
GitHub: https://github.com/Kunal0713
