import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import Chart from 'chart.js/auto'
import './index.css'

// ================================================================
//  DATA — DEFAULT INVENTORY
// ================================================================
const DEFAULT_DATA = [
  { id: 1001, name: 'Sony WH-1000XM5 Headphones',    category: 'Electronics', price: 24999, qty: 12 },
  { id: 1002, name: 'Apple AirPods Pro (2nd Gen)',     category: 'Electronics', price: 19999, qty: 3  },
  { id: 1003, name: "Levi's 511 Slim Fit Jeans",       category: 'Clothing',    price: 3499,  qty: 25 },
  { id: 1004, name: 'Nike Air Max 270',                category: 'Sports',      price: 8999,  qty: 0  },
  { id: 1005, name: 'Staedtler Mars Lumograph Set',    category: 'Stationery',  price: 749,   qty: 5  },
  { id: 1006, name: 'Basmati Premium Rice 5kg',        category: 'Groceries',   price: 599,   qty: 42 },
  { id: 1007, name: 'Whey Protein Isolate 2kg',        category: 'Health',      price: 3299,  qty: 2  },
  { id: 1008, name: 'IKEA POÄNG Armchair',             category: 'Furniture',   price: 9999,  qty: 3  },
  { id: 1009, name: 'Boat Airdopes 141',               category: 'Electronics', price: 1499,  qty: 0  },
  { id: 1010, name: 'Casio G-Shock GA-2100',           category: 'Electronics', price: 8499,  qty: 4  },
  { id: 1011, name: 'Decathlon Kiprun Running Shoes',  category: 'Sports',      price: 5999,  qty: 18 },
  { id: 1012, name: 'Yonex Badminton Racket',          category: 'Sports',      price: 3499,  qty: 14 },
  { id: 1013, name: 'Cosco Volleyball',                category: 'Sports',      price: 1299,  qty: 20 },
  { id: 1014, name: 'Wildcraft Trekking Backpack',     category: 'Sports',      price: 4999,  qty: 9  },
  { id: 1015, name: 'IKEA KALLAX Shelf Unit',          category: 'Furniture',   price: 12999, qty: 4  },
  { id: 1016, name: 'Wakefit Orthopedic Mattress',     category: 'Furniture',   price: 18999, qty: 2  },
  { id: 1017, name: 'Godrej Interio Study Table',      category: 'Furniture',   price: 8499,  qty: 3  },
  { id: 1018, name: 'Amazon Basics Office Chair',      category: 'Furniture',   price: 7999,  qty: 3  },
  { id: 1019, name: 'Classmate Premium Notebook Set',  category: 'Stationery',  price: 399,   qty: 80 },
  { id: 1020, name: 'Parker Vector Fountain Pen',      category: 'Stationery',  price: 599,   qty: 35 },
  { id: 1021, name: 'Camlin Kokuyo Art Kit',           category: 'Stationery',  price: 1299,  qty: 22 },
  { id: 1022, name: 'Tata Salt 1kg Pack x10',          category: 'Groceries',   price: 899,   qty: 55 },
  { id: 1023, name: 'Aashirvaad Atta 10kg',            category: 'Groceries',   price: 549,   qty: 60 },
  { id: 1024, name: 'Dabur Honey 500g',                category: 'Groceries',   price: 329,   qty: 48 },
  { id: 1025, name: 'Amul Ghee 1L',                    category: 'Groceries',   price: 599,   qty: 35 },
  { id: 1026, name: 'Himalaya Neem Face Wash',         category: 'Health',      price: 199,   qty: 60 },
  { id: 1027, name: 'Omron Digital BP Monitor',        category: 'Health',      price: 2499,  qty: 12 },
  { id: 1028, name: 'HealthKart Multivitamin 60 Tabs', category: 'Health',      price: 899,   qty: 28 },
  { id: 1029, name: 'Lakme Absolute Foundation',       category: 'Health',      price: 799,   qty: 22 },
  { id: 1030, name: 'Allen Solly Formal Shirt',        category: 'Clothing',    price: 1799,  qty: 30 },
  { id: 1031, name: 'H&M Crewneck Sweatshirt',         category: 'Clothing',    price: 2499,  qty: 18 },
  { id: 1032, name: 'Woodland Casual Chinos',          category: 'Clothing',    price: 2999,  qty: 15 },
]

// ================================================================
//  HELPERS
// ================================================================
const CAT_COLORS = {
  Electronics: '#4F6EF7', Clothing: '#8B5CF6', Groceries: '#10B981',
  Stationery:  '#0EA5E9', Sports:   '#F59E0B', Furniture: '#F43F5E',
  Health:      '#EC4899', General:  '#64748B',
}
const catColor  = (c) => CAT_COLORS[c] || '#94A3B8'
const fmtPrice  = (p) => '₹' + Number(p).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtShortK = (v) => '₹' + Math.round(v / 1000) + 'k'

const DATA_KEY = 'sf_data', VER_KEY = 'sf_data_ver', TX_KEY = 'sf_txlog', DATA_VER = 'v29'

