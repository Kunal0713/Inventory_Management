// ============================================================
//  StockFlow Engine  —  stockflow_engine.cpp
//  C++ back-end logic that mirrors the browser app's behaviour.
//
//  Capabilities implemented here:
//    • Product / inventory data model with full validation
//    • Category management with per-category analytics
//    • Transaction ledger (buy / sell / add / delete / edit)
//    • Inventory reports  (value, alerts, top-N, in-stock %)
//    • CSV import & export  (same format as the UI's Export CSV)
//    • Low-stock & out-of-stock alerts with configurable threshold
//    • Interactive CLI demonstrating every subsystem
//
//  Build (C++17 or later):
//    g++ -std=c++17 -O2 -o stockflow stockflow_engine.cpp
//    ./stockflow
// ============================================================

#include <algorithm>
#include <chrono>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <numeric>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────
//  SECTION 1 — CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────

namespace sf {

constexpr int    LOW_STOCK_DEFAULT_THRESHOLD = 5;
constexpr int    TOP_N_REPORT                = 10;
constexpr double RUPEE_SCALE                 = 100.0;   // paise precision

// Currency formatter:  24999  →  "₹24,999.00"
std::string formatINR(double amount) {
    // Build the decimal part first
    long long paise = static_cast<long long>(amount * 100.0 + 0.5);
    long long rupees = paise / 100;
    int       cents  = static_cast<int>(paise % 100);

    std::string dec = (cents < 10 ? "0" : "") + std::to_string(cents);

    // Indian comma grouping: last 3 digits, then groups of 2
    std::string rs = std::to_string(rupees);
    std::string result;
    int len = static_cast<int>(rs.size());

    if (len <= 3) {
        result = rs;
    } else {
        result = rs.substr(len - 3, 3);
        len -= 3;
        while (len > 0) {
            int take = std::min(len, 2);
            result = rs.substr(len - take, take) + "," + result;
            len -= take;
        }
    }
    return "\xe2\x82\xb9" + result + "." + dec;   // ₹ in UTF-8
}

// ISO-8601 timestamp of right now
std::string nowISO() {
    using clock = std::chrono::system_clock;
    auto t   = clock::to_time_t(clock::now());
    std::tm tm{};
#ifdef _WIN32
    localtime_s(&tm, &t);
#else
    localtime_r(&t, &tm);
#endif
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &tm);
    return buf;
}

// Trim whitespace from both ends of a string
std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    if (a == std::string::npos) return {};
    size_t b = s.find_last_not_of(" \t\r\n");
    return s.substr(a, b - a + 1);
}

// Case-insensitive substring check
bool containsCI(const std::string& haystack, const std::string& needle) {
    if (needle.empty()) return true;
    auto it = std::search(
        haystack.begin(), haystack.end(),
        needle.begin(),   needle.end(),
        [](char a, char b){ return std::tolower((unsigned char)a)
                                 == std::tolower((unsigned char)b); });
    return it != haystack.end();
}

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 2 — PRODUCT MODEL
// ─────────────────────────────────────────────────────────────

namespace sf {

struct Product {
    int         id;
    std::string name;
    std::string category;
    double      price;   // INR, fractional paise allowed
    int         qty;

    // Computed helpers
    double totalValue() const { return price * qty; }

    bool isOutOfStock() const { return qty == 0; }
    bool isLowStock(int threshold = LOW_STOCK_DEFAULT_THRESHOLD) const {
        return qty > 0 && qty <= threshold;
    }

    std::string statusLabel(int threshold = LOW_STOCK_DEFAULT_THRESHOLD) const {
        if (qty == 0)               return "OUT OF STOCK";
        if (qty <= threshold)       return "LOW STOCK";
        return "IN STOCK";
    }

