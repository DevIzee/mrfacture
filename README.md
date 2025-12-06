# Mr Facture

A fast, modern web-based invoice management application built as a static site with no backend required.

## 🚀 Features

### Core Functionality

- **Invoice Management**: Create, edit, and manage invoices and proforma invoices
- **Client & Supplier Management**: Comprehensive contact database
- **Product Catalog**: Manage products and services with categories, units, and pricing
- **Tax Management**: Support for multiple tax types (VAT, ABIC, etc.)
- **PDF Generation**: Export invoices in 3 customizable templates
- **Email Integration**: Send invoices directly via email (EmailJS)
- **Dashboard**: Real-time statistics and revenue tracking

### Advanced Features

- **Command Palette** (Ctrl+K): Quick access to all actions and navigation
- **Dark Mode**: Full dark theme support with customizable sidebar colors
- **Multi-Currency Support**: EUR, XOF, USD with automatic formatting
- **Import/Export**: JSON and Excel (.xlsx) data exchange
- **Offline-First**: Works completely offline using IndexedDB
- **Customizable Invoicing**:
  - Custom prefixes and numbering
  - Multiple invoice templates
  - Logo support (header & footer)
  - Custom legal mentions
  - Minimum pricing enforcement
  - Warranty and payment terms

### Invoice Types

- **Standard Invoice**: Regular invoicing with automatic numbering
- **Proforma Invoice**: Quotes with validity period, delivery terms, and execution deadlines

## 🛠️ Technical Stack

- **Framework**: [Vue.js 3](https://vuejs.org/) (CDN)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Flowbite](https://flowbite.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **PDF Export**: [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
- **Spreadsheet**: [SheetJS (xlsx)](https://sheetjs.com/)
- **Email**: [EmailJS](https://www.emailjs.com/)
- **Charts**: [ApexCharts](https://apexcharts.com/)

## 📁 Project Structure

```
mr-facture/
├── data/
│   └── db-template.json          # Initial database template
├── public/
│   └── index.html                # Application entry point
└── src/
    ├── app.js                    # Vue app initialization
    ├── components/
    │   └── App.vue.js            # Main app component with command palette
    ├── pages/
    │   ├── pages.js              # Page loader
    │   ├── Dashboard.js          # Analytics dashboard
    │   ├── Clients.js            # Client management
    │   ├── Fournisseurs.js       # Supplier management
    │   ├── Taxes.js              # Tax management
    │   ├── Unites.js             # Unit management
    │   ├── Categories.js         # Category management
    │   ├── Designations.js       # Product/service catalog
    │   ├── Factures.js           # Invoice management
    │   ├── BonsCommandes.js      # Purchase orders
    │   ├── Parametres.js         # Settings & configuration
    │   └── ImportExport.js       # Data import/export
    ├── store/
    │   ├── db.js                 # Dexie database configuration
    │   └── stores.js             # Data stores with reactive settings
    └── utils/
        └── helpers.js            # Utility functions
```

## 🚦 How to Run

Since the project has no build step and uses CDN dependencies, you only need a local web server.

### Option 1: Python HTTP Server

```bash
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

Then open [http://localhost:8000](http://localhost:8000)

### Option 2: Node.js http-server

```bash
npx http-server .
```

Then open the URL shown in the terminal (usually [http://localhost:8080](http://localhost:8080))

### Option 3: VS Code Live Server

1. Install the "Live Server" extension
2. Right-click on `public/index.html`
3. Select "Open with Live Server"

## ⌨️ Keyboard Shortcuts

- **Ctrl+K** (or Cmd+K): Open command palette
- **Arrow Up/Down**: Navigate command palette
- **Enter**: Execute selected command
- **Escape**: Close command palette

## 📊 Command Palette Features

The command palette provides instant access to:

- **Navigation**: Jump to any page
- **Quick Actions**:
  - Create new invoice
  - Add client, supplier, tax, unit, category, product, purchase order
- **Search**: Find actions by keywords

## 🎨 Customization

### Invoice Templates

Three professionally designed templates:

1. **Classic**: Traditional business invoice layout
2. **Modern**: Gradient-based contemporary design
3. **Minimalist**: Clean, typography-focused style

### Settings (Paramètres)

- **Theme**: Light/Dark mode
- **Currency**: EUR, XOF, USD
- **Invoice Numbering**: Custom prefix and increment step
- **Visual Identity**: Header and footer logos
- **Legal Mentions**: Custom footer text for invoices

## 💾 Data Management

### Import/Export

- **JSON**: Full database backup/restore
- **Excel**: Per-table import/export
  - Clients, Suppliers, Taxes, Units, Categories, Products, Invoices, Purchase Orders
  - **Special**: Export products only (filters designations by type)

### Database Reset

- Settings page includes options to:
  - Reset all settings to defaults
  - Clear entire database (with double confirmation)

## 🔒 Data Storage

All data is stored locally in your browser using IndexedDB:

- No server required
- Complete privacy
- Offline functionality
- Automatic persistence

## 📝 Invoice Features

### Standard Invoices

- Automatic numbering with custom prefix
- Line items with quantities and unit prices
- VAT calculation per line item
- Minimum price enforcement
- PDF export in 3 templates
- Email sending capability

### Proforma Invoices

All standard features plus:

- Offer validity period
- Delivery deadlines
- Execution deadlines
- Payment terms
- Editable after creation (standard invoices are locked)

### Validation Rules

- Required fields: Number, client, date, at least one line item
- Each line must have: designation, quantity > 0, price ≥ 0
- Price validation against minimum pricing
- Special fields required for proforma invoices

## 🌍 Localization

- Interface: French (Français)
- Currency formatting: Automatic based on selected currency
- Date formatting: French format (DD/MM/YYYY)

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

## ☕ Support the Project

If you find this project useful, consider supporting its development via the donation button in the app header.

## 📄 License

This project is open source and available for personal and commercial use.

## 🔧 Technical Notes

### Reactive Settings

The application uses a Proxy-based reactive settings store that automatically propagates changes across all components using a custom event bus.

### Command Palette Implementation

Built with Vue 3 reactivity, keyboard navigation, and fuzzy search capabilities. Actions are dynamically loaded based on available pages and features.

### PDF Generation

Uses html2pdf.js to convert HTML invoice previews into downloadable PDFs with customizable page formatting (A4, portrait).

### Database Schema

- **taxes**: Tax rates and types
- **unites**: Measurement units
- **clients**: Client information
- **fournisseurs**: Supplier information
- **categories**: Product categories
- **designations**: Products and services catalog
- **factures**: Invoices with line items
- **bons_commandes**: Purchase orders
- **settings**: Application configuration

## 🐛 Known Limitations

- Email sending requires EmailJS configuration (SERVICE_ID and TEMPLATE_ID)
- Browser storage limits apply (~50MB for IndexedDB)
- PDF generation quality depends on browser rendering engine

## 🔮 Future Enhancements

- Multi-language support
- Advanced reporting and analytics
- Recurring invoices
- Payment tracking
- Client portal
- Cloud backup integration

---

**Built with ❤️ using Vue.js 3 and modern web technologies**
