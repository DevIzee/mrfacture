// src/pages/BonsCommandes.js
window.BonsCommandesPage = {
  computed: {
    helpers() {
      return window.helpers;
    },
  },
  data() {
    return {
      bons: [],
      fournisseurs: [],
      search: "",
      showModal: false,
      editId: null,
      form: { numero: "", fournisseurId: "", date: "", total: "" },
      error: "",
    };
  },
  async mounted() {
    this.fournisseurs = await fournisseursStore.getAll();
    this.refresh();

    // Listener pour ouvrir depuis la command palette
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-bon-modal", this._modalListener);

    // Listener settings-changed...
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-bon-modal", this._modalListener);
    }
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.bons = await bonsCommandesStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { numero: "", fournisseurId: "", date: "", total: "" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(b) {
      this.editId = b.id;
      this.form = {
        numero: b.numero,
        fournisseurId: b.fournisseurId,
        date: b.date,
        total: b.total,
      };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (
        !this.form.numero ||
        !this.form.fournisseurId ||
        !this.form.date ||
        this.form.total === "" ||
        isNaN(Number(this.form.total))
      ) {
        this.error = "Tous les champs sont requis";
        return;
      }
      const data = { ...this.form, total: Number(this.form.total) };
      if (this.editId) {
        await bonsCommandesStore.update(this.editId, data);
      } else {
        await bonsCommandesStore.add(data);
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer ce bon de commande ?")) {
        await bonsCommandesStore.delete(id);
        this.refresh();
      }
    },
    fournisseurLabel(id) {
      const f = this.fournisseurs.find((f) => f.id == id);
      return f ? f.nom : "--";
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.bons.filter((b) => b.numero.toLowerCase().includes(s));
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Bons de commande</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouveau bon</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche bon de commande...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Numéro</th>
              <th class="px-4 py-2 text-left">Fournisseur</th>
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Total</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filtered" :key="b.id">
              <td class="px-4 py-2">{{ b.numero }}</td>
              <td class="px-4 py-2">{{ fournisseurLabel(b.fournisseurId) }}</td>
              <td class="px-4 py-2">{{ b.date }}</td>
              <td class="px-4 py-2">{{ b.total }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(b)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(b.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="5" class="text-center text-gray-400 py-4">Aucun bon de commande</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Nouveau' }} bon de commande</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.numero" type="text" class="border rounded px-3 py-2 mb-2 w-full bg-gray-100 cursor-not-allowed" placeholder="Numéro" readonly disabled>
          <select v-model="form.fournisseurId" class="border rounded px-3 py-2 mb-2 w-full">
            <option value="">Fournisseur</option>
            <option v-for="f in fournisseurs" :value="f.id">{{ f.nom }}</option>
          </select>
          <input v-model="form.date" type="date" class="border rounded px-3 py-2 mb-2 w-full bg-gray-100 cursor-not-allowed" placeholder="Date" readonly disabled>
          <input v-model="form.total" type="number" class="border rounded px-3 py-2 mb-4 w-full" placeholder="Total">
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
