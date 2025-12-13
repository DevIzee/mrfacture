# ELYOT

A fast, modern web-based invoice management application built as a static site with no backend required. Perfect for freelancers, small businesses, and entrepreneurs who need professional invoicing without the complexity.

## ✨ Key Features

### 📄 Invoice Management

- **Standard Invoices**: Professional invoices with automatic numbering and locked editing after creation
- **Proforma Invoices**: Quotations with validity periods, delivery terms, execution deadlines, and editable after creation
- **Smart Numbering**: Customizable prefix and increment system (e.g., FAC-0001, FAC-0002)
- **Line-Item Details**: Per-line VAT calculation with automatic totals
- **Price Validation**: Minimum pricing enforcement to prevent underpricing
- **Amount in Words**: Automatic conversion of invoice totals to written form

### 🎨 PDF Generation

- **Three Professional Templates**:
  - **Classic**: Traditional business invoice layout
  - **Modern**: Contemporary design with gradients and vibrant colors
  - **Minimalist**: Clean, typography-focused style
- **Custom Branding**: Add header and footer logos (supports Google Drive URLs)
- **Legal Mentions**: Custom footer text for terms and conditions
- **Print & Export**: Direct browser printing and PDF download

### 📦 Delivery Notes & Purchase Orders

**Delivery Notes (Bons de Livraison)**

- Generate delivery notes from invoices
- Same three template options as invoices
- Shows quantities without pricing information
- Perfect for shipping and logistics

**Purchase Orders (Bons de Commande)**

- Complete purchase order management with automatic numbering
- Supplier selection and contact tracking
- Multi-line items with products/services
- Optional shipping cost (added after taxes)
- Transport mode specification
- Delivery location tracking
- **Payment Terms**: Custom payment conditions
- **Three Professional Templates**: Classic, Modern, Minimalist
- **PDF Export & Print**: Professional purchase order documents

### 📊 Stock Management (Optional)

**Inventory Tracking**

- Enable/disable stock management in settings
- Automatic stock calculation based on stock flows
- Real-time stock display for products in the catalog
- Stock validation when creating invoices
- Color-coded stock levels (red: out of stock, orange: low, green: sufficient)
- Real-time stock verification when adding products to standard invoices
- Stock availability warnings with insufficient stock indicators
- Automatic stock exit flow creation upon invoice creation
- **Auto-generation**: Stock exit flows automatically created when standard invoices are saved
- **Protected flows**: Invoicing flows cannot be manually edited or deleted
- **Excel Export**: Product exports include stock quantities when management is enabled
- **JSON Export**: Includes stock flows table when stock management is active

### 💼 Contact Management

- **Clients**: Full customer database with contact information
- **Suppliers**: Supplier management for purchase orders
- **Search & Filter**: Quick filtering across all contacts

### 📊 Product Catalog

- **Products & Services**: Differentiate between physical products and services
- **Categories**: Organize products by category
- **Units of Measure**: Define measurement units with abbreviations
- **Pricing Control**: Set selling prices and minimum acceptable prices
- **References**: Track product SKUs and codes

### 💰 Tax Management

- **Multiple Tax Types**: Support for VAT, ABIC, and custom taxes
- **Per-Line Tax**: Apply different tax rates to individual invoice lines
- **Automatic Calculation**: Real-time tax computation

### 📈 Analytics Dashboard

- **Revenue Statistics**: Total revenue tracking with breakdown by invoice type
- **Monthly Trends**: Visual charts showing revenue over time (Chart.js)
- **Top Clients**: Identify your best customers
- **Product Performance**: Track best-selling products and services
- **Category Analysis**: Revenue breakdown by product category
- **Key Metrics**: Quick stats for invoices, clients, suppliers, and products

### 📊 Stock Management (Optional)

- **Enable/Disable in Settings**: Turn on inventory tracking when needed
- **Automatic Stock Flows**: Entry (provisioning, returns) and exit (destocking, invoicing)
- **Real-time Validation**: Check stock availability when creating invoices
- **Stock Display**: View current quantities for all products
- **Auto-generation**: Stock flows created automatically from standard invoices
- **Protected Data**: Invoice-generated flows cannot be manually modified