function loadData() {
  if (localStorage.getItem(VER_KEY) !== DATA_VER) {
    localStorage.removeItem(DATA_KEY); localStorage.removeItem(TX_KEY)
    localStorage.setItem(VER_KEY, DATA_VER)
  }
  const raw = localStorage.getItem(DATA_KEY)
  return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DATA))
}
const saveData = (d) => localStorage.setItem(DATA_KEY, JSON.stringify(d))
function logSnapshot(data, note) {
  const val = data.reduce((s, p) => s + p.price * p.qty, 0)
  const log = JSON.parse(localStorage.getItem(TX_KEY) || '[]')
  log.push({ ts: new Date().toISOString(), val, note: note || 'update' })
  localStorage.setItem(TX_KEY, JSON.stringify(log.slice(-100)))
}
function exportCSV(products) {
  const rows = ['ProductID,Name,Category,Price,Quantity',
    ...products.map((p) => `${p.id},"${p.name}",${p.category},${p.price},${p.qty}`)]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  a.download = 'inventory.csv'; a.click()
}

// ================================================================
//  HOOK — useInventory
// ================================================================
function useInventory() {
  const [products, setProducts] = useState(loadData)
  const commit = useCallback((fn, note) => {
    setProducts((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      saveData(next); logSnapshot(next, note); return next
    })
  }, [])
  const addProduct    = (p)       => commit((prev) => [...prev, p],                               'Added: '   + p.name)
  const updateProduct = (id, p)   => commit((prev) => prev.map((x) => x.id === id ? { ...x, ...p } : x), 'Updated: ' + p.name)
  const deleteProduct = (id)      => commit((prev) => prev.filter((x) => x.id !== id),            'Deleted: ' + id)
  const buyStock      = (id, qty) => commit((prev) => prev.map((x) => x.id === id ? { ...x, qty: x.qty + qty } : x), 'Buy: ' + id)
  const sellStock     = (id, qty) => commit((prev) => prev.map((x) => x.id === id ? { ...x, qty: x.qty - qty } : x), 'Sell: ' + id)
  return { products, addProduct, updateProduct, deleteProduct, buyStock, sellStock }
}

// ================================================================
//  HOOK — useToast
// ================================================================
let _tid = 0
function useToast() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type = 'ok') => {
    const id = ++_tid
    setToasts((prev) => [...prev, { id, msg, type, show: false }])
    setTimeout(() => setToasts((prev) => prev.map((t) => t.id === id ? { ...t, show: true } : t)), 20)
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, show: false } : t))
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 450)
    }, 3500)
  }, [])
  return { toasts, push }
}

// ================================================================
//  SHARED UI ATOMS
// ================================================================
const CatPill = ({ category }) => {
  const col = catColor(category)
  return <span className="cpill" style={{ color: col, borderColor: col + '28', background: col + '14' }}>{category}</span>
}

const StatusPill = ({ qty }) => {
  if (qty === 0) return <span className="spill sp-out"><span className="pip" />Out of Stock</span>
  if (qty <= 5)  return <span className="spill sp-lo"><span className="pip"  />Low Stock</span>
  return               <span className="spill sp-in"><span className="pip"  />In Stock</span>
}

const EmptyRow = ({ colSpan, icon = '🔍', message, sub }) => (
  <tr><td colSpan={colSpan}>
    <div className="empty">
      <div className="empty-ic">{icon}</div>
      <div className="empty-m">{message}</div>
      {sub && <div className="empty-s">{sub}</div>}
    </div>
  </td></tr>
)

// SVG icons
const IcoPlus  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
const IcoMinus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="8" x2="13" y2="8"/></svg>
const IcoEdit  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l2 2L5 12H3v-2L10.5 2.5z"/></svg>
const IcoTrash = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,4 13,4"/><path d="M5 4V3h5v1"/><path d="M4 4l.8 9h6.4L12 4"/></svg>
const IcoSearch= () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="13.5" y2="13.5"/></svg>

// Product table row
const ProductRow = ({ product: p, rank, showValue, onBuy, onSell, onEdit, onDelete }) => (
  <tr>
    <td className="td-rank">{rank}</td>
    <td className="td-id">#{p.id}</td>
    <td className="td-name">{p.name}</td>
    <td><CatPill category={p.category} /></td>
    <td className="prc">{fmtPrice(p.price)}</td>
    <td className="qty">{p.qty}</td>
    {showValue && <td className="td-val">{fmtPrice(p.price * p.qty)}</td>}
    <td><StatusPill qty={p.qty} /></td>
    <td>
      <div className="arow">
        <button className="ab buy"  onClick={() => onBuy(p.id)}    title="Purchase Stock"><IcoPlus  /></button>
        <button className="ab sell" onClick={() => onSell(p.id)}   title="Sell Stock"><IcoMinus /></button>
        <button className="ab ed"   onClick={() => onEdit(p.id)}   title="Edit Product"><IcoEdit  /></button>
        <button className="ab dl"   onClick={() => onDelete(p.id)} title="Delete Product"><IcoTrash /></button>
      </div>
    </td>
  </tr>
)

// ================================================================
//  CHART COMPONENTS
// ================================================================
function buildCatData(products) {
  const map = {}
  products.forEach((p) => { map[p.category] = (map[p.category] || 0) + p.price * p.qty })
  const cats = Object.keys(map).sort((a, b) => map[b] - map[a])
  return { cats, vals: cats.map((c) => map[c]), cols: cats.map((c) => catColor(c)) }
}