    // Validation: throws std::invalid_argument on bad data
    static void validate(const std::string& name,
                         const std::string& category,
                         double             price,
                         int                qty) {
        if (trim(name).empty())
            throw std::invalid_argument("Product name cannot be empty.");
        if (trim(category).empty())
            throw std::invalid_argument("Category cannot be empty.");
        if (price < 0)
            throw std::invalid_argument("Price cannot be negative.");
        if (qty < 0)
            throw std::invalid_argument("Quantity cannot be negative.");
    }
};

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 3 — TRANSACTION LEDGER
// ─────────────────────────────────────────────────────────────

namespace sf {

enum class TxType {
    ADD, UPDATE, DELETE, BUY, SELL
};

std::string txLabel(TxType t) {
    switch (t) {
        case TxType::ADD:    return "ADD";
        case TxType::UPDATE: return "UPDATE";
        case TxType::DELETE: return "DELETE";
        case TxType::BUY:    return "BUY";
        case TxType::SELL:   return "SELL";
    }
    return "UNKNOWN";
}

struct Transaction {
    std::string timestamp;
    TxType      type;
    int         productId;
    std::string note;           // human-readable summary
    double      inventoryValue; // snapshot of total value after tx
};

class TransactionLedger {
public:
    static constexpr size_t MAX_ENTRIES = 500;

    void record(TxType type, int productId,
                const std::string& note, double inventoryValue) {
        if (entries_.size() >= MAX_ENTRIES)
            entries_.erase(entries_.begin());   // ring-buffer behaviour
        entries_.push_back({ nowISO(), type, productId, note, inventoryValue });
    }

    const std::vector<Transaction>& all() const { return entries_; }

    // Most recent N entries, newest first
    std::vector<Transaction> recent(size_t n = 20) const {
        std::vector<Transaction> out;
        size_t start = entries_.size() > n ? entries_.size() - n : 0;
        for (size_t i = entries_.size(); i > start; --i)
            out.push_back(entries_[i - 1]);
        return out;
    }

private:
    std::vector<Transaction> entries_;
};

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — INVENTORY ENGINE (core operations)
// ─────────────────────────────────────────────────────────────

namespace sf {

class InventoryEngine {
public:
    // ── Constructor: seed with default data matching the React app ──
    explicit InventoryEngine(bool seedDefaults = true) {
        if (seedDefaults) seed();
    }

    // ── CRUD ────────────────────────────────────────────────────────

    int addProduct(const std::string& name, const std::string& category,
                   double price, int qty) {
        Product::validate(name, category, price, qty);
        int id = nextId_++;
        products_.push_back({ id, trim(name), trim(category), price, qty });
        ledger_.record(TxType::ADD, id, "Added: " + name, totalValue());
        return id;
    }

    void updateProduct(int id, const std::string& name,
                       const std::string& category,
                       double price, int qty) {
        Product::validate(name, category, price, qty);
        Product& p = findRef(id);
        p.name     = trim(name);
        p.category = trim(category);
        p.price    = price;
        p.qty      = qty;
        ledger_.record(TxType::UPDATE, id, "Updated: " + name, totalValue());
    }

    void deleteProduct(int id) {
        auto it = findIter(id);
        std::string name = it->name;
        products_.erase(it);
        ledger_.record(TxType::DELETE, id, "Deleted: " + name, totalValue());
    }

    // ── Stock operations ─────────────────────────────────────────────

    void buyStock(int id, int qty) {
        if (qty <= 0)
            throw std::invalid_argument("Buy quantity must be positive.");
        Product& p = findRef(id);
        p.qty += qty;
        ledger_.record(TxType::BUY, id,
                       "Buy " + std::to_string(qty) + " × " + p.name,
                       totalValue());
    }

    void sellStock(int id, int qty) {
        if (qty <= 0)
            throw std::invalid_argument("Sell quantity must be positive.");
        Product& p = findRef(id);
        if (qty > p.qty)
            throw std::runtime_error("Insufficient stock for " + p.name
                                     + " (have " + std::to_string(p.qty) + ").");
        p.qty -= qty;
        ledger_.record(TxType::SELL, id,
                       "Sell " + std::to_string(qty) + " × " + p.name,
                       totalValue());
    }

    // ── Queries ───────────────────────────────────────────────────────

    std::optional<Product> findById(int id) const {
        for (const auto& p : products_)
            if (p.id == id) return p;
        return std::nullopt;
    }

