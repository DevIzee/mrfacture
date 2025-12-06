// src/pages/Taxes.js
window.TaxesPage = {
  data() {
    return {
      taxes: [],
      search: "",
      showModal: false,
      editId: null,
      form: { nom: "", taux: "", type: "TVA" },
      error: "",
    };
  },
  async mounted() {
    this.refresh();
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-taxe-modal", this._modalListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-taxe-modal", this._modalListener);
    }
  },
  methods: {
    async refresh() {
      this.taxes = await taxesStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: "", taux: "", type: "TVA" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(t) {
      this.editId = t.id;
      this.form = { nom: t.nom, taux: t.taux, type: t.type || "TVA" };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (
        !this.form.nom ||
        this.form.taux === "" ||
        isNaN(Number(this.form.taux)) ||
        !this.form.type
      ) {
        this.error = "Nom, taux et type requis";
        return;
      }
      if (this.editId) {
        await taxesStore.update(this.editId, {
          ...this.form,
          taux: Number(this.form.taux),
        });
      } else {
        await taxesStore.add({ ...this.form, taux: Number(this.form.taux) });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer cette taxe ?")) {
        await taxesStore.delete(id);
        this.refresh();
      }
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.taxes.filter((t) => t.nom.toLowerCase().includes(s));
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Taxes</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouvelle taxe</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche taxe...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Taux (%)</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in filtered" :key="t.id">
              <td class="px-4 py-2">{{ t.nom }}</td>
              <td class="px-4 py-2">{{ t.taux }}</td>
              <td class="px-4 py-2">{{ t.type }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(t)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(t.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="3" class="text-center text-gray-400 py-4">Aucune taxe</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} une taxe</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.nom" type="text" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Nom">
          <input v-model="form.taux" type="number" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Taux (%)">
          <select v-model="form.type" class="border rounded px-3 py-2 mb-4 w-full">
            <option value="TVA">TVA</option>
            <option value="ABIC">ABIC</option>
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