### ⚡ Command Palette (Ctrl+K)

- **Quick Navigation**: Jump to any page instantly
- **Fast Actions**: Create invoices, clients, products without mouse clicks
- **Keyboard Shortcuts**: Navigate efficiently with arrow keys
- **Search**: Find actions by keywords

### 🌍 Multi-Currency Support

- EUR (Euro), XOF (Franc CFA), USD (Dollar)

### 🎨 Modern UI/UX

- **Dark Mode**: Full dark theme support with automatic color adaptation
- **Color Customization**: Personalize sidebar colors
- **French Interface**: Complete French localization

### 💾 Data Management

- **Import/Export JSON**: Full database backup and restore
- **Excel Support**: Export individual tables (.xlsx format)
- **IndexedDB Storage**: Reliable browser-based persistence (~50MB capacity)
- **No Backend Required**: All data stays on your device

### 📧 Email Integration

- Send invoices directly via EmailJS (configuration required)
- Automatic PDF attachment generation

## 🛠️ Technical Architecture

### Frontend Framework

- **Vue.js 3** (Global Build via CDN): Reactive component-based architecture
- **Composition API**: Modern Vue 3 setup() syntax
- **Options API**: Used in page components for simplicity

### Styling

- **TailwindCSS** (via CDN): Utility-first CSS framework
- **Dark Mode**: Class-based dark mode with full component support

### Database

- **Dexie.js**: Elegant IndexedDB wrapper for client-side storage
- **Auto-increment IDs**: Primary keys for all entities
- **Reactive Store Pattern**: Proxy-based reactive settings with event bus

### PDF & Export

- **html2pdf.js**: Convert HTML templates to downloadable PDFs
- **SheetJS (xlsx)**: Excel file import/export capabilities
- **Chart.js**: Beautiful, responsive charts for analytics

### Additional Libraries

- **EmailJS**: Email sending without backend server
- **Google Fonts**: Typography support

## 📁 Project Structure

```
elyot/
├── data/
│   └── db-template.json          # Initial database template with default settings
│
├── public/
│   ├── index.html                # Main application entry point
│   ├── preview-facture.html      # Invoice preview & print page
│   ├── preview-bon-livraison.html # Delivery note preview & print page
│   └── preview-bon-commande.html  # Purchase order preview & print page
│
└── src/
    ├── app.js                    # Vue app initialization and mounting
    │
    ├── components/
    │   └── App.vue.js            # Main app component with sidebar, header, command palette
    │
    ├── pages/                    # Page components (Options API)
    │   ├── pages.js              # Page loading verification
    │   ├── Dashboard.js          # Analytics dashboard with Chart.js graphs
    │   ├── Clients.js            # Client CRUD operations
    │   ├── Fournisseurs.js       # Supplier management
    │   ├── Taxes.js              # Tax rate management (VAT, ABIC)
    │   ├── Unites.js             # Units of measure
    │   ├── Categories.js         # Product categories
    │   ├── Designations.js       # Product/service catalog
    │   ├── Factures.js           # Invoice creation and management
    │   ├── BonsCommandes.js      # Purchase orders
    │   ├── Parametres.js         # Settings and configuration
    │   ├── FluxStock.js          # Stock flow management (optional)
    │   └── ImportExport.js       # Data import/export utilities
    │
    ├── store/
    │   ├── db.js                 # Dexie database schema and initialization
    │   └── stores.js             # Reactive data stores for all entities
    │
    └── utils/
        └── helpers.js            # Utility functions (formatting, conversion)
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for security reasons, browsers block IndexedDB on `file://` protocol)

### Installation

**No build step required!** Just serve the files:

#### Option 1: Python HTTP Server

```bash
python -m http.server 8000
```