    // Search by ID substring or name substring (case-insensitive)
    std::vector<Product> search(const std::string& query,
                                const std::string& filterCategory = "") const {
        std::vector<Product> out;
        for (const auto& p : products_) {
            bool nameMatch = containsCI(p.name, query)
                          || containsCI(std::to_string(p.id), query);
            bool catMatch  = filterCategory.empty()
                          || p.category == filterCategory;
            if (nameMatch && catMatch)
                out.push_back(p);
        }
        return out;
    }

    std::vector<Product> byCategory(const std::string& cat) const {
        return search("", cat);
    }

    std::vector<Product> lowStock(int threshold = LOW_STOCK_DEFAULT_THRESHOLD) const {
        std::vector<Product> out;
        for (const auto& p : products_)
            if (p.qty == 0 || p.qty <= threshold)
                out.push_back(p);
        std::sort(out.begin(), out.end(),
                  [](const Product& a, const Product& b){ return a.qty < b.qty; });
        return out;
    }

    std::vector<Product> outOfStock() const {
        std::vector<Product> out;
        for (const auto& p : products_)
            if (p.qty == 0) out.push_back(p);
        return out;
    }

    const std::vector<Product>& allProducts() const { return products_; }

    // ── Aggregate helpers ─────────────────────────────────────────────

    double totalValue() const {
        double sum = 0;
        for (const auto& p : products_) sum += p.totalValue();
        return sum;
    }

    double averagePrice() const {
        if (products_.empty()) return 0;
        double sum = 0;
        for (const auto& p : products_) sum += p.price;
        return sum / products_.size();
    }

    double inStockPercent() const {
        if (products_.empty()) return 0;
        int inStock = 0;
        for (const auto& p : products_) if (p.qty > 0) ++inStock;
        return 100.0 * inStock / products_.size();
    }

    // Per-category aggregates: { category → { count, totalValue, avgPrice } }
    struct CatStats {
        int    count;
        double totalValue;
        double avgPrice;
        double pctOfTotal;
    };
    std::map<std::string, CatStats> categoryStats() const {
        std::map<std::string, CatStats> m;
        for (const auto& p : products_) {
            auto& s = m[p.category];
            s.count++;
            s.totalValue += p.totalValue();
            s.avgPrice   += p.price;
        }
        double total = totalValue();
        for (auto& [cat, s] : m) {
            if (s.count > 0) s.avgPrice /= s.count;
            s.pctOfTotal = total > 0 ? 100.0 * s.totalValue / total : 0;
        }
        return m;
    }

    // Top-N products by total value
    std::vector<Product> topByValue(int n = TOP_N_REPORT) const {
        std::vector<Product> sorted(products_);
        std::sort(sorted.begin(), sorted.end(),
                  [](const Product& a, const Product& b){
                      return a.totalValue() > b.totalValue();
                  });
        if (static_cast<int>(sorted.size()) > n)
            sorted.resize(n);
        return sorted;
    }

    // All unique category names
    std::vector<std::string> categories() const {
        std::vector<std::string> cats;
        for (const auto& p : products_) {
            if (std::find(cats.begin(), cats.end(), p.category) == cats.end())
                cats.push_back(p.category);
        }
        std::sort(cats.begin(), cats.end());
        return cats;
    }

    // ── Ledger access ─────────────────────────────────────────────────
    const TransactionLedger& ledger() const { return ledger_; }

    // ── CSV I/O ───────────────────────────────────────────────────────

    // Export all products to a CSV file (same schema as UI's Export CSV)
    bool exportCSV(const std::string& path) const {
        std::ofstream f(path);
        if (!f) return false;
        f << "ProductID,Name,Category,Price,Quantity\n";
        for (const auto& p : products_) {
            // Escape double-quotes inside the name field
            std::string safeName = p.name;
            size_t pos = 0;
            while ((pos = safeName.find('"', pos)) != std::string::npos) {
                safeName.insert(pos, "\"");
                pos += 2;
            }
            f << p.id << ",\"" << safeName << "\","
              << p.category << "," << std::fixed << std::setprecision(2)
              << p.price << "," << p.qty << "\n";
        }
        return true;
    }

