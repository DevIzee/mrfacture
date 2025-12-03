# Mr Facture

Web front-end application designed for fast invoice management.

## Technical Overview

The application is served as a static site. All dependencies are loaded via CDNs, which greatly simplifies deployment and development.

- **Main framework:** [Vue.js 3](https://vuejs.org/)
- **Styling:** [TailwindCSS](https://tailwindcss.com/) & [Flowbite](https://flowbite.com/)
- **Local database:** [Dexie.js](https://dexie.org/) (for IndexedDB)
- **Features:**

  - PDF generation with [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
  - Spreadsheet manipulation with [SheetJS (xlsx)](https://sheetjs.com/)
  - Email sending via [EmailJS](https://www.emailjs.com/)
  - Charts and visualizations with [ApexCharts](https://apexcharts.com/)

## Project Structure

- `/data`: Contains data templates such as `db-template.json`.
- `/public`: Contains the `index.html` file, the entry point of the application.
- `/src`: Contains all JavaScript source code.

  - `app.js`: The main script that initializes the Vue application.
  - `/components`: Vue components.
  - `/store`: State management logic and local database handling.
  - `/pages`: Logic for the different "pages" or views.
  - `/utils`: Utility functions.

## How to Run the Project

Since the project requires no dependency installation, you only need a local web server. Here are two common methods:

### Option 1: Using Python

If Python is installed, you can use its built-in HTTP server.

1. Open a terminal at the project root.
2. Run:

   ```bash
   python -m http.server
   ```

3. Open your browser and go to [http://localhost:8000](http://localhost:8000).

### Option 2: Using Node.js (`http-server`)

If you have Node.js, you can use the `http-server` package.

1. Open a terminal at the project root.
2. Run:

   ```bash
   npx http-server .
   ```

3. Open your browser and visit the URL shown in the terminal (usually `http://localhost:8080`).

## Project Tree

```
data/
  db-template.json
public/
  index.html
src/
  app.js
  assets/
  components/
    App.vue.js
  pages/
    pages.js
  store/
    db.js
    stores.js
  utils/
    helpers.js
```
