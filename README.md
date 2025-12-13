# ELYOT

A fast, modern web-based invoice management app built as a static site with no backend. Ideal for freelancers and small businesses needing professional invoicing.

## ✨ Key Features

### 📄 Invoice Management

- Standard and proforma invoices with auto-numbering (custom prefix/increment).
- Line-item details with per-line VAT, auto-totals, price validation, and amounts in words.

### 🎨 PDF Generation

- Three templates: Classic, Modern, Minimalist.
- Custom branding (logos via URLs), legal mentions, print/export.

### 📦 Delivery Notes & Purchase Orders

- Delivery notes from invoices (quantities only, same templates).
- Purchase orders with supplier tracking, multi-line items, payment terms, shipping, same templates, PDF export.

### 📊 Stock Management (Optional)

- Enable/disable in settings; auto stock flows (entry/exit) from invoices.
- Real-time validation, color-coded levels, protected flows.
- Exports include stock data.

### 💼 Contact Management

- Clients and suppliers with search/filter.

### 📊 Product Catalog

- Products/services by category, units, pricing (min/selling), references.

### 💰 Tax Management

- Multiple taxes (VAT, ABIC, custom); per-line application, auto-calculation.

### 📈 Analytics Dashboard

- Revenue stats, monthly trends (charts), top clients/products, category breakdown.

### ⚡ Command Palette (Ctrl+K)

- Quick navigation, actions, search.

### 🌍 Multi-Currency Support

- EUR, XOF, USD.

### 🎨 Modern UI/UX

- Dark mode, color customization, French interface.

### 💾 Data Management

- JSON import/export (full backup); Excel for tables.
- IndexedDB storage (browser-based).

### 📧 Email Integration

- Send invoices via EmailJS (config required).

## 🛠️ Technical Architecture

- Vue.js 3 (CDN), TailwindCSS, Dexie.js (IndexedDB), html2pdf.js, SheetJS, Chart.js, EmailJS.

## 📁 Project Structure

```
elyot/
├── data/
│   └── db-template.json
├── public/
│   ├── index.html
│   ├── preview-facture.html
│   ├── preview-bon-livraison.html
│   └── preview-bon-commande.html
└── src/
    ├── app.js
    ├── components/
    │   └── App.vue.js
    ├── pages/
    │   ├── pages.js
    │   ├── Dashboard.js
    │   ├── Clients.js
    │   ├── Fournisseurs.js
    │   ├── Taxes.js
    │   ├── Unites.js
    │   ├── Categories.js
    │   ├── Designations.js
    │   ├── Factures.js
    │   ├── BonsCommandes.js
    │   ├── Parametres.js
    │   ├── FluxStock.js
    │   └── ImportExport.js
    ├── store/
    │   ├── db.js
    │   └── stores.js
    └── utils/
        └── helpers.js
```

## 🚀 Getting Started

- Serve files via local server (e.g., `python -m http.server 8000`).
- Access at http://localhost:8000/public/.

## 📖 User Guide

### Creating First Invoice

1. Add client/products/taxes.
2. Create invoice, add lines, preview/export/email.

### Keyboard Shortcuts

- Ctrl+K: Command palette (navigate with arrows/Enter/Esc).

### Settings

- Customize theme, currency, numbering, templates, logos, database, stock.

### Logos

- Use direct URLs (e.g., from imgBB); PNG/JPG/SVG, <500KB.

## 🌐 Browser Compatibility

- Chrome/Edge 90+, Firefox 88+, Safari 14+, Opera 76+.

## 🐛 Known Limitations

- Email needs EmailJS; storage ~50MB; PDF quality browser-dependent; no cloud sync.

## 🙏 Credits

Vue.js, TailwindCSS, Dexie.js, Chart.js, html2pdf.js, SheetJS, EmailJS.

## 💖 Support

Star repo, report bugs, donate via PayPal.