    // Import products from a CSV file (skips header row; id column ignored)
    // Returns { imported, skipped } counts.
    std::pair<int,int> importCSV(const std::string& path) {
        std::ifstream f(path);
        if (!f) throw std::runtime_error("Cannot open: " + path);

        int imported = 0, skipped = 0;
        std::string line;
        std::getline(f, line); // skip header

        while (std::getline(f, line)) {
            line = trim(line);
            if (line.empty()) continue;

            std::istringstream ss(line);
            std::string idStr, name, category, priceStr, qtyStr;

            std::getline(ss, idStr, ',');
            // Name may be quoted
            if (ss.peek() == '"') {
                ss.get(); // consume opening quote
                std::getline(ss, name, '"');
                ss.get(); // consume comma after closing quote
            } else {
                std::getline(ss, name, ',');
            }
            std::getline(ss, category, ',');
            std::getline(ss, priceStr, ',');
            std::getline(ss, qtyStr);

            try {
                double price = std::stod(trim(priceStr));
                int    qty   = std::stoi(trim(qtyStr));
                addProduct(trim(name), trim(category), price, qty);
                ++imported;
            } catch (...) {
                ++skipped;
            }
        }
        return { imported, skipped };
    }

private:
    // ── Internal helpers ──────────────────────────────────────────────

    Product& findRef(int id) {
        for (auto& p : products_)
            if (p.id == id) return p;
        throw std::runtime_error("Product not found: id=" + std::to_string(id));
    }

    std::vector<Product>::iterator findIter(int id) {
        auto it = std::find_if(products_.begin(), products_.end(),
                               [id](const Product& p){ return p.id == id; });
        if (it == products_.end())
            throw std::runtime_error("Product not found: id=" + std::to_string(id));
        return it;
    }

    // ── Default data — mirrors DEFAULT_DATA in main.jsx ───────────────
    void seed() {
        struct Raw { std::string name, cat; double price; int qty; };
        static const Raw defaults[] = {
            { "Sony WH-1000XM5 Headphones",      "Electronics", 24999, 12 },
            { "Apple AirPods Pro (2nd Gen)",      "Electronics", 19999,  3 },
            { "Levi's 511 Slim Fit Jeans",        "Clothing",     3499, 25 },
            { "Nike Air Max 270",                 "Sports",       8999,  0 },
            { "Staedtler Mars Lumograph Set",     "Stationery",    749,  5 },
            { "Basmati Premium Rice 5kg",         "Groceries",     599, 42 },
            { "Whey Protein Isolate 2kg",         "Health",       3299,  2 },
            { "IKEA POANG Armchair",              "Furniture",    9999,  3 },
            { "Boat Airdopes 141",                "Electronics",  1499,  0 },
            { "Casio G-Shock GA-2100",            "Electronics",  8499,  4 },
            { "Decathlon Kiprun Running Shoes",   "Sports",       5999, 18 },
            { "Yonex Badminton Racket",           "Sports",       3499, 14 },
            { "Cosco Volleyball",                 "Sports",       1299, 20 },
            { "Wildcraft Trekking Backpack",      "Sports",       4999,  9 },
            { "IKEA KALLAX Shelf Unit",           "Furniture",   12999,  4 },
            { "Wakefit Orthopedic Mattress",      "Furniture",   18999,  2 },
            { "Godrej Interio Study Table",       "Furniture",    8499,  3 },
            { "Amazon Basics Office Chair",       "Furniture",    7999,  3 },
            { "Classmate Premium Notebook Set",   "Stationery",    399, 80 },
            { "Parker Vector Fountain Pen",       "Stationery",    599, 35 },
            { "Camlin Kokuyo Art Kit",            "Stationery",   1299, 22 },
            { "Tata Salt 1kg Pack x10",           "Groceries",     899, 55 },
            { "Aashirvaad Atta 10kg",             "Groceries",     549, 60 },
            { "Dabur Honey 500g",                 "Groceries",     329, 48 },
            { "Amul Ghee 1L",                     "Groceries",     599, 35 },
            { "Himalaya Neem Face Wash",          "Health",        199, 60 },
            { "Omron Digital BP Monitor",         "Health",       2499, 12 },
            { "HealthKart Multivitamin 60 Tabs",  "Health",        899, 28 },
            { "Lakme Absolute Foundation",        "Health",        799, 22 },
            { "Allen Solly Formal Shirt",         "Clothing",     1799, 30 },
            { "H&M Crewneck Sweatshirt",          "Clothing",     2499, 18 },
            { "Woodland Casual Chinos",           "Clothing",     2999, 15 },
        };

        for (const auto& d : defaults) {
            products_.push_back({ nextId_++, d.name, d.cat, d.price, d.qty });
        }
        ledger_.record(TxType::ADD, 0, "Seeded default inventory", totalValue());
    }