function BarChart({ products, dark }) {
  const ref = useRef(null); const ch = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (ch.current) ch.current.destroy()
    const { cats, vals, cols } = buildCatData(products)
    const tc = dark ? '#6B7280' : '#9CA3AF', gc = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ch.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: cats, datasets: [{ data: vals, backgroundColor: cols.map((c) => c + (dark ? 'E6' : 'CC')), borderWidth: 0, borderRadius: 8, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 4, bottom: 8 } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ₹' + ctx.raw.toLocaleString('en-IN') } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: tc, font: { family: "'DM Mono',monospace", size: 10 } }, border: { display: false } },
          y: { grid: { color: gc }, ticks: { color: tc, font: { family: "'DM Mono',monospace", size: 10 }, callback: (v) => '₹' + Math.round(v / 1000) + 'k' }, border: { display: false } },
        },
      },
    })
    return () => ch.current?.destroy()
  }, [products, dark])
  return <canvas ref={ref} />
}

function DonutChart({ products, dark, byValue }) {
  const ref = useRef(null); const ch = useRef(null)
  const total = products.reduce((s, p) => s + p.price * p.qty, 0)
  useEffect(() => {
    if (!ref.current) return
    if (ch.current) ch.current.destroy()
    let cats, data, cols
    if (byValue) {
      const d = buildCatData(products); cats = d.cats; data = d.vals; cols = d.cols
    } else {
      const map = {}; products.forEach((p) => { map[p.category] = (map[p.category] || 0) + 1 })
      cats = Object.keys(map); data = cats.map((c) => map[c]); cols = cats.map((c) => catColor(c))
    }
    ch.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: cats, datasets: [{ data, backgroundColor: cols.map((c) => c + (dark ? 'E6' : 'CC')), borderColor: dark ? 'rgba(15,23,42,0.8)' : '#fff', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: { legend: { display: false },
          tooltip: byValue ? { callbacks: { label: (ctx) => ' ₹' + ctx.raw.toLocaleString('en-IN') + ' (' + Math.round(ctx.raw / (total || 1) * 100) + '%)' } } : {},
        },
      },
    })
    return () => ch.current?.destroy()
  }, [products, dark, byValue, total])
  return <canvas ref={ref} />
}

function HBarChart({ products, dark }) {
  const ref = useRef(null); const ch = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (ch.current) ch.current.destroy()
    const { cats, vals, cols } = buildCatData(products)
    const tc = dark ? '#6B7280' : '#9CA3AF', gc = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ch.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: cats, datasets: [{ data: vals, backgroundColor: cols.map((c) => c + (dark ? 'CC' : 'BB')), borderWidth: 0, borderRadius: 6, borderSkipped: false }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ₹' + ctx.raw.toLocaleString('en-IN') } } },
        scales: {
          x: { grid: { color: gc }, ticks: { color: tc, font: { family: "'DM Mono',monospace", size: 9 }, callback: (v) => '₹' + Math.round(v / 1000) + 'k' }, border: { display: false } },
          y: { grid: { display: false }, ticks: { color: tc, font: { family: "'DM Mono',monospace", size: 10 } }, border: { display: false } },
        },
      },
    })
    return () => ch.current?.destroy()
  }, [products, dark])
  return <canvas ref={ref} />
}

// ================================================================
//  MODALS
// ================================================================
const CATS = ['Electronics', 'Clothing', 'Groceries', 'Stationery', 'Sports', 'Furniture', 'Health', 'General']

function ProductModal({ open, editProduct, existingIds, onSave, onClose, toast }) {
  const isEdit = !!editProduct
  const idRef = useRef(null)
  const [f, setF] = useState({ id: '', name: '', category: 'Electronics', price: '', qty: '' })
  const s = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (!open) return
    if (isEdit) setF({ id: String(editProduct.id), name: editProduct.name, category: editProduct.category, price: String(editProduct.price), qty: String(editProduct.qty) })
    else { setF({ id: '', name: '', category: 'Electronics', price: '', qty: '' }); setTimeout(() => idRef.current?.focus(), 120) }
  }, [open, isEdit, editProduct])

  const save = () => {
    const id = isEdit ? editProduct.id : parseInt(f.id)
    const nm = f.name.trim(), pr = parseFloat(f.price), qt = parseInt(f.qty)
    if (!id || id <= 0)      return toast('Product ID must be positive.', 'err')
    if (!nm)                 return toast('Product name cannot be empty.', 'err')
    if (isNaN(pr) || pr < 0) return toast('Price cannot be negative.', 'err')
    if (isNaN(qt) || qt < 0) return toast('Quantity cannot be negative.', 'err')
    if (!isEdit && existingIds.includes(id)) return toast(`ID #${id} already exists.`, 'err')
    onSave({ id, name: nm, category: f.category, price: pr, qty: qt })
    toast(isEdit ? `"${nm}" updated.` : `"${nm}" added to inventory.`, 'ok')
    onClose()
  }
  if (!open) return null
  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh"><div className="mt"><span>{isEdit ? '✏' : '➕'}</span><span>{isEdit ? 'Edit Product' : 'Add New Product'}</span></div><button className="cls" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div className="fgrid">
            <div className="fg"><label className="fl">Product ID</label><input ref={idRef} className="fi" type="number" placeholder="e.g. 1001" min="1" value={f.id} onChange={s('id')} disabled={isEdit} /></div>
            <div className="fg"><label className="fl">Category</label><select className="fs" value={f.category} onChange={s('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="fg"><label className="fl">Product Name</label><input className="fi" type="text" placeholder="e.g. Sony WH-1000XM5" value={f.name} onChange={s('name')} /></div>
          <div className="fgrid">
            <div className="fg"><label className="fl">Price (₹)</label><input className="fi" type="number" placeholder="0.00" step="0.01" min="0" value={f.price} onChange={s('price')} /></div>
            <div className="fg"><label className="fl">Quantity</label><input className="fi" type="number" placeholder="0" min="0" value={f.qty} onChange={s('qty')} /></div>
          </div>
        </div>
        <div className="mf"><button className="btn btn-g" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={save}>💾 Save Product</button></div>
      </div>
    </div>
  )
}

