// src/pages/Designations.js
window.DesignationsPage = {
  data() {
    return {
      designations: [],
      unites: [],
      categories: [],
      search: "",
      showModal: false,
      editId: null,
      form: {
        nom: "",
        uniteId: "",
        prix: "",
        prixMin: "",
        type: "service",
        reference: "",
        categorieId: "",
      },
      error: "",
      gestionStock: false,
      stocks: {},
      helpers: window.helpers,
    };
  },
  async mounted() {
    this.unites = await unitesStore.getAll();
    this.categories = await categoriesStore.getAll();

    // Vérifier si la gestion de stock est activée
    const settings = await window.settingsStore.get();
    this.gestionStock = settings?.gestionStock || false;

    this.refresh();

    // Listener pour ouvrir depuis la command palette
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-designation-modal", this._modalListener);

    // Listener settings-changed...
    this._settingsListener = async (e) => {
      const { key, value } = e.detail || {};
      if (key === "gestionStock") {
        this.gestionStock = value;
        if (value) {
          // Recharger les stocks si activé
          await this.loadStocks();
        }
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-designation-modal", this._modalListener);
    }
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.designations = await designationsStore.getAll();

      // Charger les stocks si gestion activée
      if (this.gestionStock) {
        await this.loadStocks();
      }
    },
    async loadStocks() {
      // Charger les stocks pour tous les produits
      this.stocks = {};
      const produits = this.designations.filter((d) => d.type === "produit");

      for (const produit of produits) {
        const stock = await fluxStockStore.getStockActuel(produit.id);
        this.stocks[produit.id] = stock;
      }
    },
    getStock(designationId) {
      return this.stocks[designationId] || 0;
    },
    getStockClass(designationId) {
      const stock = this.getStock(designationId);
      if (stock <= 0) return "text-red-600 font-bold";
      if (stock < 10) return "text-orange-600 font-semibold";
      return "text-green-600 font-semibold";
    },
    openAdd() {
      this.editId = null;
      this.form = {
        nom: "",
        uniteId: "",
        prix: "",
        prixMin: "",
        type: "service",
        reference: "",
        categorieId: "",
      };
      this.error = "";
      this.showModal = true;
    },
    openEdit(d) {
      this.editId = d.id;
      this.form = {
        nom: d.nom,
        uniteId: d.uniteId,
        prix: d.prix,
        prixMin: d.prixMin || "",
        type: d.type || "service",
        reference: d.reference || "",
        categorieId: d.categorieId || "",
      };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = "Nom requis";
        return;
      }
      // Si on modifie et qu'on passe de produit à service, effacer ref/unité
      let previous = null;
      if (this.editId) {
        previous = this.designations.find((d) => d.id === this.editId);
      }
      // Si type devient 'service' alors qu'avant c'était 'produit', on efface ref/unite
      if (
        previous &&
        previous.type === "produit" &&
        this.form.type === "service"
      ) {
        this.form.reference = "";
        this.form.uniteId = "";
      }
      if (!this.form.uniteId && this.form.type === "produit") {
        this.error = "Unité requise";
        return;
      }
      if (this.form.prix === "" || isNaN(Number(this.form.prix))) {
        this.error = "Prix requis";
        return;
      }
      if (this.form.prixMin !== "" && isNaN(Number(this.form.prixMin))) {
        this.error = "Prix de vente minimum invalide";
        return;
      }
      if (this.form.type === "produit") {
        if (!this.form.reference) {
          this.error = "Référence requise pour un produit";
          return;
        }
        if (!this.form.categorieId) {
          this.error = "Catégorie requise pour un produit";
          return;
        }
      }
      const data = {
        ...this.form,
        prix: Number(this.form.prix),
        prixMin: this.form.prixMin === "" ? null : Number(this.form.prixMin),
      };
      if (this.editId) {
        await designationsStore.update(this.editId, data);
      } else {
        await designationsStore.add(data);
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer cette désignation ?")) {
        await designationsStore.delete(id);
        this.refresh();
      }
    },
    uniteLabel(id) {
      const u = this.unites.find((u) => u.id == id);
      return u ? u.nom : "--";
    },
    categorieLabel(id) {
      const c = this.categories.find((c) => c.id == id);
      return c ? c.nom : "--";
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.designations.filter((d) => d.nom.toLowerCase().includes(s));
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Designations</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouvelle désignation</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche désignation...">
      </div>
      
      <!-- Message si gestion de stock activée -->
      <div v-if="gestionStock" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <p class="text-sm text-blue-800 dark:text-blue-200">
          📦 Gestion de stock activée - Les quantités en stock sont affichées pour les produits
        </p>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Unité</th>
              <th class="px-4 py-2 text-left">Prix de vente</th>
              <th class="px-4 py-2 text-left">Prix de vente minimum</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-left">Référence</th>
              <th class="px-4 py-2 text-left">Catégorie</th>
              <th v-if="gestionStock" class="px-4 py-2 text-left">Stock</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id">
              <td class="px-4 py-2">{{ d.nom }}</td>
              <td class="px-4 py-2">{{ uniteLabel(d.uniteId) }}</td>
              <td class="px-4 py-2">{{ d.prix }}</td>
              <td class="px-4 py-2">{{ d.prixMin ?? '' }}</td>
              <td class="px-4 py-2">
                <span :class="['px-2 py-1 rounded text-xs font-semibold', d.type === 'produit' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800']">
                  {{ d.type === 'produit' ? 'Produit' : 'Service' }}
                </span>
              </td>
              <td class="px-4 py-2">{{ d.reference || '' }}</td>
              <td class="px-4 py-2">{{ categorieLabel(d.categorieId) }}</td>
              <td v-if="gestionStock" class="px-4 py-2">
                <span v-if="d.type === 'produit'" :class="getStockClass(d.id)">
                  {{ getStock(d.id) }}
                </span>
                <span v-else class="text-gray-400 text-xs">N/A</span>
              </td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(d)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(d.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td :colspan="gestionStock ? 9 : 8" class="text-center text-gray-400 py-4">Aucune désignation</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} une désignation</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.nom" type="text" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Nom">
          <select v-model="form.uniteId" class="border rounded px-3 py-2 mb-2 w-full">
            <option value="">Unité</option>
            <option v-for="u in unites" :value="u.id">{{ u.nom }}</option>
          </select>
          <input v-model="form.prix" type="number" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Prix de vente">
          <input v-model="form.prixMin" type="number" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Prix de vente minimum">
          <div class="flex items-center mb-2">
            <label class="mr-2">Type :</label>
            <input type="checkbox" v-model="form.type" true-value="produit" false-value="service" id="type-produit">
            <label for="type-produit" class="ml-1">Produit</label>
          </div>
          <input v-if="form.type === 'produit'" v-model="form.reference" type="text" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Référence">
          <select v-if="form.type === 'produit'" v-model="form.categorieId" class="border rounded px-3 py-2 mb-4 w-full">
            <option value="">Catégorie</option>
            <option v-for="c in categories" :value="c.id">{{ c.nom }}</option>
          </select>
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