    std::vector<Product> products_;
    TransactionLedger    ledger_;
    int                  nextId_ = 1001;
};

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 5 — REPORT PRINTER  (plain-text console output)
// ─────────────────────────────────────────────────────────────

namespace sf {

class ReportPrinter {
public:
    explicit ReportPrinter(const InventoryEngine& eng) : eng_(eng) {}

    // Summary dashboard block
    void printSummary() const {
        auto& prods = eng_.allProducts();
        int   total = static_cast<int>(prods.size());
        int   out   = static_cast<int>(eng_.outOfStock().size());
        int   low   = static_cast<int>(eng_.lowStock().size()) - out;

        line('=', 60);
        center("StockFlow — Inventory Summary", 60);
        center(sf::nowISO(), 60);
        line('=', 60);
        col("Total SKUs",       std::to_string(total));
        col("Total Value",      sf::formatINR(eng_.totalValue()));
        col("Average Price",    sf::formatINR(eng_.averagePrice()));
        col("In-Stock %",       pct(eng_.inStockPercent()));
        col("Out of Stock",     std::to_string(out));
        col("Low Stock (<= 5)", std::to_string(low));
        line('-', 60);
    }

    // Per-category breakdown
    void printCategoryBreakdown() const {
        auto stats = eng_.categoryStats();
        line('-', 72);
        std::cout << std::left
                  << std::setw(16) << "Category"
                  << std::setw(8)  << "SKUs"
                  << std::setw(20) << "Total Value"
                  << std::setw(18) << "Avg Price"
                  << std::setw(8)  << "Share\n";
        line('-', 72);
        for (const auto& [cat, s] : stats) {
            std::cout << std::left
                      << std::setw(16) << cat
                      << std::setw(8)  << s.count
                      << std::setw(20) << sf::formatINR(s.totalValue)
                      << std::setw(18) << sf::formatINR(s.avgPrice)
                      << std::setw(8)  << pct(s.pctOfTotal) << "\n";
        }
        line('-', 72);
    }

    // Top-N products by total value
    void printTopProducts(int n = sf::TOP_N_REPORT) const {
        auto top = eng_.topByValue(n);
        double total = eng_.totalValue();
        line('-', 80);
        std::cout << std::left
                  << std::setw(5)  << "Rank"
                  << std::setw(6)  << "ID"
                  << std::setw(34) << "Product"
                  << std::setw(14) << "Price"
                  << std::setw(6)  << "Qty"
                  << std::setw(14) << "Value"
                  << "Share\n";
        line('-', 80);
        int rank = 1;
        for (const auto& p : top) {
            double share = total > 0 ? 100.0 * p.totalValue() / total : 0;
            std::string shortName = p.name.size() > 32
                                    ? p.name.substr(0,31) + "…"
                                    : p.name;
            std::cout << std::left
                      << std::setw(5)  << rank++
                      << std::setw(6)  << p.id
                      << std::setw(34) << shortName
                      << std::setw(14) << sf::formatINR(p.price)
                      << std::setw(6)  << p.qty
                      << std::setw(14) << sf::formatINR(p.totalValue())
                      << pct(share) << "\n";
        }
        line('-', 80);
    }

