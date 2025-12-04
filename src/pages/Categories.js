// src/pages/Categories.js
window.CategoriesPage = {
  data() {
    return {
      categories: [],
      search: "",
      showModal: false,
      editId: null,
      form: { nom: "" },
      error: "",
    };
  },
  async mounted() {
    this.refresh();
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-categorie-modal", this._modalListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-categorie-modal", this._modalListener);
    }
  },
  methods: {
    async refresh() {
      this.categories = await categoriesStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: "" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(c) {
      this.editId = c.id;
      this.form = { nom: c.nom };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = "Nom requis";
        return;
      }
      if (this.editId) {
        await categoriesStore.update(this.editId, { ...this.form });
      } else {
        await categoriesStore.add({ ...this.form });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer cette catégorie ?")) {
        await categoriesStore.delete(id);
        this.refresh();
      }
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.categories.filter((c) => c.nom.toLowerCase().includes(s));
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Catégories</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche catégorie...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filtered" :key="c.id">
              <td class="px-4 py-2">{{ c.nom }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(c)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(c.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="2" class="text-center text-gray-400 py-4">Aucune catégorie</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} une catégorie</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.nom" type="text" class="border rounded px-3 py-2 mb-4 w-full" placeholder="Nom">
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
