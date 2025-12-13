// src/pages/ImportExport.js
window.ImportExportPage = {
  data() {
    return {
      importFile: null,
      importExcelFile: null,
      importMessage: "",
      exportMessage: "",
      gestionStock: false,
    };
  },
  async mounted() {
    // Vérifier si la gestion de stock est activée
    const settings = await window.settingsStore.get();
    this.gestionStock = settings?.gestionStock || false;

    // Listener settings-changed
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "gestionStock") {
        this.gestionStock = value;
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async exportExcel(table) {
      const data = await db[table].toArray();

      // Si c'est designations et gestion stock activée, ajouter les quantités
      if (table === "designations" && this.gestionStock) {
        const dataAvecStock = await this.ajouterStocks(data);
        const ws = XLSX.utils.json_to_sheet(dataAvecStock);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, table);
        XLSX.writeFile(wb, `${table}_avec_stocks.xlsx`);
        this.exportMessage = `Export Excel ${table} avec stocks effectué !`;
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, table);
      XLSX.writeFile(wb, `${table}.xlsx`);
      this.exportMessage = `Export Excel ${table} effectué !`;
    },
    async exportDesignationsProduits() {
      const designations = await db.designations.toArray();
      const produits = designations.filter((d) => d.type === "produit");

      if (produits.length === 0) {
        this.exportMessage = "Aucun produit à exporter";
        return;
      }

      // Si gestion stock activée, ajouter les quantités
      let produitsExport = produits;
      if (this.gestionStock) {
        produitsExport = await this.ajouterStocks(produits);
      }

      const ws = XLSX.utils.json_to_sheet(produitsExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Produits");
      const filename = this.gestionStock
        ? "designations_produits_avec_stocks.xlsx"
        : "designations_produits.xlsx";
      XLSX.writeFile(wb, filename);
      this.exportMessage = `Export de ${produits.length} produit(s)${
        this.gestionStock ? " avec stocks" : ""
      } effectué !`;
    },
    async ajouterStocks(designations) {
      // Ajouter une colonne "stock" pour chaque désignation de type produit
      const result = [];
      for (const d of designations) {
        const item = { ...d };
        if (d.type === "produit") {
          const stock = await fluxStockStore.getStockActuel(d.id);
          item.stock = stock;
        } else {
          item.stock = "N/A";
        }
        result.push(item);
      }
      return result;
    },
    async importExcel(e, table) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);

        // Nettoyer les données importées (enlever la colonne stock si présente)
        if (table === "designations") {
          json.forEach((item) => {
            delete item.stock; // Supprimer la colonne stock car calculée dynamiquement
          });
        }

        await db[table].clear();
        await db[table].bulkAdd(json);
        this.importMessage = `Import Excel ${table} terminé !`;
      };
      reader.readAsArrayBuffer(file);
    },
    async exportJSON() {
      let tables = [
        "taxes",
        "unites",
        "clients",
        "fournisseurs",
        "categories",
        "designations",
        "factures",
        "bons_commandes",
        "settings",
      ];

      // Ajouter flux_stock si gestion activée
      if (this.gestionStock) {
        tables.push("flux_stock");
      }

      const data = {};
      for (const t of tables) {
        data[t] = await db[t].toArray();
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = this.gestionStock
        ? "export-db-avec-stocks.json"
        : "export-db.json";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      this.exportMessage = `Export JSON${
        this.gestionStock ? " avec flux de stock" : ""
      } effectué !`;
    },
    async importJSON(e) {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        this.importMessage = "Fichier JSON invalide";
        return;
      }

      const tables = [
        "taxes",
        "unites",
        "clients",
        "fournisseurs",
        "categories",
        "designations",
        "factures",
        "bons_commandes",
        "flux_stock",
        "settings",
      ];

      // Vider toutes les tables
      for (const t of tables) {
        await db[t].clear();
      }

      // Importer les données (seulement si elles existent dans le JSON)
      for (const t of tables) {
        if (data[t]) {
          if (Array.isArray(data[t])) {
            if (data[t].length > 0) {
              await db[t].bulkAdd(data[t]);
            }
          } else {
            await db[t].add(data[t]);
          }
        }
      }

      this.importMessage = "Import JSON terminé !";
    },
  },
  template: `
    <div class="max-w-xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">Import / Export</h2>
      
      <!-- Message si gestion stock activée -->
      <div v-if="gestionStock" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p class="text-sm text-blue-800 dark:text-blue-200">
          📦 Gestion de stock activée - Les exports incluront les flux de stock et les quantités
        </p>
      </div>
      
      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Import JSON</h3>
          <input type="file" class="mb-2" @change="importJSON">
          <div v-if="importMessage" class="text-green-600 text-sm mb-2">{{ importMessage }}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Export JSON</h3>
          <button class="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700" @click="exportJSON">
            Exporter JSON{{ gestionStock ? ' (avec flux de stock)' : '' }}
          </button>
          <div v-if="exportMessage" class="text-green-600 text-sm mt-2">{{ exportMessage }}</div>
        </div>

        <!--
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Import Excel</h3>
          <div class="flex flex-wrap gap-2">
            <div v-for="table in ['clients','fournisseurs','taxes','unites','categories','designations','factures','bons_commandes']" :key="table">
              <label class="block text-xs font-semibold mb-1">{{ table }}</label>
              <input type="file" class="mb-1" @change="e => importExcel(e, table)">
            </div>
            <div v-if="gestionStock">
              <label class="block text-xs font-semibold mb-1">flux_stock</label>
              <input type="file" class="mb-1" @change="e => importExcel(e, 'flux_stock')">
            </div>
          </div>
        </div>
        -->
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Export Excel</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="table in ['clients','fournisseurs','taxes','unites','categories','designations','factures','bons_commandes']" :key="table" class="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 mb-1" @click="() => exportExcel(table)">
              Exporter {{ table }}
            </button>
            <button v-if="gestionStock" class="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 mb-1" @click="() => exportExcel('flux_stock')">
              Exporter flux_stock
            </button>
            <button class="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700 mb-1" @click="exportDesignationsProduits">
              Exporter désignations (produits uniquement){{ gestionStock ? ' avec stocks' : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