    // Low-stock / out-of-stock alert table
    void printAlerts(int threshold = sf::LOW_STOCK_DEFAULT_THRESHOLD) const {
        auto alerts = eng_.lowStock(threshold);
        if (alerts.empty()) {
            std::cout << "  ✓  All products stocked above threshold (" << threshold << ")\n";
            return;
        }
        line('-', 64);
        std::cout << std::left
                  << std::setw(6)  << "ID"
                  << std::setw(34) << "Product"
                  << std::setw(12) << "Qty"
                  << "Status\n";
        line('-', 64);
        for (const auto& p : alerts) {
            std::string shortName = p.name.size() > 32
                                    ? p.name.substr(0,31) + "…"
                                    : p.name;
            std::cout << std::left
                      << std::setw(6)  << p.id
                      << std::setw(34) << shortName
                      << std::setw(12) << p.qty
                      << p.statusLabel(threshold) << "\n";
        }
        line('-', 64);
    }

    // Recent transaction log
    void printLedger(size_t n = 15) const {
        auto txs = eng_.ledger().recent(n);
        line('-', 72);
        std::cout << std::left
                  << std::setw(22) << "Timestamp"
                  << std::setw(9)  << "Type"
                  << std::setw(7)  << "ID"
                  << std::setw(34) << "Note\n";
        line('-', 72);
        for (const auto& tx : txs) {
            std::cout << std::left
                      << std::setw(22) << tx.timestamp
                      << std::setw(9)  << sf::txLabel(tx.type)
                      << std::setw(7)  << tx.productId
                      << tx.note << "\n";
        }
        line('-', 72);
    }

private:
    const InventoryEngine& eng_;

    static void line(char c, int w) {
        std::cout << std::string(w, c) << "\n";
    }
    static void center(const std::string& s, int w) {
        int pad = (w - static_cast<int>(s.size())) / 2;
        if (pad < 0) pad = 0;
        std::cout << std::string(pad, ' ') << s << "\n";
    }
    static void col(const std::string& label, const std::string& val) {
        std::cout << std::left << std::setw(30) << label
                  << val << "\n";
    }
    static std::string pct(double v) {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(1) << v << "%";
        return ss.str();
    }
};

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 6 — INTERACTIVE CLI
// ─────────────────────────────────────────────────────────────

namespace sf {

class CLI {
public:
    void run() {
        printBanner();
        bool quit = false;
        while (!quit) {
            printMenu();
            int choice = readInt("> ");
            std::cout << "\n";
            switch (choice) {
                case 1:  demoSummary();      break;
                case 2:  demoCategoryView(); break;
                case 3:  demoTopProducts();  break;
                case 4:  demoAlerts();       break;
                case 5:  demoSearch();       break;
                case 6:  demoAdd();          break;
                case 7:  demoBuySell();      break;
                case 8:  demoLedger();       break;
                case 9:  demoExportCSV();    break;
                case 0:  quit = true;        break;
                default: std::cout << "  Invalid option. Try again.\n\n"; break;
            }
        }
        std::cout << "\n  Goodbye!\n\n";
    }

private:
    InventoryEngine eng_;

    // ── Demo actions ──────────────────────────────────────────────────

    void demoSummary() {
        ReportPrinter rp(eng_);
        rp.printSummary();
        std::cout << "\n";
    }

    void demoCategoryView() {
        ReportPrinter rp(eng_);
        std::cout << "\n  CATEGORY BREAKDOWN\n";
        rp.printCategoryBreakdown();
        std::cout << "\n";
    }

    void demoTopProducts() {
        ReportPrinter rp(eng_);
        std::cout << "\n  TOP " << sf::TOP_N_REPORT << " PRODUCTS BY VALUE\n";
        rp.printTopProducts();
        std::cout << "\n";
    }

    void demoAlerts() {
        int threshold = readInt("  Low-stock threshold [5]: ", 5);
        ReportPrinter rp(eng_);
        std::cout << "\n  LOW-STOCK / OUT-OF-STOCK ALERTS (threshold = "
                  << threshold << ")\n";
        rp.printAlerts(threshold);
        std::cout << "\n";
    }

    void demoSearch() {
        std::string q = readLine("  Search query (name or ID): ");
        auto results = eng_.search(q);
        std::cout << "\n  Found " << results.size() << " result(s):\n";
        printProductTable(results);
        std::cout << "\n";
    }

