// src/pages/ImportExport.js
window.ImportExportPage = {
  data() {
    return {
      importFile: null,
      importExcelFile: null,
      importMessage: "",
      exportMessage: "",
    };
  },
  methods: {
    async exportExcel(table) {
      const data = await db[table].toArray();
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

      const ws = XLSX.utils.json_to_sheet(produits);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Produits");
      XLSX.writeFile(wb, "designations_produits.xlsx");
      this.exportMessage = `Export de ${produits.length} produit(s) effectué !`;
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
        await db[table].clear();
        await db[table].bulkAdd(json);
        this.importMessage = `Import Excel ${table} terminé !`;
      };
      reader.readAsArrayBuffer(file);
    },
    async exportJSON() {
      const tables = [
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
      a.download = "export-db.json";
      a.click();
      URL.revokeObjectURL(url);
      this.exportMessage = "Export JSON effectué !";
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
        "settings",
      ];
      for (const t of tables) await db[t].clear();
      for (const t of tables) {
        if (Array.isArray(data[t])) await db[t].bulkAdd(data[t]);
        else if (data[t]) await db[t].add(data[t]);
      }
      this.importMessage = "Import JSON terminé !";
    },
  },
  template: `
    <div class="max-w-xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">Import / Export</h2>
      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Import JSON</h3>
          <input type="file" class="mb-2" @change="importJSON">
          <div v-if="importMessage" class="text-green-600 text-sm mb-2">{{ importMessage }}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Export JSON</h3>
          <button class="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700" @click="exportJSON">Exporter JSON</button>
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
          </div>
        </div>
        -->
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Export Excel</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="table in ['clients','fournisseurs','taxes','unites','categories','designations','factures','bons_commandes']" :key="table" class="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 mb-1" @click="() => exportExcel(table)">
              Exporter {{ table }}
            </button>

            <button class="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700 mb-1" @click="exportDesignationsProduits">
              Exporter désignations (produits uniquement)
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