function StockModal({ open, product, mode, onConfirm, onClose, toast }) {
  const [qty, setQty] = useState(''); const inputRef = useRef(null)
  useEffect(() => { if (open) { setQty(''); setTimeout(() => inputRef.current?.focus(), 120) } }, [open])
  const isBuy = mode === 'buy'
  const confirm = () => {
    const q = parseInt(qty)
    if (!q || q <= 0) return toast('Enter a positive quantity.', 'err')
    if (!isBuy && q > product.qty) return toast(`Insufficient stock. Only ${product.qty} available.`, 'err')
    onConfirm(q)
    toast(isBuy ? `Purchased ${q} units. New stock: ${product.qty + q}.` : `Sold ${q} units. Remaining: ${product.qty - q}.`, 'ok')
    onClose()
  }
  if (!open || !product) return null
  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="mh"><div className="mt">{isBuy ? '📥 Purchase Stock' : '📤 Sell Stock'}</div><button className="cls" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div className="fg"><label className="fl">Product</label><input className="fi" value={product.name} readOnly style={{ opacity: .6 }} /></div>
          <div className="fg"><label className="fl">Current Stock</label><input className="fi" value={product.qty + ' units'} readOnly style={{ opacity: .6, fontFamily: 'var(--font-mono)' }} /></div>
          <div className="fg"><label className="fl">{isBuy ? 'Quantity to Add' : 'Quantity to Sell'}</label><input ref={inputRef} className="fi" type="number" placeholder="Enter quantity" min="1" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirm()} /></div>
        </div>
        <div className="mf"><button className="btn btn-g" onClick={onClose}>Cancel</button><button className={`btn ${isBuy ? 'btn-p' : 'btn-a'}`} onClick={confirm}>{isBuy ? 'Purchase' : 'Sell'}</button></div>
      </div>
    </div>
  )
}

function DeleteModal({ open, product, onConfirm, onClose, toast }) {
  const confirm = () => { onConfirm(); toast(`"${product?.name}" deleted.`, 'warn'); onClose() }
  if (!open || !product) return null
  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="mh"><div className="mt">🗑 Confirm Delete</div><button className="cls" onClick={onClose}>✕</button></div>
        <div className="mb"><p style={{ color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.6 }}>Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{product?.name}</strong>? This action cannot be undone.</p></div>
        <div className="mf"><button className="btn btn-g" onClick={onClose}>Cancel</button><button className="btn btn-d" onClick={confirm}>🗑 Delete</button></div>
      </div>
    </div>
  )
}

// ================================================================
//  DASHBOARD PANEL
// ================================================================
function KpiCard({ klass, icon, badge, badgeClass, label, value, sub }) {
  const sparks = Array.from({ length: 7 }, (_, i) => i < 6 ? Math.floor(Math.random() * 60 + 20) : 100)
  return (
    <div className={`kpi ${klass}`}>
      <div className="kpi-body">
        <div className="kpi-top"><div className="kpi-ico">{icon}</div><div className={`kpi-trend ${badgeClass}`}>{badge}</div></div>
        <div className="kpi-lbl">{label}</div>
        <div className="kpi-val">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        <div className="spark-bar-wrap">{sparks.map((h, i) => <div key={i} className="spark-b" style={{ height: Math.max(Math.round(h * 26 / 100), 3) }} />)}</div>
      </div>
      <div className="kpi-foot"><div className="kpi-foot-fill" /></div>
    </div>
  )
}