    void demoAdd() {
        std::cout << "  ADD NEW PRODUCT\n";
        std::string name  = readLine("  Name: ");
        std::string cat   = readLine("  Category: ");
        double price      = readDouble("  Price (INR): ");
        int    qty        = readInt("  Quantity: ");
        try {
            int id = eng_.addProduct(name, cat, price, qty);
            std::cout << "  ✓ Product added with ID " << id << "\n\n";
        } catch (const std::exception& ex) {
            std::cout << "  ✗ Error: " << ex.what() << "\n\n";
        }
    }

    void demoBuySell() {
        int  id  = readInt("  Product ID: ");
        char op  = 's';
        std::cout << "  Operation — (b)uy or (s)ell? ";
        std::cin >> op; std::cin.ignore();
        int qty = readInt("  Quantity: ");
        try {
            if (op == 'b' || op == 'B')  eng_.buyStock(id, qty);
            else                          eng_.sellStock(id, qty);
            auto prod = eng_.findById(id);
            if (prod) {
                std::cout << "  ✓ Done. New qty for \"" << prod->name
                          << "\": " << prod->qty << "\n\n";
            }
        } catch (const std::exception& ex) {
            std::cout << "  ✗ Error: " << ex.what() << "\n\n";
        }
    }

    void demoLedger() {
        ReportPrinter rp(eng_);
        std::cout << "\n  TRANSACTION LEDGER (last 15)\n";
        rp.printLedger(15);
        std::cout << "\n";
    }

    void demoExportCSV() {
        std::string path = readLine("  Output file [inventory.csv]: ");
        if (path.empty()) path = "inventory.csv";
        if (eng_.exportCSV(path))
            std::cout << "  ✓ Exported " << eng_.allProducts().size()
                      << " products to " << path << "\n\n";
        else
            std::cout << "  ✗ Failed to write " << path << "\n\n";
    }

    // ── Utilities ─────────────────────────────────────────────────────

    static void printProductTable(const std::vector<sf::Product>& prods) {
        if (prods.empty()) {
            std::cout << "  (no results)\n";
            return;
        }
        std::cout << "\n  " << std::left
                  << std::setw(6)  << "ID"
                  << std::setw(34) << "Name"
                  << std::setw(14) << "Category"
                  << std::setw(12) << "Price"
                  << std::setw(6)  << "Qty"
                  << "Status\n";
        std::cout << "  " << std::string(80, '-') << "\n";
        for (const auto& p : prods) {
            std::string shortName = p.name.size() > 32
                                    ? p.name.substr(0,31) + "…"
                                    : p.name;
            std::cout << "  " << std::left
                      << std::setw(6)  << p.id
                      << std::setw(34) << shortName
                      << std::setw(14) << p.category
                      << std::setw(12) << sf::formatINR(p.price)
                      << std::setw(6)  << p.qty
                      << p.statusLabel() << "\n";
        }
    }

    static void printBanner() {
        std::cout << R"(
  ╔════════════════════════════════════════════════════════╗
  ║         S T O C K F L O W   E N G I N E               ║
  ║     C++ Inventory Core — companion to the React UI     ║
  ╚════════════════════════════════════════════════════════╝
)";
    }

    static void printMenu() {
        std::cout << "  ┌─ MENU ──────────────────────────────────┐\n"
                     "  │  1  Dashboard summary                   │\n"
                     "  │  2  Category breakdown                  │\n"
                     "  │  3  Top products by value               │\n"
                     "  │  4  Low-stock alerts                    │\n"
                     "  │  5  Search products                     │\n"
                     "  │  6  Add new product                     │\n"
                     "  │  7  Buy / Sell stock                    │\n"
                     "  │  8  Transaction ledger                  │\n"
                     "  │  9  Export CSV                          │\n"
                     "  │  0  Quit                                │\n"
                     "  └─────────────────────────────────────────┘\n";
    }

    static int readInt(const std::string& prompt, int def = 0) {
        std::cout << prompt;
        std::string line;
        std::getline(std::cin, line);
        line = sf::trim(line);
        if (line.empty()) return def;
        try { return std::stoi(line); } catch (...) { return def; }
    }