Then open [http://localhost:8000/public/](http://localhost:8000/public/)

#### Option 2: Node.js http-server

```bash
npx http-server . -p 8080
```

## 📖 User Guide

### Creating Your First Invoice

1. **Add a Client**: Navigate to Clients → New Client
2. **Add Products/Services**: Go to Designations → New Designation
3. **Set Tax Rates**: Configure taxes in Taxes section (e.g., VAT 18%)
4. **Create Invoice**:
   - Go to Factures → New Invoice
   - Select client and date
   - Choose invoice type (Normal or Proforma)
   - Add line items with quantities and prices
   - System calculates totals automatically
5. **Preview & Export**: Click "Prévisualiser" to see PDF, print, or email

### Keyboard Shortcuts

- **Ctrl+K** (or Cmd+K on Mac): Open command palette
- **Arrow Up/Down**: Navigate commands
- **Enter**: Execute selected command
- **Escape**: Close command palette

### Using the Command Palette

Press `Ctrl+K` and type:

- "nouvelle facture" → Create new invoice
- "client" → Add or navigate to clients
- "dashboard" → Jump to dashboard
- "import" → Go to import/export

### Managing Settings

Navigate to **Paramètres** to customize:

- **Appearance**: Theme (light/dark) and sidebar color
- **Currency**: Choose EUR, XOF, or USD
- **Invoice Numbering**: Set prefix and increment step
- **Templates**: Select invoice and delivery note styles
- **Branding**: Add logos and legal mentions
- **Database**: Reset settings or clear all data
- **Stock Management**: Enable/disable inventory tracking with prefix and increment settings

### Working with Image Hosting for Logos

The application supports external image URLs for logos. **Recommended hosting: imgBB**

#### Using imgBB (Recommended)

1. Go to [imgbb.com](https://imgbb.com/)
2. Upload your logo image
3. Copy the **Direct Link** URL (ends with .png, .jpg, etc.)
4. Paste into Settings → Logo fields
5. Your logo will display immediately

#### Image URL Requirements

- Must be a **direct image URL** (e.g., `https://i.ibb.co/xxxxx/logo.png`)
- Supported formats: PNG, JPG, JPEG, GIF, SVG
- Recommended size: Max 500KB for fast loading
- Must be publicly accessible (no authentication required)

## 💾 Data Management

**JSON Export** (Recommended):

- Go to Import/Export → Export JSON
- Saves complete database including all settings
- Includes stock flows if stock management is enabled
- Use for full backup and restore

**Excel Export**:

- Export individual tables (clients, invoices, etc.)
- Product exports include stock quantities when stock management is enabled
- Useful for reporting and analysis

## 🌐 Browser Compatibility

- ✅ Chrome/Edge 90+ (Recommended)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

## 🐛 Known Limitations

1. **Email Sending**: Requires EmailJS account and API key configuration
2. **Storage Limit**: IndexedDB typically limited to ~50MB (varies by browser)
3. **PDF Quality**: Depends on browser's rendering engine
4. **Stock Management**: Operates independently per browser/device (no cloud sync)

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Cloud backup integration (Google Drive, Dropbox)
- [ ] Advanced reporting (Profit/Loss, Cash Flow)
- [ ] Time tracking integration

## 📄 License

This project is **open source** and available for both personal and commercial use.

## 🙏 Credits

Built with amazing open-source technologies:

- [Vue.js](https://vuejs.org/) - Progressive JavaScript Framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- [Dexie.js](https://dexie.org/) - IndexedDB Wrapper
- [Chart.js](https://www.chartjs.org/) - JavaScript Charting
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) - PDF Generation
- [SheetJS](https://sheetjs.com/) - Excel Processing
- [EmailJS](https://www.emailjs.com/) - Email Service

## 💖 Support the Project

If you find this project useful:

- ⭐ Star the repository
- 🐛 Report bugs and suggest features
- ☕ [Buy me a coffee](https://www.paypal.com/donate) (donation button in app)

---

**Built with ❤️ for small businesses and freelancers worldwide**