function DashboardPanel({ products, dark, onAdd, onLowStock, onExport, onBuy, onSell, onEdit, onDelete, onViewAll }) {
  const total = products.length
  const val   = products.reduce((s, p) => s + p.price * p.qty, 0)
  const low   = products.filter((p) => p.qty > 0 && p.qty <= 5).length
  const out   = products.filter((p) => p.qty === 0).length
  const sorted = [...products].sort((a, b) => b.id - a.id)

  // Category mix for legend
  const catCounts = {}
  products.forEach((p) => { catCounts[p.category] = (catCounts[p.category] || 0) + 1 })

  // Alert list
  const lowList = products.filter((p) => p.qty > 0 && p.qty <= 5)
  const outList = products.filter((p) => p.qty === 0)

  return (
    <div className="panel active">
      {/* KPI GRID */}
      <div className="kpi-grid">
        <KpiCard klass="em" icon="📦" badge="▲ Active"   badgeClass="tr-u" label="Total Products"  value={total}               sub="SKUs in catalogue" />
        <KpiCard klass="vi" icon="📊" badge="▲ Active"   badgeClass="tr-u" label="Inventory Value" value={fmtShortK(val)}       sub="Total stock valuation" />
        <KpiCard klass="am" icon="⚡" badge={low > 0 ? `⚠ ${low} Alert` : '— None'} badgeClass={low > 0 ? 'tr-w' : 'tr-u'} label="Low Stock"  value={low} sub="Below threshold (≤5)" />
        <KpiCard klass="ro" icon="🚫" badge={out > 0 ? `⚠ ${out} Alert` : '— None'} badgeClass={out > 0 ? 'tr-d' : 'tr-u'} label="Out of Stock" value={out} sub="Zero quantity items" />
      </div>

      {/* CHARTS ROW */}
      <div className="srow c31">
        <div className="gc" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ch"><div className="ct"><div className="tdot dcy" />Value by Category</div><div className="cmeta">Live</div></div>
          <div className="cb" style={{ paddingBottom: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 180, width: '100%', position: 'relative' }}><BarChart products={products} dark={dark} /></div>
          </div>
        </div>
        <div className="gc">
          <div className="ch"><div className="ct"><div className="tdot dvi" />Category Mix</div></div>
          <div className="cb">
            <div style={{ height: 148, position: 'relative', width: '100%' }}>
              <DonutChart products={products} dark={dark} byValue={false} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontFamily: 'var(--font-num)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: '.5rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3 }}>SKUs</div>
              </div>
            </div>
            <div className="leg-list">
              {Object.entries(catCounts).map(([c, n]) => (
                <div key={c} className="leg-item"><div className="leg-dot" style={{ background: catColor(c) }} /><span className="leg-lbl">{c}</span><span className="leg-val">{n}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PRODUCTS TABLE */}
      <div className="srow" style={{ gridTemplateColumns: '1fr' }}>
        <div className="gc">
          <div className="ch" style={{ marginBottom: 4 }}>
            <div className="ct"><div className="tdot dem" />Recent Products <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>({sorted.length})</span></div>
            <button className="btn btn-g" style={{ fontSize: '.74rem', padding: '5px 12px' }} onClick={onViewAll}>View All →</button>
          </div>
          <div className="tscroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table>
              <thead><tr><th className="col-rank">#</th><th className="col-id">ID</th><th>Product</th><th>Category</th><th className="col-price">Price</th><th className="col-qty">Qty</th><th className="col-value">Value</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{sorted.length === 0 ? <EmptyRow colSpan={9} icon="📦" message="No products yet" sub="Add your first product to get started" /> : sorted.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} showValue onBuy={onBuy} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS + ALERTS */}
      <div className="srow c31" style={{ marginBottom: 0 }}>
        <div className="gc" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ch"><div className="ct"><div className="tdot dam" />Quick Actions</div></div>
          <div className="qa" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button className="qa-btn" onClick={onAdd}><div className="qa-ico" style={{ background: 'rgba(0,255,179,.12)' }}>➕</div><div><div className="qa-tt">Add Product</div><div className="qa-st">Register new SKU</div></div></button>
            <button className="qa-btn" onClick={onLowStock}><div className="qa-ico" style={{ background: 'rgba(255,190,85,.12)' }}>⚡</div><div><div className="qa-tt">Low Stock</div><div className="qa-st">Items needing restock</div></div></button>
            <button className="qa-btn" onClick={onExport}><div className="qa-ico" style={{ background: 'rgba(0,212,255,.12)' }}>⬇</div><div><div className="qa-tt">Export CSV</div><div className="qa-st">Download inventory</div></div></button>
          </div>
        </div>
        <div className="gc">
          <div className="ch"><div className="ct"><div className="tdot dro" />Alerts</div></div>
          <div className="qa">
            {outList.length > 0 && <div className="alert-s al-d">🚫 {outList.length} product{outList.length > 1 ? 's' : ''} out of stock</div>}
            {lowList.length > 0 && <div className="alert-s al-w">⚡ {lowList.length} product{lowList.length > 1 ? 's' : ''} running low</div>}
            {!outList.length && !lowList.length && <div className="alert-s al-ok">✓ All products stocked normally</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  PRODUCTS PANEL
// ================================================================
function ProductsPanel({ products, onAdd, onExport, onBuy, onSell, onEdit, onDelete }) {
  const [q, setQ] = useState('')
  const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || String(p.id).includes(q)) : products
  return (
    <div className="panel active">
      <div className="gc">
        <div className="ch">
          <div className="ct"><div className="tdot dem" />All Products <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>({filtered.length})</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-g" style={{ fontSize: '.74rem', padding: '5px 12px' }} onClick={onExport}>⬇ Export</button>
            <button className="btn btn-p" style={{ fontSize: '.74rem', padding: '5px 13px' }} onClick={onAdd}>＋ Add</button>
          </div>
        </div>
        <div style={{ padding: '12px 21px 0' }}>
          <div className="srch-w" style={{ width: '100%', maxWidth: 320 }}>
            <span className="srch-ic">⌕</span>
            <input className="srch" style={{ width: '100%', paddingLeft: 32 }} placeholder="Filter by name or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="tscroll">
          <table>
            <thead><tr><th className="col-rank">#</th><th className="col-id">ID</th><th>Product Name</th><th>Category</th><th className="col-price">Price</th><th className="col-qty">Qty</th><th className="col-value">Value</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.length === 0 ? <EmptyRow colSpan={9} message="No products found" /> : filtered.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} showValue onBuy={onBuy} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  SEARCH PANEL
// ================================================================
function SearchPanel({ products, initialQ, onBuy, onSell, onEdit, onDelete }) {
  const [q, setQ] = useState(initialQ || ''); const [mode, setMode] = useState('both'); const [cat, setCat] = useState('')
  const cats = [...new Set(products.map((p) => p.category))].sort()
  let data = products
  if (q) { if (mode === 'id') data = data.filter((p) => String(p.id).includes(q)); else if (mode === 'name') data = data.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())); else data = data.filter((p) => String(p.id).includes(q) || p.name.toLowerCase().includes(q.toLowerCase())) }
  if (cat) data = data.filter((p) => p.category === cat)
  return (
    <div className="panel active">
      <div className="gc">
        <div className="ch"><div className="ct"><div className="tdot dcy" />Product Search</div></div>
        <div className="cb">
          <div className="spwrap">
            <div className="srch-w" style={{ flex: 1, minWidth: 180 }}><span className="srch-ic">⌕</span><input className="srch" style={{ width: '100%' }} placeholder="ID or name keyword…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="fs" style={{ width: 165 }} value={mode} onChange={(e) => setMode(e.target.value)}><option value="both">ID or Name</option><option value="id">By ID</option><option value="name">By Name</option></select>
            <select className="fs" style={{ width: 145 }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All Categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <button className="btn btn-g" onClick={() => { setQ(''); setMode('both'); setCat('') }}>Clear</button>
          </div>
          <div className="tscroll">
            <table>
              <thead><tr><th className="col-rank">#</th><th className="col-id">ID</th><th>Name</th><th>Category</th><th className="col-price">Price</th><th className="col-qty">Qty</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{data.length === 0 ? <EmptyRow colSpan={8} message="No products matched" sub="Try a different keyword or filter" /> : data.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} showValue={false} onBuy={onBuy} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  REPORTS PANEL
// ================================================================
function ReportsPanel({ products, dark }) {
  const total = products.reduce((s, p) => s + p.price * p.qty, 0)
  const avgPrice = products.length ? Math.round(products.reduce((s, p) => s + p.price, 0) / products.length) : 0
  const inStockPct = products.length ? Math.round(products.filter((p) => p.qty > 0).length / products.length * 100) : 0
  const catMap = {}
  products.forEach((p) => { if (!catMap[p.category]) catMap[p.category] = { count: 0, val: 0 }; catMap[p.category].count++; catMap[p.category].val += p.price * p.qty })
  const catData = Object.entries(catMap).map(([cat, d]) => ({ cat, count: d.count, catVal: d.val, pct: total > 0 ? Math.round(d.val / total * 100) : 0 })).sort((a, b) => b.catVal - a.catVal)
  const sorted = [...products].sort((a, b) => (b.price * b.qty) - (a.price * a.qty)).slice(0, 10)
  const avgText = avgPrice >= 1000 ? '₹' + Math.round(avgPrice / 1000) + 'k' : '₹' + avgPrice
  return (
    <div className="panel active" style={{ display: 'block' }}>
      <div style={{ display: 'grid', gap: 17 }}>
        <div className="srow" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          {/* Value Overview */}
          <div className="gc" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ch"><div className="ct"><div className="tdot dcy" />Inventory Value Overview</div></div>
            <div className="cb" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Total Inventory Value</div>
                <div className="rbig" style={{ color: 'var(--color-accent)' }}>{'₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="rgrid">
                {[{ label: 'Total SKUs', val: products.length, col: 'var(--color-success)' }, { label: 'Avg Price', val: avgText, col: 'var(--color-accent)' }, { label: 'In Stock', val: inStockPct + '%', col: 'var(--color-warning)' }].map(({ label, val, col }) => (
                  <div key={label} className="rst" style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', fontWeight: 800, color: col, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '.54rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '4px 0' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--card-border)' }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: 20, minHeight: 200 }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 200, height: 200 }}>
                    <DonutChart products={products} dark={dark} byValue />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontFamily: 'var(--font-num)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{catData.length}</div>
                      <div style={{ fontSize: '.5rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3 }}>categories</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
                  {catData.map(({ cat, catVal, pct }) => {
                    const col = catColor(cat), sv = catVal >= 1000 ? fmtShortK(catVal) : '₹' + catVal
                    return <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: '5px 0', borderBottom: '1px solid var(--card-border)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '.78rem', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{sv}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* Category Breakdown */}
          <div className="gc" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ch"><div className="ct"><div className="tdot dam" />Category Breakdown</div></div>
            <div className="cb" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 200, width: '100%', position: 'relative', marginBottom: 14, flexShrink: 0 }}><HBarChart products={products} dark={dark} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 9 }}>
                {catData.map(({ cat, count, catVal, pct }) => {
                  const col = catColor(cat), sv = fmtShortK(catVal)
                  return <div key={cat} className="rst" style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', fontWeight: 800, color: col, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: '.54rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '4px 0 7px' }}>{cat}</div>
                    <div className="pbar" style={{ height: 3, marginBottom: 6 }}><div className="pfill" style={{ width: Math.max(pct, 3) + '%', background: col }} /></div>
                    <div style={{ fontSize: '.67rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', opacity: .85 }}>{sv} · {pct}%</div>
                  </div>
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Top Products */}
        <div className="gc">
          <div className="ch"><div className="ct"><div className="tdot dem" />Top Products by Value</div></div>
          <div className="tscroll">
            <table>
              <thead><tr><th>Rank</th><th>Product</th><th>Category</th><th className="col-price">Price</th><th className="col-qty">Qty</th><th className="col-value">Total Value</th><th>Share</th></tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const tv = p.price * p.qty, share = Math.round(tv / (total || 1) * 1000) / 10, barW = Math.round(tv / (total || 1) * 100), col = catColor(p.category)
                  return <tr key={p.id}>
                    <td className="td-rank">{i + 1}</td><td className="td-name">{p.name}</td><td><CatPill category={p.category} /></td>
                    <td className="prc">{fmtPrice(p.price)}</td><td className="qty">{p.qty}</td><td className="td-val">{fmtPrice(tv)}</td>
                    <td style={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 3, background: 'var(--input-bg)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: barW + '%', height: '100%', background: col, borderRadius: 2, opacity: .7 }} /></div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.67rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{share}%</span>
                      </div>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  LOW STOCK PANEL
// ================================================================
function LowStockPanel({ products, onBuy, onSell, onEdit, onDelete }) {
  const [threshold, setThreshold] = useState(5)
  const data = products.filter((p) => p.qty === 0 || p.qty <= threshold).sort((a, b) => a.qty - b.qty)
  return (
    <div className="panel active">
      <div className="gc">
        <div className="ch">
          <div className="ct"><div className="tdot dam" />Low Stock Alert</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Threshold:</label>
            <input className="fi" type="number" value={threshold} min="1" max="100" style={{ width: 66, padding: '5px 9px', fontFamily: 'var(--font-mono)', fontSize: '.82rem', textAlign: 'center' }} onChange={(e) => setThreshold(parseInt(e.target.value) || 5)} />
          </div>
        </div>
        <div className="tscroll">
          <table>
            <thead><tr><th className="col-rank">#</th><th className="col-id">ID</th><th>Product</th><th>Category</th><th className="col-price">Price</th><th className="col-qty">Qty</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{data.length === 0 ? <EmptyRow colSpan={8} icon="✅" message={`All products stocked above ${threshold} units`} /> : data.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} showValue={false} onBuy={onBuy} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  TICKER + CLOCK + TOAST
// ================================================================
function Ticker({ products }) {
  const out = products.filter((p) => p.qty === 0)
  const low = products.filter((p) => p.qty > 0 && p.qty <= 5)
  if (!out.length && !low.length) return null
  const items = [
    ...out.map((p, i) => <React.Fragment key={'o' + i}><span className="tick-item danger"><span className="tick-tag">OUT OF STOCK</span>{p.name} (Qty: 0)</span><span className="tick-sep"> ‧ </span></React.Fragment>),
    ...low.map((p, i) => <React.Fragment key={'l' + i}><span className="tick-item warn"><span className="tick-tag">LOW STOCK</span>{p.name} (Only {p.qty} left · ₹{p.price.toLocaleString('en-IN')})</span><span className="tick-sep"> ‧ </span></React.Fragment>),
  ]
  return <div className="ticker-wrap"><div className="ticker-label">● LIVE ALERTS</div><div className="ticker-track"><div className="ticker-inner">{items}{items}</div></div></div>
}

function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => { const n = new Date(); let h = n.getHours(), m = n.getMinutes(), s = n.getSeconds(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; const p = (x) => String(x).padStart(2, '0'); setT(`${p(h)}:${p(m)}:${p(s)} ${ap}`) }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <div className="tb-clock">{t}</div>
}

function Toasts({ toasts }) {
  const ico = { ok: '✓', err: '✕', warn: '⚡' }
  return <div id="toast-wrap">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}${t.show ? ' show' : ''}`}><span className="t-ico">{ico[t.type]}</span><span className="t-msg">{t.msg}</span></div>)}</div>
}

// ================================================================
//  SIDEBAR
// ================================================================
function Sidebar({ active, onNav, alertCount }) {
  const sections = [
    { label: 'WORKSPACE', items: [{ id: 'dash', icon: '⊙', label: 'Dashboard' }, { id: 'inv', icon: '⊞', label: 'Products' }, { id: 'srch', icon: '◎', label: 'Search' }] },
    { label: 'ANALYTICS', items: [{ id: 'rpt', icon: '⊙', label: 'Reports' }, { id: 'low', icon: '⚠', label: 'Low Stock', badge: alertCount }] },
    { label: 'ACTIONS',   items: [{ id: 'add', icon: '+', label: 'Add Product', action: true }, { id: 'exp', icon: '↓', label: 'Export CSV', action: true }] },
  ]
  return (
    <div className="sidebar">
      <div className="sb-logo">
        <div className="logo-mark">📦</div>
        <div className="sb-logo-text"><div className="logo-name">StockFlow</div><div className="logo-tag">Inventory Intelligence</div></div>
      </div>
      {sections.map(({ label, items }) => (
        <div key={label} className="nav-section">
          <div className="nav-label">{label}</div>
          {items.map(({ id, icon, label: lbl, badge, action }) => (
            <div key={id} className={`nav-item${active === id && !action ? ' active' : ''}`} data-tip={lbl} onClick={() => onNav(id)}>
              <div className="nav-icon">{icon}</div>
              <span className="nav-text">{lbl}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </div>
      ))}
      <div className="sb-foot"><div className="led" /><span className="sb-foot-text">System Online</span><span className="vtag">v1.0</span></div>
    </div>
  )
}

// ================================================================
//  APP ROOT
// ================================================================
function App() {
  const { products, addProduct, updateProduct, deleteProduct, buyStock, sellStock } = useInventory()
  const { toasts, push: toast } = useToast()
  const [dark,  setDark]  = useState(() => localStorage.getItem('sf_theme') !== 'light')
  const [mini,  setMini]  = useState(() => localStorage.getItem('sf_sb') === '1')
  const [panel, setPanel] = useState('dash')
  const [tbQ,   setTbQ]   = useState('')
  const tbTimer = useRef(null)

  // Modal state
  const [addOpen,   setAddOpen]   = useState(false)
  const [editProd,  setEditProd]  = useState(null)
  const [stockId,   setStockId]   = useState(null)
  const [stockMode, setStockMode] = useState('buy')
  const [delId,     setDelId]     = useState(null)

  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); localStorage.setItem('sf_theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { document.documentElement.setAttribute('data-sb', mini ? 'mini' : ''); localStorage.setItem('sf_sb', mini ? '1' : '0') }, [mini])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { setAddOpen(false); setEditProd(null); setStockId(null); setDelId(null) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setAddOpen(true) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') { e.preventDefault(); exportCSV(products); toast('inventory.csv downloaded.', 'ok') }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); document.getElementById('tb-srch')?.focus() }
    }
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h)
  }, [products, toast])

  const handleNav = (id) => {
    if (id === 'add') { setAddOpen(true); return }
    if (id === 'exp') { exportCSV(products); toast('inventory.csv downloaded.', 'ok'); return }
    setPanel(id)
  }
  const handleTbQ = (v) => {
    setTbQ(v); clearTimeout(tbTimer.current)
    if (v.trim()) tbTimer.current = setTimeout(() => setPanel('srch'), 280)
  }
  const handleBuy    = (id) => { setStockId(id); setStockMode('buy')  }
  const handleSell   = (id) => { setStockId(id); setStockMode('sell') }
  const handleEdit   = (id) => { setEditProd(products.find((p) => p.id === id)); setAddOpen(true) }
  const handleDelete = (id) => setDelId(id)

  const alertCount = products.filter((p) => p.qty === 0 || (p.qty > 0 && p.qty <= 5)).length
  const TITLES = { dash: ['Dashboard', 'Home / Dashboard'], inv: ['Products', 'Home / Products'], srch: ['Search', 'Home / Search'], rpt: ['Reports', 'Home / Reports'], low: ['Low Stock', 'Home / Low Stock'] }
  const [title, crumb] = TITLES[panel] || [panel, 'Home / ' + panel]
  const stockProduct = products.find((p) => p.id === stockId) || null
  const delProduct   = products.find((p) => p.id === delId)   || null

  const sharedActions = { onBuy: handleBuy, onSell: handleSell, onEdit: handleEdit, onDelete: handleDelete }

  return (
    <>
      <div className="noise" />
      <div className="aurora">
        <div className="blob blob-1" /><div className="blob blob-2" />
        <div className="light-blob lb-1" /><div className="light-blob lb-2" /><div className="light-blob lb-3" /><div className="light-blob lb-4" /><div className="light-blob lb-5" />
      </div>
      <div className="shell">
        <Sidebar active={panel} onNav={handleNav} alertCount={alertCount} />
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-left">
              <button className="sb-toggle-btn" onClick={() => setMini(!mini)} title="Toggle sidebar">
                <span className="sb-toggle-bar" /><span className="sb-toggle-bar" /><span className="sb-toggle-bar" />
              </button>
              <div className="tb-title-block"><div className="tb-title">{title}</div><div className="tb-breadcrumb">{crumb}</div></div>
            </div>
            <div className="tb-center">
              <div className="tb-srch-wrap">
                <IcoSearch />
                <input id="tb-srch" className="tb-srch" placeholder="Search products…" value={tbQ} onChange={(e) => handleTbQ(e.target.value)} />
              </div>
            </div>
            <div className="tb-right">
              <Clock />
              <button className="tb-icon-btn" title="Alerts" onClick={() => setPanel('low')} style={{ position: 'relative' }}>
                🔔{alertCount > 0 && <span className="tb-notif-badge">{alertCount > 9 ? '9+' : alertCount}</span>}
              </button>
              <button className="theme-btn" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? '🌙' : '☀️'}</button>
            </div>
          </div>

          <Ticker products={products} />

          {/* PANELS */}
          <div className="content">
            {panel === 'dash' && <DashboardPanel products={products} dark={dark} onAdd={() => setAddOpen(true)} onLowStock={() => setPanel('low')} onExport={() => { exportCSV(products); toast('inventory.csv downloaded.', 'ok') }} onViewAll={() => setPanel('inv')} {...sharedActions} />}
            {panel === 'inv'  && <ProductsPanel  products={products} onAdd={() => setAddOpen(true)} onExport={() => { exportCSV(products); toast('inventory.csv downloaded.', 'ok') }} {...sharedActions} />}
            {panel === 'srch' && <SearchPanel    products={products} initialQ={tbQ} {...sharedActions} />}
            {panel === 'rpt'  && <ReportsPanel   products={products} dark={dark} />}
            {panel === 'low'  && <LowStockPanel  products={products} {...sharedActions} />}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ProductModal open={addOpen} editProduct={editProd} existingIds={products.map((p) => p.id)}
        onSave={(data) => { if (editProd) updateProduct(editProd.id, data); else addProduct(data) }}
        onClose={() => { setAddOpen(false); setEditProd(null) }} toast={toast} />
      <StockModal open={!!stockId} product={stockProduct} mode={stockMode}
        onConfirm={(qty) => { if (stockMode === 'buy') buyStock(stockId, qty); else sellStock(stockId, qty) }}
        onClose={() => setStockId(null)} toast={toast} />
      <DeleteModal open={!!delId} product={delProduct}
        onConfirm={() => deleteProduct(delId)}
        onClose={() => setDelId(null)} toast={toast} />

      <Toasts toasts={toasts} />
    </>
  )
}

// ================================================================
//  MOUNT
// ================================================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