    static double readDouble(const std::string& prompt, double def = 0.0) {
        std::cout << prompt;
        std::string line;
        std::getline(std::cin, line);
        line = sf::trim(line);
        if (line.empty()) return def;
        try { return std::stod(line); } catch (...) { return def; }
    }

    static std::string readLine(const std::string& prompt) {
        std::cout << prompt;
        std::string line;
        std::getline(std::cin, line);
        return sf::trim(line);
    }
};

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 7 — SELF-TEST (runs before the interactive CLI)
// ─────────────────────────────────────────────────────────────

namespace sf {

void runSelfTest() {
    std::cout << "\n  [SELF-TEST] Running engine unit checks...\n";

    InventoryEngine eng(false); // no seed

    // 1. Add products
    int id1 = eng.addProduct("Widget Alpha", "Electronics", 999.0, 10);
    int id2 = eng.addProduct("Widget Beta",  "Electronics", 499.5, 3);
    int id3 = eng.addProduct("Widget Gamma", "Clothing",    1499.0, 0);

    // 2. Value assertions
    double expectedVal = 999.0*10 + 499.5*3 + 1499.0*0;
    if (std::abs(eng.totalValue() - expectedVal) > 0.01)
        throw std::logic_error("FAIL: totalValue mismatch");

    // 3. Buy / Sell
    eng.buyStock(id2, 7);  // qty → 10
    eng.sellStock(id1, 4); // qty → 6
    auto p1 = eng.findById(id1); if (!p1 || p1->qty != 6)
        throw std::logic_error("FAIL: sell qty wrong");
    auto p2 = eng.findById(id2); if (!p2 || p2->qty != 10)
        throw std::logic_error("FAIL: buy qty wrong");

    // 4. Low-stock detection
    auto alerts = eng.lowStock(5);
    bool found3 = std::any_of(alerts.begin(), alerts.end(),
                               [id3](const Product& p){ return p.id == id3; });
    if (!found3) throw std::logic_error("FAIL: out-of-stock not in alerts");

    // 5. Search
    auto res = eng.search("Alpha");
    if (res.empty() || res[0].id != id1)
        throw std::logic_error("FAIL: search did not find Widget Alpha");

    // 6. Update + delete
    eng.updateProduct(id3, "Widget Gamma v2", "Clothing", 1599.0, 5);
    auto p3u = eng.findById(id3);
    if (!p3u || p3u->price != 1599.0 || p3u->qty != 5)
        throw std::logic_error("FAIL: updateProduct");
    eng.deleteProduct(id3);
    if (eng.findById(id3).has_value())
        throw std::logic_error("FAIL: deleteProduct");

    // 7. CSV round-trip
    std::string tmpFile = "/tmp/sf_test_export.csv";
    eng.exportCSV(tmpFile);
    InventoryEngine eng2(false);
    auto [imported, skipped] = eng2.importCSV(tmpFile);
    if (imported != 2 || skipped != 0)
        throw std::logic_error("FAIL: CSV round-trip counts wrong");
    if (std::abs(eng2.totalValue() - eng.totalValue()) > 0.01)
        throw std::logic_error("FAIL: CSV round-trip value mismatch");

    // 8. Validation
    bool threw = false;
    try { eng.addProduct("", "Cat", 100, 5); }
    catch (const std::invalid_argument&) { threw = true; }
    if (!threw) throw std::logic_error("FAIL: empty name should throw");

    // 9. Oversell guard
    threw = false;
    try { eng.sellStock(id1, 9999); }
    catch (const std::runtime_error&) { threw = true; }
    if (!threw) throw std::logic_error("FAIL: oversell should throw");

    std::cout << "  [SELF-TEST] All checks passed.\n\n";
}

} // namespace sf

// ─────────────────────────────────────────────────────────────
//  SECTION 8 — MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────

int main() {
    try {
        sf::runSelfTest();
    } catch (const std::exception& ex) {
        std::cerr << "\n  SELF-TEST FAILED: " << ex.what() << "\n";
        return 1;
    }

    sf::CLI cli;
    cli.run();
    return 0;
}
