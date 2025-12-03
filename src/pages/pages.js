// src/pages/Dashboard.vue.js
if (!window.helpers) {
  throw new Error(
    "helpers.js must be loaded before pages.js. window.helpers is undefined."
  );
}
window.DashboardPage = {
  data() {
    return {
      nbFactures: 0,
      caTotal: 0,
      topClients: [],
      volumeMensuel: [],
      devise: "EUR",
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    },
  },
  async mounted() {
    await this.refreshData();
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") {
        this.devise = value;
        this.refreshData();
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
    async refreshData() {
      // Récupère la devise principale depuis settings
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || "XOF";
      const factures = await facturesStore.getAll();
      const clients = await clientsStore.getAll();
      this.nbFactures = factures.length;
      this.caTotal = factures.reduce((sum, f) => sum + (f.totalTTC || 0), 0);
      // Top clients (par CA)
      const caByClient = {};
      for (const f of factures) {
        if (!caByClient[f.clientId]) caByClient[f.clientId] = 0;
        caByClient[f.clientId] += f.totalTTC || 0;
      }
      this.topClients = Object.entries(caByClient)
        .map(([id, ca]) => ({
          nom: (clients.find((c) => c.id == id) || {}).nom || "Inconnu",
          ca,
        }))
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 3);
      // Volume mensuel (CA par mois)
      const byMonth = {};
      for (const f of factures) {
        if (!f.date) continue;
        const m = f.date.slice(0, 7); // YYYY-MM
        if (!byMonth[m]) byMonth[m] = 0;
        byMonth[m] += f.totalTTC || 0;
      }
      this.volumeMensuel = Object.entries(byMonth)
        .map(([mois, ca]) => ({ mois, ca }))
        .sort((a, b) => a.mois.localeCompare(b.mois));
    },
  },
  template: `
    <div>
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2">Dashboard</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col items-center">
            <div class="text-lg font-semibold">Factures</div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ nbFactures }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col items-center">
            <div class="text-lg font-semibold">CA Total</div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ helpers.formatMontant(caTotal, devise) }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col items-center">
            <div class="text-lg font-semibold">Top Clients</div>
            <div class="text-sm text-purple-600 dark:text-purple-400">
              <div v-for="c in topClients" :key="c.nom">{{ c.nom }}: {{ helpers.formatMontant(c.ca, devise) }}</div>
              <div v-if="topClients.length === 0" class="text-gray-400">--</div>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col items-center">
            <div class="text-lg font-semibold">Volume Mensuel</div>
            <div class="text-xs text-orange-600 dark:text-orange-400">
              <div v-for="v in volumeMensuel" :key="v.mois">{{ v.mois }}: {{ helpers.formatMontant(v.ca, devise) }}</div>
              <div v-if="volumeMensuel.length === 0" class="text-gray-400">--</div>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
        <h3 class="text-lg font-semibold mb-2">Graphiques (à venir)</h3>
        <div id="dashboard-chart" class="h-64 flex items-center justify-center text-gray-400">[Graphique à venir]</div>
      </div>
    </div>
  `,
};
// src/pages/Clients.vue.js
window.ClientsPage = {
  data() {
    return {
      clients: [],
      search: "",
      showModal: false,
      editId: null,
      form: { nom: "", email: "", telephone: "" },
      error: "",
    };
  },
  async mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.clients = await clientsStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: "", email: "", telephone: "" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(client) {
      this.editId = client.id;
      this.form = {
        nom: client.nom,
        email: client.email,
        telephone: client.telephone || "",
      };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom || !this.form.email || !this.form.telephone) {
        this.error = "Nom, email et téléphone requis";
        return;
      }
      if (this.editId) {
        await clientsStore.update(this.editId, { ...this.form });
      } else {
        await clientsStore.add({ ...this.form });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer ce client ?")) {
        await clientsStore.delete(id);
        this.refresh();
      }
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.clients.filter(
        (c) =>
          c.nom.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)
      );
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Clients</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche client...">
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
            <tr v-for="c in filtered" :key="c.id">
              <td class="px-4 py-2">{{ c.nom }}</td>
              <td class="px-4 py-2">{{ c.email }}</td>
              <td class="px-4 py-2">{{ c.telephone }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(c)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(c.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="3" class="text-center text-gray-400 py-4">Aucun client</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} un client</h3>
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
// src/pages/Fournisseurs.vue.js
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
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
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
// src/pages/Taxes.vue.js
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
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
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
// src/pages/Unites.vue.js
window.UnitesPage = {
  data() {
    return {
      unites: [],
      search: "",
      showModal: false,
      editId: null,
      form: { nom: "", abreviation: "" },
      error: "",
    };
  },
  async mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.unites = await unitesStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: "", abreviation: "" };
      this.error = "";
      this.showModal = true;
    },
    openEdit(u) {
      this.editId = u.id;
      this.form = { nom: u.nom, abreviation: u.abreviation };
      this.error = "";
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = "Nom requis";
        return;
      }
      if (!this.form.abreviation) {
        this.error = "Abréviation requise";
        return;
      }
      if (this.editId) {
        await unitesStore.update(this.editId, { ...this.form });
      } else {
        await unitesStore.add({ ...this.form });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm("Supprimer cette unité ?")) {
        await unitesStore.delete(id);
        this.refresh();
      }
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.unites.filter((u) => u.nom.toLowerCase().includes(s));
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Unités</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche unité...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Nom</th>
              <th class="px-4 py-2 text-left">Abréviation</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filtered" :key="u.id">
              <td class="px-4 py-2">{{ u.nom }}</td>
              <td class="px-4 py-2">{{ u.abreviation }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(u)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(u.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="2" class="text-center text-gray-400 py-4">Aucune unité</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-sm relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Ajouter' }} une unité</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <input v-model="form.nom" type="text" class="border rounded px-3 py-2 mb-2 w-full" placeholder="Nom">
          <input v-model="form.abreviation" type="text" class="border rounded px-3 py-2 mb-4 w-full" placeholder="Abréviation">
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
// src/pages/Categories.vue.js
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
// src/pages/Designations.vue.js
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
    };
  },
  async mounted() {
    this.unites = await unitesStore.getAll();
    this.categories = await categoriesStore.getAll();
    this.refresh();
    // Listener settings-changed pour évolutivité future (ex: devise, couleurs...)
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      // Ajoutez ici la logique si un paramètre global doit impacter cette page
      // Ex: if (key === 'devisePrincipale') { ... }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.designations = await designationsStore.getAll();
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
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Ajouter</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche désignation...">
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
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id">
              <td class="px-4 py-2">{{ d.nom }}</td>
              <td class="px-4 py-2">{{ uniteLabel(d.uniteId) }}</td>
              <td class="px-4 py-2">{{ d.prix }}</td>
              <td class="px-4 py-2">{{ d.prixMin ?? '' }}</td>
              <td class="px-4 py-2">{{ d.type === 'produit' ? 'Produit' : 'Service' }}</td>
              <td class="px-4 py-2">{{ d.reference || '' }}</td>
              <td class="px-4 py-2">{{ categorieLabel(d.categorieId) }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(d)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(d.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="5" class="text-center text-gray-400 py-4">Aucune désignation</td>
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
// src/pages/Factures.vue.js
window.FacturesPage = {
  data() {
    return {
      factures: [],
      clients: [],
      designations: [],
      taxes: [],
      search: "",
      showModal: false,
      editId: null,
      form: {
        numero: "",
        clientId: "",
        date: "",
        type: "normale",
        objet: "",
        garantie: "",
        validiteOffre: "",
        delaisLivraison: "",
        delaisExecution: "",
        conditionPaiement: "",
        lignes: [],
        totalHT: 0,
        totalTTC: 0,
        totalTVA: 0,
      },
      error: "",
      preview: false,
      devise: "XOF",
      emailTo: "",
      emailStatus: "",
      previewHTML: "",
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    },
    filtered() {
      const s = this.search.toLowerCase();
      return this.factures.filter((f) => f.numero.toLowerCase().includes(s));
    },
    // Filtre uniquement les taxes de type TVA
    tvaList() {
      return this.taxes.filter((t) => t.type === "TVA");
    },
  },
  async mounted() {
    this.clients = await clientsStore.getAll();
    this.designations = await designationsStore.getAll();
    this.taxes = await taxesStore.getAll();

    // Récupère la devise depuis settings au chargement
    const settings = await window.settingsStore.get();
    this.devise = (settings && settings.devisePrincipale) || "XOF";

    this.refresh();

    // Écouteur pour ouvrir le modal depuis App
    if (!this._factureModalListener) {
      this._factureModalListener = () => this.openAdd();
      window.addEventListener("open-facture-modal", this._factureModalListener);
    }

    // Listener settings-changed pour devise
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") {
        this.devise = value;
        this.refresh(); // Rafraîchit l'affichage avec la nouvelle devise
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._factureModalListener) {
      window.removeEventListener(
        "open-facture-modal",
        this._factureModalListener
      );
    }
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.factures = await facturesStore.getAll();
    },
    async openAdd() {
      this.editId = null;
      // Génération automatique du numéro et de la date
      const settings = await window.settingsStore.get();
      const factureNumType =
        (settings && settings.factureNumType) || "prefix-increment";
      const prefix = (settings && settings.facturePrefix) || "FAC";
      const incrementStep = (settings && settings.factureIncrement) || 1; // Pas d'incrémentation

      let numero = "";
      if (factureNumType === "prefix-increment") {
        // Cherche le numéro maximum existant
        const nums = this.factures
          .map((f) => f.numero)
          .filter((n) => n && n.startsWith(prefix + "-"))
          .map((n) => parseInt(n.replace(prefix + "-", "")))
          .filter((n) => !isNaN(n));

        let nextNum = incrementStep; // Commence au pas d'incrémentation
        if (nums.length > 0) {
          const maxNum = Math.max(...nums);
          // Le prochain numéro est le maximum actuel + le pas d'incrémentation
          nextNum = maxNum + incrementStep;
        }
        numero = `${prefix}-${String(nextNum).padStart(4, "0")}`;
      } else if (factureNumType === "year-prefix") {
        const year = new Date().getFullYear();
        const nums = this.factures
          .map((f) => f.numero)
          .filter((n) => n && n.startsWith(year + "-"))
          .map((n) => parseInt(n.replace(year + "-", "")))
          .filter((n) => !isNaN(n));

        let nextNum = incrementStep;
        if (nums.length > 0) {
          const maxNum = Math.max(...nums);
          nextNum = maxNum + incrementStep;
        }
        numero = `${year}-${String(nextNum).padStart(4, "0")}`;
      } else if (factureNumType === "date-random") {
        const d = new Date();
        const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}${String(d.getDate()).padStart(2, "0")}`;
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        numero = `${dateStr}-${rand}`;
      }
      const today = new Date().toISOString().slice(0, 10);
      this.form = {
        numero,
        clientId: "",
        date: today,
        type: "normale",
        objet: "",
        garantie: "",
        validiteOffre: "",
        delaisLivraison: "",
        delaisExecution: "",
        conditionPaiement: "",
        lignes: [],
        totalHT: 0,
        totalTTC: 0,
        totalTVA: 0,
      };
      // Récupère la devise principale depuis settings
      this.devise = (settings && settings.devisePrincipale) || "XOF";
      this.error = "";
      this.preview = false;
      this.showModal = true;
    },
    async openEdit(f) {
      this.editId = f.id;
      this.form = {
        numero: f.numero,
        clientId: f.clientId,
        date: f.date,
        type: f.type || "normale",
        objet: f.objet || "",
        garantie: f.garantie || "",
        validiteOffre: f.validiteOffre || "",
        delaisLivraison: f.delaisLivraison || "",
        delaisExecution: f.delaisExecution || "",
        conditionPaiement: f.conditionPaiement || "",
        lignes: f.lignes ? JSON.parse(JSON.stringify(f.lignes)) : [],
        totalHT: f.totalHT || 0,
        totalTTC: f.totalTTC || 0,
        totalTVA: f.totalTVA || 0,
      };
      // Récupère la devise depuis settings (et non localStorage)
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || "XOF";
      this.error = "";
      this.preview = false;
      this.showModal = true;
    },
    // Méthode pour forcer les majuscules sur l'objet
    updateObjet() {
      this.form.objet = this.form.objet.toUpperCase();
    },
    addLigne() {
      this.form.lignes.push({
        designationId: "",
        quantite: 1,
        prix: 0,
        total: 0,
        taxeId: "",
      });
      this.calcTotals();
    },
    removeLigne(idx) {
      this.form.lignes.splice(idx, 1);
      this.calcTotals();
    },
    updateLigne(idx) {
      const l = this.form.lignes[idx];
      // Si une désignation est choisie, auto-remplir prix
      if (l.designationId) {
        const d = this.designations.find((d) => d.id == l.designationId);
        if (d) {
          l.prix = d.prix;
        }
      }
      l.total = l.quantite * l.prix;
      this.calcTotals();
    },
    updateLigneField(idx, field, value) {
      this.form.lignes[idx][field] = value;
      if (field === "designationId") {
        this.updateLigne(idx);
      } else {
        // Recalcul du total de la ligne
        this.form.lignes[idx].total =
          this.form.lignes[idx].quantite * this.form.lignes[idx].prix;
        this.calcTotals();
      }
    },
    calcTotals() {
      // Calcul du total HT (somme de toutes les lignes)
      let ht = 0;
      let tva = 0;

      for (const l of this.form.lignes) {
        // Total HT de la ligne
        const totalLigne = l.total || 0;
        ht += totalLigne;

        // Application de la TVA sur chaque ligne individuellement
        if (l.taxeId) {
          const t = this.taxes.find(
            (t) => t.id == l.taxeId && t.type === "TVA"
          );
          if (t) {
            // TVA calculée sur le montant de cette ligne
            tva += (totalLigne * t.taux) / 100;
          }
        }
      }

      this.form.totalHT = ht;
      this.form.totalTVA = tva;
      this.form.totalTTC = ht + tva;
    },
    // Vérifie si le prix est inférieur au prix min pour chaque ligne
    checkPrixMin() {
      for (const l of this.form.lignes) {
        if (l.designationId && l.prix !== null && l.prix !== undefined) {
          const d = this.designations.find((d) => d.id == l.designationId);
          if (d && d.prixMin !== null && d.prixMin !== undefined) {
            if (l.prix < d.prixMin) {
              return false;
            }
          }
        }
      }
      return true;
    },
    // Validation complète avant enregistrement
    validateForm() {
      // Vérification des champs obligatoires
      if (!this.form.numero || !this.form.numero.trim()) {
        this.error = "Le numéro de facture est requis";
        return false;
      }
      if (!this.form.clientId) {
        this.error = "Veuillez sélectionner un client";
        return false;
      }
      if (!this.form.date) {
        this.error = "La date est requise";
        return false;
      }
      if (this.form.lignes.length === 0) {
        this.error = "Veuillez ajouter au moins une ligne à la facture";
        return false;
      }

      // Vérification que chaque ligne a une désignation et un prix
      for (let i = 0; i < this.form.lignes.length; i++) {
        const l = this.form.lignes[i];
        if (!l.designationId) {
          this.error = `Ligne ${i + 1} : veuillez sélectionner une désignation`;
          return false;
        }
        if (!l.quantite || l.quantite <= 0) {
          this.error = `Ligne ${i + 1} : la quantité doit être supérieure à 0`;
          return false;
        }
        if (l.prix === null || l.prix === undefined || l.prix < 0) {
          this.error = `Ligne ${i + 1} : le prix doit être positif`;
          return false;
        }
      }

      // Vérification du prix minimum
      if (!this.checkPrixMin()) {
        this.error =
          "Le prix de vente d'une ou plusieurs lignes est inférieur au prix minimum autorisé";
        return false;
      }

      // Vérifications spécifiques pour les factures proforma
      if (this.form.type === "proforma") {
        if (!this.form.validiteOffre || !this.form.validiteOffre.trim()) {
          this.error =
            "Pour une facture proforma, la validité de l'offre est requise";
          return false;
        }
      }

      return true;
    },
    async save() {
      // Réinitialiser le message d'erreur
      this.error = "";

      // Validation complète
      if (!this.validateForm()) {
        return;
      }

      // Recalcul des totaux avant sauvegarde
      this.calcTotals();

      // Préparation des données
      const data = {
        numero: this.form.numero.trim(),
        clientId: this.form.clientId,
        date: this.form.date,
        type: this.form.type,
        objet: this.form.objet.toUpperCase(),
        garantie: this.form.garantie,
        validiteOffre: this.form.validiteOffre,
        delaisLivraison: this.form.delaisLivraison,
        delaisExecution: this.form.delaisExecution,
        conditionPaiement: this.form.conditionPaiement,
        lignes: JSON.parse(JSON.stringify(this.form.lignes)),
        totalHT: this.form.totalHT,
        totalTVA: this.form.totalTVA,
        totalTTC: this.form.totalTTC,
      };

      try {
        if (this.editId) {
          await facturesStore.update(this.editId, data);
        } else {
          await facturesStore.add(data);
        }
        this.showModal = false;
        this.refresh();
        // Message de succès (optionnel)
        if (window.App && window.App.showToast) {
          window.App.showToast("Facture enregistrée avec succès", "success");
        }
      } catch (err) {
        this.error =
          "Erreur lors de l'enregistrement : " +
          (err.message || "erreur inconnue");
      }
    },
    async remove(id) {
      if (
        confirm(
          "Voulez-vous vraiment supprimer cette facture ? Cette action est irréversible."
        )
      ) {
        try {
          await facturesStore.delete(id);
          this.refresh();
          if (window.App && window.App.showToast) {
            window.App.showToast("Facture supprimée", "success");
          }
        } catch (err) {
          alert(
            "Erreur lors de la suppression : " +
              (err.message || "erreur inconnue")
          );
        }
      }
    },
    clientLabel(id) {
      const c = this.clients.find((c) => c.id == id);
      return c ? c.nom : "--";
    },
    designationLabel(id) {
      const d = this.designations.find((d) => d.id == id);
      return d ? d.nom : "--";
    },
    taxeLabel(id) {
      const t = this.taxes.find((t) => t.id == id);
      return t ? t.nom + " (" + t.taux + "%)" : "--";
    },
    async showPreview() {
      // Validation rapide avant la prévisualisation
      if (!this.form.clientId) {
        this.error = "Veuillez sélectionner un client avant de prévisualiser";
        return;
      }
      if (this.form.lignes.length === 0) {
        this.error =
          "Veuillez ajouter au moins une ligne avant de prévisualiser";
        return;
      }
      this.error = "";
      this.calcTotals();

      // Génération du HTML selon le modèle choisi
      this.previewHTML = await this.getPreviewHTML();
      this.preview = true;
    },
    hidePreview() {
      this.preview = false;
    },
    async getPreviewHTML() {
      // Récupère le modèle choisi dans les settings
      const settings = await window.settingsStore.get();
      const modele = (settings && settings.modeleFacture) || "modele1";

      const client = this.clients.find((c) => c.id == this.form.clientId);
      const clientNom = client ? client.nom : "--";

      // Modèle 1 - Classique
      if (modele === "modele1") {
        return `
          <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: #000;">
            <!-- En-tête -->
            <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 32px; color: #2563eb;">${
                this.form.type === "proforma" ? "FACTURE PROFORMA" : "FACTURE"
              }</h1>
              <p style="margin: 5px 0; font-size: 18px; color: #666;">N° ${
                this.form.numero
              }</p>
              <p style="margin: 5px 0; color: #666;">Date : ${
                this.form.date
              }</p>
            </div>
            
            <!-- Informations client -->
            <div style="margin-bottom: 30px;">
              <p style="margin: 5px 0;"><strong>Client :</strong> ${clientNom}</p>
              ${
                this.form.objet
                  ? `<p style="margin: 15px 0; font-size: 14px;"><strong>OBJET :</strong> ${this.form.objet}</p>`
                  : ""
              }
            </div>
            
            <!-- Infos proforma -->
            ${
              this.form.type === "proforma" &&
              (this.form.validiteOffre ||
                this.form.delaisLivraison ||
                this.form.delaisExecution ||
                this.form.conditionPaiement)
                ? `
              <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Conditions de l'offre</p>
                ${
                  this.form.validiteOffre
                    ? `<p style="margin: 5px 0;"><strong>Validité :</strong> ${this.form.validiteOffre}</p>`
                    : ""
                }
                ${
                  this.form.delaisLivraison
                    ? `<p style="margin: 5px 0;"><strong>Délais de livraison :</strong> ${this.form.delaisLivraison}</p>`
                    : ""
                }
                ${
                  this.form.delaisExecution
                    ? `<p style="margin: 5px 0;"><strong>Délais d'exécution :</strong> ${this.form.delaisExecution}</p>`
                    : ""
                }
                ${
                  this.form.conditionPaiement
                    ? `<p style="margin: 5px 0;"><strong>Condition de paiement :</strong> ${this.form.conditionPaiement}</p>`
                    : ""
                }
              </div>
            `
                : ""
            }
            
            ${
              this.form.garantie
                ? `<div style="background: #dbeafe; padding: 10px; border-left: 4px solid #2563eb; margin-bottom: 20px;"><strong>Garantie :</strong> ${this.form.garantie}</div>`
                : ""
            }
            
            <!-- Tableau des lignes -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Désignation</th>
                  <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center; width: 80px;">Qté</th>
                  <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; width: 120px;">Prix unit.</th>
                  <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; width: 120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.form.lignes
                  .map(
                    (l) => `
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">${this.designationLabel(
                      l.designationId
                    )}</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${
                      l.quantite
                    }</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${this.helpers.formatMontant(
                      l.prix,
                      this.devise
                    )}</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right; font-weight: bold;">${this.helpers.formatMontant(
                      l.total,
                      this.devise
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            
            <!-- Totaux -->
            <div style="text-align: right; margin-top: 30px;">
              <div style="display: inline-block; min-width: 300px; text-align: left;">
                <div style="padding: 10px 0; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between;">
                  <span>Total HT :</span>
                  <span style="font-weight: bold;">${this.helpers.formatMontant(
                    this.form.totalHT,
                    this.devise
                  )}</span>
                </div>
                <div style="padding: 10px 0; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between;">
                  <span>TVA :</span>
                  <span style="font-weight: bold; color: #f59e0b;">${this.helpers.formatMontant(
                    this.form.totalTVA,
                    this.devise
                  )}</span>
                </div>
                <div style="padding: 15px 0; border-top: 2px solid #000; display: flex; justify-content: space-between; font-size: 20px;">
                  <span style="font-weight: bold;">Total TTC :</span>
                  <span style="font-weight: bold; color: #2563eb;">${this.helpers.formatMontant(
                    this.form.totalTTC,
                    this.devise
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Modèle 2 - Moderne
      if (modele === "modele2") {
        return `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 50px; max-width: 850px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000;">
            <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
              <!-- En-tête moderne -->
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 50px; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">${
                    this.form.type === "proforma" ? "PROFORMA" : "FACTURE"
                  }</h1>
                </div>
                <p style="margin: 10px 0; font-size: 24px; color: #667eea; font-weight: bold;">№ ${
                  this.form.numero
                }</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">📅 ${
                  this.form.date
                }</p>
              </div>
              
              <!-- Info client avec style moderne -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #667eea;">
                <p style="margin: 5px 0; font-size: 16px;"><strong style="color: #667eea;">👤 Client :</strong> ${clientNom}</p>
                ${
                  this.form.objet
                    ? `<p style="margin: 15px 0; font-size: 14px;"><strong style="color: #667eea;">📋 OBJET :</strong> ${this.form.objet}</p>`
                    : ""
                }
              </div>
              
              ${
                this.form.type === "proforma" &&
                (this.form.validiteOffre ||
                  this.form.delaisLivraison ||
                  this.form.delaisExecution ||
                  this.form.conditionPaiement)
                  ? `
                <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #2d3436;">⚡ Conditions</p>
                  ${
                    this.form.validiteOffre
                      ? `<p style="margin: 5px 0;">✓ Validité : ${this.form.validiteOffre}</p>`
                      : ""
                  }
                  ${
                    this.form.delaisLivraison
                      ? `<p style="margin: 5px 0;">✓ Livraison : ${this.form.delaisLivraison}</p>`
                      : ""
                  }
                  ${
                    this.form.delaisExecution
                      ? `<p style="margin: 5px 0;">✓ Exécution : ${this.form.delaisExecution}</p>`
                      : ""
                  }
                  ${
                    this.form.conditionPaiement
                      ? `<p style="margin: 5px 0;">✓ Paiement : ${this.form.conditionPaiement}</p>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
              
              ${
                this.form.garantie
                  ? `<div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3;"><strong>🛡️ Garantie :</strong> ${this.form.garantie}</div>`
                  : ""
              }
              
              <!-- Tableau moderne -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 10px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <th style="padding: 15px; text-align: left;">Désignation</th>
                    <th style="padding: 15px; text-align: center; width: 80px;">Qté</th>
                    <th style="padding: 15px; text-align: right; width: 120px;">Prix</th>
                    <th style="padding: 15px; text-align: right; width: 120px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.form.lignes
                    .map(
                      (l, idx) => `
                    <tr style="background: ${
                      idx % 2 === 0 ? "#f8f9fa" : "white"
                    };">
                      <td style="padding: 12px;">${this.designationLabel(
                        l.designationId
                      )}</td>
                      <td style="padding: 12px; text-align: center;">${
                        l.quantite
                      }</td>
                      <td style="padding: 12px; text-align: right;">${this.helpers.formatMontant(
                        l.prix,
                        this.devise
                      )}</td>
                      <td style="padding: 12px; text-align: right; font-weight: bold; color: #667eea;">${this.helpers.formatMontant(
                        l.total,
                        this.devise
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              
              <!-- Totaux modernes -->
              <div style="text-align: right; margin-top: 30px;">
                <div style="display: inline-block; min-width: 350px; background: #f8f9fa; padding: 25px; border-radius: 15px;">
                  <div style="padding: 10px 0; display: flex; justify-content: space-between; font-size: 16px;">
                    <span>Total HT</span>
                    <span style="font-weight: bold;">${this.helpers.formatMontant(
                      this.form.totalHT,
                      this.devise
                    )}</span>
                  </div>
                  <div style="padding: 10px 0; display: flex; justify-content: space-between; font-size: 16px; border-bottom: 2px dashed #ddd;">
                    <span>TVA</span>
                    <span style="font-weight: bold; color: #f59e0b;">${this.helpers.formatMontant(
                      this.form.totalTVA,
                      this.devise
                    )}</span>
                  </div>
                  <div style="padding: 20px 0; display: flex; justify-content: space-between; font-size: 24px;">
                    <span style="font-weight: bold;">Total TTC</span>
                    <span style="font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${this.helpers.formatMontant(
                      this.form.totalTTC,
                      this.devise
                    )}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Modèle 3 - Minimaliste
      if (modele === "modele3") {
        return `
          <div style="font-family: 'Courier New', monospace; padding: 60px 40px; max-width: 750px; margin: 0 auto; background: white; color: #000;">
            <!-- En-tête minimaliste -->
            <div style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 5px;">${
                this.form.type === "proforma" ? "PROFORMA" : "INVOICE"
              }</h1>
            </div>
            
            <!-- Infos essentielles -->
            <div style="margin-bottom: 40px; line-height: 1.8;">
              <p style="margin: 5px 0;">N° ${this.form.numero}</p>
              <p style="margin: 5px 0;">Date: ${this.form.date}</p>
              <p style="margin: 5px 0;">Client: ${clientNom}</p>
              ${
                this.form.objet
                  ? `<p style="margin: 15px 0; text-transform: uppercase;">${this.form.objet}</p>`
                  : ""
              }
            </div>
            
            ${
              this.form.type === "proforma" &&
              (this.form.validiteOffre ||
                this.form.delaisLivraison ||
                this.form.delaisExecution ||
                this.form.conditionPaiement)
                ? `
              <div style="border-left: 2px solid #000; padding-left: 15px; margin-bottom: 30px; line-height: 1.8;">
                ${
                  this.form.validiteOffre
                    ? `<p style="margin: 5px 0;">Validité: ${this.form.validiteOffre}</p>`
                    : ""
                }
                ${
                  this.form.delaisLivraison
                    ? `<p style="margin: 5px 0;">Livraison: ${this.form.delaisLivraison}</p>`
                    : ""
                }
                ${
                  this.form.delaisExecution
                    ? `<p style="margin: 5px 0;">Exécution: ${this.form.delaisExecution}</p>`
                    : ""
                }
                ${
                  this.form.conditionPaiement
                    ? `<p style="margin: 5px 0;">Paiement: ${this.form.conditionPaiement}</p>`
                    : ""
                }
              </div>
            `
                : ""
            }
            
            ${
              this.form.garantie
                ? `<div style="border-left: 2px solid #000; padding-left: 15px; margin-bottom: 30px;"><p style="margin: 0;">Garantie: ${this.form.garantie}</p></div>`
                : ""
            }
            
            <!-- Tableau minimaliste -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
              <thead>
                <tr style="border-bottom: 2px solid #000;">
                  <th style="padding: 10px 0; text-align: left; font-weight: normal;">Item</th>
                  <th style="padding: 10px 0; text-align: center; width: 60px; font-weight: normal;">Qty</th>
                  <th style="padding: 10px 0; text-align: right; width: 100px; font-weight: normal;">Price</th>
                  <th style="padding: 10px 0; text-align: right; width: 100px; font-weight: normal;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${this.form.lignes
                  .map(
                    (l) => `
                  <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 12px 0;">${this.designationLabel(
                      l.designationId
                    )}</td>
                    <td style="padding: 12px 0; text-align: center;">${
                      l.quantite
                    }</td>
                    <td style="padding: 12px 0; text-align: right;">${this.helpers.formatMontant(
                      l.prix,
                      this.devise
                    )}</td>
                    <td style="padding: 12px 0; text-align: right;">${this.helpers.formatMontant(
                      l.total,
                      this.devise
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            
            <!-- Totaux minimalistes -->
            <div style="text-align: right; border-top: 2px solid #000; padding-top: 20px;">
              <div style="display: inline-block; min-width: 300px; text-align: left; line-height: 2;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Subtotal:</span>
                  <span>${this.helpers.formatMontant(
                    this.form.totalHT,
                    this.devise
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Tax:</span>
                  <span>${this.helpers.formatMontant(
                    this.form.totalTVA,
                    this.devise
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; font-size: 18px;">
                  <span style="font-weight: bold;">TOTAL:</span>
                  <span style="font-weight: bold;">${this.helpers.formatMontant(
                    this.form.totalTTC,
                    this.devise
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      return "";
    },
    exportPDF() {
      // Utilise html2pdf.js pour exporter le bloc de preview
      const el = document.getElementById("facture-preview-block");
      if (!el) {
        alert(
          "Impossible de générer le PDF. Élément de prévisualisation introuvable."
        );
        return;
      }

      const filename = `facture_${this.form.type}_${this.form.numero.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.pdf`;

      html2pdf()
        .set({
          margin: 10,
          filename: filename,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    },
    async sendEmail() {
      // Génère le PDF en blob, puis envoie via EmailJS
      const el = document.getElementById("facture-preview-block");
      if (!el) {
        this.emailStatus = "Erreur : élément de prévisualisation introuvable";
        return;
      }

      this.emailStatus = "Génération du PDF en cours...";

      // Générer le PDF en blob
      const opt = {
        margin: 10,
        filename: `facture-${this.form.numero || "preview"}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      try {
        const pdfBlob = await html2pdf().set(opt).from(el).outputPdf("blob");

        // Préparer l'email
        const client = this.clients.find((c) => c.id == this.form.clientId);
        const emailTo = this.emailTo || (client ? client.email : "");

        if (!emailTo) {
          this.emailStatus = "Erreur : Email du client manquant";
          return;
        }

        this.emailStatus = "Envoi en cours...";

        // Convertir le blob en base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];

          // Appel EmailJS (nécessite config user/service/template)
          try {
            await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
              to_email: emailTo,
              facture_numero: this.form.numero,
              facture_date: this.form.date,
              facture_total: this.helpers.formatMontant(
                this.form.totalTTC,
                this.devise
              ),
              attachment: base64,
            });
            this.emailStatus = "✓ Facture envoyée à " + emailTo;
          } catch (e) {
            this.emailStatus = "Erreur envoi : " + (e.text || e.message);
          }
        };
        reader.readAsDataURL(pdfBlob);
      } catch (err) {
        this.emailStatus =
          "Erreur lors de la génération du PDF : " + err.message;
      }
    },
  },
  // (ancienne section computed supprimée)
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Factures</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouvelle facture</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche facture...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Numéro</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-left">Client</th>
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Total TTC</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.id">
              <td class="px-4 py-2">{{ f.numero }}</td>
              <td class="px-4 py-2">
                <span :class="f.type === 'proforma' ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs' : 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs'">
                  {{ f.type === 'proforma' ? 'Proforma' : 'Normale' }}
                </span>
              </td>
              <td class="px-4 py-2">{{ clientLabel(f.clientId) }}</td>
              <td class="px-4 py-2">{{ f.date }}</td>
              <td class="px-4 py-2">{{ helpers.formatMontant(f.totalTTC, devise) }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(f)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(f.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="text-center text-gray-400 py-4">Aucune facture</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-3xl relative my-8">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Nouvelle' }} facture</h3>
          <div v-if="error" class="text-red-600 mb-2 text-sm">{{ error }}</div>
          
          <!-- Type de facture -->
          <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" v-model="form.type" true-value="proforma" false-value="normale" class="mr-2">
              <span class="font-semibold">Facture Proforma</span>
            </label>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <!-- Champs visibles pour l'utilisateur -->
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Numéro</label>
              <input v-model="form.numero" type="text" class="border rounded px-3 py-2 w-full bg-gray-100 dark:bg-gray-700 cursor-not-allowed" placeholder="Numéro" readonly>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Client</label>
              <select v-model="form.clientId" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
                <option value="">Sélectionner un client</option>
                <option v-for="c in clients" :value="c.id">{{ c.nom }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Date</label>
              <input v-model="form.date" type="date" class="border rounded px-3 py-2 w-full bg-gray-100 dark:bg-gray-700 cursor-not-allowed" readonly>
            </div>
            
            <!-- Champs cachés dupliqués pour garantir l'envoi -->
            <input type="hidden" :value="form.numero" name="numero_hidden">
            <input type="hidden" :value="form.date" name="date_hidden">
          </div>
          
          <!-- Champ Objet -->
          <div class="mb-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Objet (en majuscules)</label>
            <input v-model="form.objet" @input="updateObjet" type="text" class="border rounded px-3 py-2 w-full uppercase" placeholder="OBJET DE LA FACTURE">
          </div>
          
          <!-- Champ Garantie -->
          <div class="mb-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Garantie (facultatif)</label>
            <input v-model="form.garantie" type="text" class="border rounded px-3 py-2 w-full" placeholder="Garantie">
          </div>
          
          <!-- Champs proforma (conditionnels) -->
          <div v-if="form.type === 'proforma'" class="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded space-y-2">
            <div class="text-sm font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Informations Proforma</div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Validité de l'offre</label>
              <input v-model="form.validiteOffre" type="text" class="border rounded px-3 py-2 w-full" placeholder="ex: 30 jours">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Délais de livraison</label>
              <input v-model="form.delaisLivraison" type="text" class="border rounded px-3 py-2 w-full" placeholder="Délais de livraison">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Délais d'exécution</label>
              <input v-model="form.delaisExecution" type="text" class="border rounded px-3 py-2 w-full" placeholder="Délais d'exécution">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Condition de paiement</label>
              <input v-model="form.conditionPaiement" type="text" class="border rounded px-3 py-2 w-full" placeholder="Condition de paiement">
            </div>
          </div>
          
          <!-- Lignes de facture -->
          <div class="mb-2">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold">Lignes de la facture</span>
              <button class="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700" @click="addLigne">+ Ajouter ligne</button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-xs mb-2 border">
                <thead>
                  <tr class="bg-gray-100 dark:bg-gray-700">
                    <th class="px-2 py-2 text-left">Désignation</th>
                    <th class="px-2 py-2 text-left">Quantité</th>
                    <th class="px-2 py-2 text-left">Prix unitaire</th>
                    <th class="px-2 py-2 text-left">Taxe TVA</th>
                    <th class="px-2 py-2 text-left">Total ligne</th>
                    <th class="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(l, idx) in form.lignes" :key="idx" class="border-b">
                    <td class="px-2 py-2">
                      <select v-model="l.designationId" class="border rounded px-2 py-1 w-full text-xs" @change="updateLigne(idx)">
                        <option value="">-- Sélectionner --</option>
                        <option v-for="d in designations" :value="d.id">{{ d.nom }}</option>
                      </select>
                    </td>
                    <td class="px-2 py-2">
                      <input v-model.number="l.quantite" type="number" min="1" step="1" class="border rounded px-2 py-1 w-20 text-xs" @input="updateLigneField(idx, 'quantite', l.quantite)">
                    </td>
                    <td class="px-2 py-2">
                      <input v-model.number="l.prix" type="number" min="0" step="0.01" class="border rounded px-2 py-1 w-24 text-xs" @input="updateLigneField(idx, 'prix', l.prix)">
                      <span v-if="l.designationId && designations.find(d => d.id == l.designationId)?.prixMin && l.prix < designations.find(d => d.id == l.designationId).prixMin" class="text-red-600 text-xs block mt-1">
                        ⚠ Min: {{ helpers.formatMontant(designations.find(d => d.id == l.designationId).prixMin, devise) }}
                      </span>
                    </td>
                    <td class="px-2 py-2">
                      <select v-model="l.taxeId" class="border rounded px-2 py-1 w-full text-xs" @change="updateLigneField(idx, 'taxeId', l.taxeId)">
                        <option value="">Aucune</option>
                        <option v-for="t in tvaList" :value="t.id">{{ t.nom }} ({{ t.taux }}%)</option>
                      </select>
                    </td>
                    <td class="px-2 py-2 font-semibold">{{ helpers.formatMontant(l.total, devise) }}</td>
                    <td class="px-2 py-2">
                      <button class="text-red-600 hover:text-red-800 text-xs font-semibold" @click="removeLigne(idx)">✕</button>
                    </td>
                  </tr>
                  <tr v-if="form.lignes.length === 0">
                    <td colspan="6" class="text-center text-gray-400 py-4">Aucune ligne ajoutée</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Totaux -->
          <div class="flex flex-wrap gap-4 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div class="flex-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">Total HT</div>
              <div class="text-lg font-semibold">{{ helpers.formatMontant(form.totalHT, devise) }}</div>
            </div>
            <div class="flex-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">TVA</div>
              <div class="text-lg font-semibold text-orange-600">{{ helpers.formatMontant(form.totalTVA, devise) }}</div>
            </div>
            <div class="flex-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">Total TTC</div>
              <div class="text-xl font-bold text-blue-600">{{ helpers.formatMontant(form.totalTTC, devise) }}</div>
            </div>
          </div>
          
          <!-- Message d'avertissement si prix minimum non respecté -->
          <div v-if="!checkPrixMin()" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded">
            <div class="text-red-600 dark:text-red-400 text-sm font-semibold">
              ⚠ Attention : Le prix de vente d'une ou plusieurs lignes est inférieur au prix minimum autorisé. Veuillez corriger avant d'enregistrer.
            </div>
          </div>
          
          <div class="flex justify-between items-center mt-4">
            <div class="flex gap-2">
              <button class="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300" @click="showModal=false">Annuler</button>
              <button 
                class="px-4 py-2 rounded text-white font-semibold" 
                @click="save" 
                :disabled="!checkPrixMin()" 
                :class="checkPrixMin() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'"
              >
                {{ editId ? 'Mettre à jour' : 'Enregistrer' }}
              </button>
            </div>
            <button class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" @click="showPreview">👁 Prévisualiser</button>
          </div>
          
          <!-- Preview -->
          <div v-if="preview" class="mt-6 border-t pt-4">
            <div class="mb-2 flex justify-between items-start">
              <div class="flex-1">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Aperçu de la facture</div>
              </div>
              <div class="flex flex-col gap-2">
                <button class="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300" @click="hidePreview">✕ Fermer</button>
                <button class="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700" @click="exportPDF">📄 PDF</button>
                <button class="text-sm px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700" @click="sendEmail">📧 Email</button>
              </div>
            </div>
            
            <div class="mb-2 flex items-center gap-2">
              <label class="text-xs font-semibold dark:text-gray-300">Email destinataire :</label>
              <input v-model="emailTo" type="email" class="border rounded px-2 py-1 w-64 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Email du client (optionnel)">
              <span v-if="emailStatus" class="text-xs font-semibold" :class="emailStatus.startsWith('Erreur') ? 'text-red-600' : 'text-green-600'">{{ emailStatus }}</span>
            </div>
            
            <!-- Conteneur pour le HTML généré dynamiquement -->
            <div id="facture-preview-block" class="border rounded shadow-lg overflow-auto" style="max-height: 600px;" v-html="previewHTML"></div>
          </div>
        </div>
      </div>
    </div>
  `,
};
// src/pages/BonsCommandes.vue.js
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
    // Listener settings-changed pour évolutivité future (ex: devise, couleurs...)
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      // Ajoutez ici la logique si un paramètre global doit impacter cette page
      // Ex: if (key === 'devisePrincipale') { ... }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
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
// src/pages/Parametres.vue.js
window.ParametresPage = {
  computed: {
    helpers() {
      return window.helpers;
    },
  },
  data() {
    return {
      devise: "EUR",
      theme: "light",
      sidebarColor: "#f1f5f9",
      facturePrefix: "FAC",
      factureIncrement: 1,
      modeleFacture: "modele1",
      devises: [
        { code: "EUR", label: "Euro (€)" },
        { code: "XOF", label: "Franc CFA (XOF)" },
        { code: "USD", label: "Dollar ($)" },
      ],
      modeles: [
        { code: "modele1", label: "Modèle 1 - Classique" },
        { code: "modele2", label: "Modèle 2 - Moderne" },
        { code: "modele3", label: "Modèle 3 - Minimaliste" },
      ],
    };
  },
  async mounted() {
    const settings = await window.settingsStore.get();
    if (settings) {
      this.devise = settings.devisePrincipale || "XOF";
      this.theme = settings.theme || "light";
      this.sidebarColor = settings.sidebarColor || "#f1f5f9";
      this.facturePrefix = settings.facturePrefix || "FAC";
      this.factureIncrement = settings.factureIncrement || 1;
      this.modeleFacture = settings.modeleFacture || "modele1";
    }
    // Listener settings-changed pour synchroniser dynamiquement l'UI
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") this.devise = value;
      if (key === "theme") this.theme = value;
      if (key === "sidebarColor") this.sidebarColor = value;
      if (key === "facturePrefix") this.facturePrefix = value;
      if (key === "factureIncrement") this.factureIncrement = value;
      if (key === "modeleFacture") this.modeleFacture = value;
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async save() {
      // Mise à jour centralisée via settingsStore
      await window.settingsStore.setAll({
        devisePrincipale: this.devise,
        theme: this.theme,
        sidebarColor: this.sidebarColor,
        facturePrefix: this.facturePrefix,
        factureIncrement: Number(this.factureIncrement),
        modeleFacture: this.modeleFacture,
      });
      alert("Paramètres enregistrés !");
    },
  },
  template: `
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 dark:text-white">Paramètres</h2>
      <form class="space-y-6" @submit.prevent="save">
        
        <!-- Apparence -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Apparence</h3>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Thème</label>
            <select v-model="theme" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
          
          <div>
            <label class="block mb-2 font-semibold dark:text-gray-300">Couleur de la barre latérale</label>
            <div class="flex items-center gap-3">
              <input v-model="sidebarColor" type="color" class="w-20 h-10 border rounded cursor-pointer">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ sidebarColor }}</span>
            </div>
          </div>
        </div>
        
        <!-- Devise -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Devise</h3>
          
          <div>
            <label class="block mb-2 font-semibold dark:text-gray-300">Devise principale</label>
            <select v-model="devise" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option v-for="d in devises" :value="d.code">{{ d.label }}</option>
            </select>
          </div>
        </div>
        
        <!-- Facturation -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Facturation</h3>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Préfixe facture</label>
            <input v-model="facturePrefix" type="text" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="FAC">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Exemple : FAC-0001, FAC-0002...</p>
          </div>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Pas d'incrémentation</label>
            <input v-model="factureIncrement" type="number" min="1" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="1">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">1 = numérotation normale (0001, 0002...), 2 = saute de 2 en 2 (0002, 0004...)</p>
          </div>
          
          <div>
            <label class="block mb-2 font-semibold dark:text-gray-300">Modèle de facture</label>
            <select v-model="modeleFacture" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option v-for="m in modeles" :value="m.code">{{ m.label }}</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Choisissez le style de vos factures PDF</p>
          </div>
        </div>
        
        <button type="submit" class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 font-semibold">
          💾 Enregistrer les paramètres
        </button>
      </form>
    </div>
  `,
};
// src/pages/ImportExport.vue.js
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
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Import Excel</h3>
          <div class="flex flex-wrap gap-2">
            <div v-for="table in ['clients','fournisseurs','taxes','unites','categories','designations','factures','bons_commandes']" :key="table">
              <label class="block text-xs font-semibold mb-1">{{ table }}</label>
              <input type="file" class="mb-1" @change="e => importExcel(e, table)">
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 class="font-semibold mb-2">Export Excel</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="table in ['clients','fournisseurs','taxes','unites','categories','designations','factures','bons_commandes']" :key="table" class="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 mb-1" @click="() => exportExcel(table)">
              Exporter {{ table }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
