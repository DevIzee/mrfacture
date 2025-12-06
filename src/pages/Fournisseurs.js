// src/pages/Fournisseurs.js
window.FournisseursPage = {
  data() {
    return {
      fournisseurs: [],
      search: "",
      showModal: false,
      editId: null,
      form: { nom: "", email: "", telephone: "" },
      error: "",
    };
  },
  async mounted() {
    this.refresh();
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-fournisseur-modal", this._modalListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-fournisseur-modal", this._modalListener);
    }
  },
  methods: {
    async refresh() {
      this.fournisseurs = await fournisseursStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: "", email: "", telephone: "" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(f) {
      this.editId = f.id;
      this.form = { nom: f.nom, email: f.email, telephone: f.telephone || "" };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom || !this.form.email || !this.form.telephone) {
        this.error = "Nom, email et téléphone requis";
        return;
      }
      if (this.editId) {
        await fournisseursStore.update(this.editId, { ...this.form });
      } else {
        await fournisseursStore.add({ ...this.form });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer ce fournisseur ?")) {
        await fournisseursStore.delete(id);
        this.refresh();
      }
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.fournisseurs.filter(
        (f) =>
          f.nom.toLowerCase().includes(s) || f.email.toLowerCase().includes(s)
      );
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Fournisseurs</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouveau fournisseur</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche fournisseur...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Email</th>
              <th class="px-4 py-2 text-left">Téléphone</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.id">
              <td class="px-4 py-2">{{ f.nom }}</td>
              <td class="px-4 py-2">{{ f.email }}</td>
              <td class="px-4 py-2">{{ f.telephone }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(f)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(f.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="3" class="text-center text-gray-400 py-4">Aucun fournisseur</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} un fournisseur</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.nom" type="text" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Nom">
          <input v-model="form.email" type="email" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Email">
          <input v-model="form.telephone" type="text" class="border rounded px-3 py-2 mb-4 w-full" placeholder="Téléphone">
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
