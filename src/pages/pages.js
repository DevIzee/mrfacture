// src/pages/Dashboard.vue.js
if (!window.helpers) {
  throw new Error('helpers.js must be loaded before pages.js. window.helpers is undefined.');
}
window.DashboardPage = {
  data() {
    return {
      nbFactures: 0,
      caTotal: 0,
      topClients: [],
      volumeMensuel: [],
      devise: 'EUR',
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    }
  },
  async mounted() {
    await this.refreshData();
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === 'devisePrincipale') {
        this.devise = value;
        this.refreshData();
      }
    };
    window.addEventListener('settings-changed', this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener('settings-changed', this._settingsListener);
    }
  },
  methods: {
    async refreshData() {
      // Récupère la devise principale depuis settings
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || 'EUR';
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
        .map(([id, ca]) => ({ nom: (clients.find(c => c.id == id) || {}).nom || 'Inconnu', ca }))
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
    }
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
  `
};
// src/pages/Clients.vue.js
window.ClientsPage = {
  data() {
    return {
      clients: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '', email: '', telephone: '' },
      error: ''
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
      this.form = { nom: '', email: '', telephone: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(client) {
      this.editId = client.id;
      this.form = { nom: client.nom, email: client.email, telephone: client.telephone || '' };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom || !this.form.email || !this.form.telephone) {
        this.error = 'Nom, email et téléphone requis';
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
      if (confirm('Supprimer ce client ?')) {
        await clientsStore.delete(id);
        this.refresh();
      }
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.clients.filter(c => c.nom.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Fournisseurs.vue.js
window.FournisseursPage = {
  data() {
    return {
      fournisseurs: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '', email: '', telephone: '' },
      error: ''
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
      this.form = { nom: '', email: '', telephone: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(f) {
      this.editId = f.id;
      this.form = { nom: f.nom, email: f.email, telephone: f.telephone || '' };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom || !this.form.email || !this.form.telephone) {
        this.error = 'Nom, email et téléphone requis';
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
      if (confirm('Supprimer ce fournisseur ?')) {
        await fournisseursStore.delete(id);
        this.refresh();
      }
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.fournisseurs.filter(f => f.nom.toLowerCase().includes(s) || f.email.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Taxes.vue.js
window.TaxesPage = {
  data() {
    return {
      taxes: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '', taux: '', type: 'TVA' },
      error: ''
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
      this.form = { nom: '', taux: '', type: 'TVA' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(t) {
      this.editId = t.id;
      this.form = { nom: t.nom, taux: t.taux, type: t.type || 'TVA' };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom || this.form.taux === '' || isNaN(Number(this.form.taux)) || !this.form.type) {
        this.error = 'Nom, taux et type requis';
        return;
      }
      if (this.editId) {
        await taxesStore.update(this.editId, { ...this.form, taux: Number(this.form.taux) });
      } else {
        await taxesStore.add({ ...this.form, taux: Number(this.form.taux) });
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm('Supprimer cette taxe ?')) {
        await taxesStore.delete(id);
        this.refresh();
      }
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.taxes.filter(t => t.nom.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Unites.vue.js
window.UnitesPage = {
  data() {
    return {
      unites: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '', abreviation: '' },
      error: ''
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
      this.form = { nom: '', abreviation: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(u) {
      this.editId = u.id;
      this.form = { nom: u.nom, abreviation: u.abreviation };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = 'Nom requis';
        return;
      }
      if (!this.form.abreviation) {
        this.error = 'Abréviation requise';
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
      if (confirm('Supprimer cette unité ?')) {
        await unitesStore.delete(id);
        this.refresh();
      }
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.unites.filter(u => u.nom.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Categories.vue.js
window.CategoriesPage = {
  data() {
    return {
      categories: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '' },
      error: ''
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
      this.form = { nom: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(c) {
      this.editId = c.id;
      this.form = { nom: c.nom };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = 'Nom requis';
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
      if (confirm('Supprimer cette catégorie ?')) {
        await categoriesStore.delete(id);
        this.refresh();
      }
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.categories.filter(c => c.nom.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Designations.vue.js
window.DesignationsPage = {
  data() {
    return {
      designations: [],
      unites: [],
      categories: [],
      search: '',
      showModal: false,
      editId: null,
      form: { nom: '', uniteId: '', prix: '', prixMin: '', type: 'service', reference: '', categorieId: '' },
      error: ''
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
    window.addEventListener('settings-changed', this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener('settings-changed', this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.designations = await designationsStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { nom: '', uniteId: '', prix: '', prixMin: '', type: 'service', reference: '', categorieId: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(d) {
      this.editId = d.id;
      this.form = {
        nom: d.nom,
        uniteId: d.uniteId,
        prix: d.prix,
        prixMin: d.prixMin || '',
        type: d.type || 'service',
        reference: d.reference || '',
        categorieId: d.categorieId || ''
      };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.nom) {
        this.error = 'Nom requis';
        return;
      }
      if (!this.form.uniteId) {
        this.error = 'Unité requise';
        return;
      }
      if (this.form.prix === '' || isNaN(Number(this.form.prix))) {
        this.error = 'Prix requis';
        return;
      }
      if (this.form.prixMin !== '' && isNaN(Number(this.form.prixMin))) {
        this.error = 'Prix de vente minimum invalide';
        return;
      }
      if (this.form.type === 'produit') {
        if (!this.form.reference) {
          this.error = 'Référence requise pour un produit';
          return;
        }
        if (!this.form.categorieId) {
          this.error = 'Catégorie requise pour un produit';
          return;
        }
      }
      const data = {
        ...this.form,
        prix: Number(this.form.prix),
        prixMin: this.form.prixMin === '' ? null : Number(this.form.prixMin)
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
      if (confirm('Supprimer cette désignation ?')) {
        await designationsStore.delete(id);
        this.refresh();
      }
    },
    uniteLabel(id) {
      const u = this.unites.find(u => u.id == id);
      return u ? u.nom : '--';
    },
    categorieLabel(id) {
      const c = this.categories.find(c => c.id == id);
      return c ? c.nom : '--';
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.designations.filter(d => d.nom.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Factures.vue.js
window.FacturesPage = {
  data() {
    return {
      factures: [],
      clients: [],
      designations: [],
      taxes: [],
      search: '',
      showModal: false,
      editId: null,
      form: {
        numero: '',
        clientId: '',
        date: '',
        lignes: [],
        totalHT: 0,
        totalTTC: 0,
        totalTVA: 0
      },
      error: '',
      preview: false,
      devise: 'EUR'
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    },
    filtered() {
      const s = this.search.toLowerCase();
      return this.factures.filter(f => f.numero.toLowerCase().includes(s));
    }
  },
  async mounted() {
    this.clients = await clientsStore.getAll();
    this.designations = await designationsStore.getAll();
    this.taxes = await taxesStore.getAll();
    this.refresh();
    // Écouteur pour ouvrir le modal depuis App
    if (!this._factureModalListener) {
      this._factureModalListener = () => this.openAdd();
      window.addEventListener('open-facture-modal', this._factureModalListener);
    }
    // Listener settings-changed pour devise
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === 'devisePrincipale') {
        this.devise = value;
      }
    };
    window.addEventListener('settings-changed', this._settingsListener);
  },
  beforeUnmount() {
    if (this._factureModalListener) {
      window.removeEventListener('open-facture-modal', this._factureModalListener);
    }
    if (this._settingsListener) {
      window.removeEventListener('settings-changed', this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.factures = await facturesStore.getAll();
    },
    async openAdd() {
      this.editId = null;
      // Génération automatique du numéro et de la date
      const factureNumType = localStorage.getItem('factureNumType') || 'prefix-increment';
      let numero = '';
      if (factureNumType === 'prefix-increment') {
        const prefix = localStorage.getItem('facturePrefix') || 'FAC';
        let increment = Number(localStorage.getItem('factureIncrement')) || 1;
        // Cherche le max existant
        const nums = this.factures
          .map(f => f.numero)
          .filter(n => n && n.startsWith(prefix + '-'))
          .map(n => parseInt(n.replace(prefix + '-', '')))
          .filter(n => !isNaN(n));
        if (nums.length > 0) increment = Math.max(...nums) + 1;
        numero = `${prefix}-${String(increment).padStart(4, '0')}`;
        localStorage.setItem('factureIncrement', increment);
      } else if (factureNumType === 'year-prefix') {
        const year = new Date().getFullYear();
        const nums = this.factures
          .map(f => f.numero)
          .filter(n => n && n.startsWith(year + '-'))
          .map(n => parseInt(n.replace(year + '-', '')))
          .filter(n => !isNaN(n));
        let increment = 1;
        if (nums.length > 0) increment = Math.max(...nums) + 1;
        numero = `${year}-${String(increment).padStart(4, '0')}`;
      } else if (factureNumType === 'date-random') {
        const d = new Date();
        const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        numero = `${dateStr}-${rand}`;
      }
      const today = new Date().toISOString().slice(0,10);
      this.form = {
        numero,
        clientId: '',
        date: today,
        lignes: [],
        totalHT: 0,
        totalTTC: 0,
        totalTVA: 0
      };
      // Récupère la devise principale depuis settings
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || 'XOF';
      this.error = '';
      this.preview = false;
      this.showModal = true;
    },
    openEdit(f) {
      this.editId = f.id;
      this.form = {
        numero: f.numero,
        clientId: f.clientId,
        date: f.date,
        lignes: f.lignes ? JSON.parse(JSON.stringify(f.lignes)) : [],
        totalHT: f.totalHT || 0,
        totalTTC: f.totalTTC || 0,
        totalTVA: f.totalTVA || 0
      };
      this.devise = localStorage.getItem('devise') || 'EUR';
      this.error = '';
      this.preview = false;
      this.showModal = true;
    },
    addLigne() {
      this.form.lignes.push({ designationId: '', quantite: 1, prix: 0, total: 0, taxeId: '' });
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
        const d = this.designations.find(d => d.id == l.designationId);
        if (d) l.prix = d.prix;
      }
      l.total = l.quantite * l.prix;
      this.calcTotals();
    },
    updateLigneField(idx, field, value) {
      this.form.lignes[idx][field] = value;
      if (field === 'designationId') {
        this.updateLigne(idx);
      } else {
        this.form.lignes[idx].total = this.form.lignes[idx].quantite * this.form.lignes[idx].prix;
        this.calcTotals();
      }
    },
    calcTotals() {
      let ht = 0, tva = 0;
      for (const l of this.form.lignes) {
        ht += l.total;
        if (l.taxeId) {
          const t = this.taxes.find(t => t.id == l.taxeId);
          if (t) tva += l.total * (t.taux / 100);
        }
      }
      this.form.totalHT = ht;
      this.form.totalTVA = tva;
      this.form.totalTTC = ht + tva;
    },
    async save() {
      if (!this.form.numero || !this.form.clientId || !this.form.date || this.form.lignes.length === 0) {
        this.error = 'Tous les champs et au moins une ligne sont requis';
        return;
      }
      this.calcTotals();
      const data = {
        numero: this.form.numero,
        clientId: this.form.clientId,
        date: this.form.date,
        lignes: JSON.parse(JSON.stringify(this.form.lignes)),
        totalHT: this.form.totalHT,
        totalTVA: this.form.totalTVA,
        totalTTC: this.form.totalTTC
      };
      if (this.editId) {
        await facturesStore.update(this.editId, data);
      } else {
        await facturesStore.add(data);
      }
      this.showModal = false;
      this.refresh();
    },
    async remove(id) {
      if (confirm('Supprimer cette facture ?')) {
        await facturesStore.delete(id);
        this.refresh();
      }
    },
    clientLabel(id) {
      const c = this.clients.find(c => c.id == id);
      return c ? c.nom : '--';
    },
    designationLabel(id) {
      const d = this.designations.find(d => d.id == id);
      return d ? d.nom : '--';
    },
    taxeLabel(id) {
      const t = this.taxes.find(t => t.id == id);
      return t ? t.nom + ' (' + t.taux + '%)' : '--';
    },
    showPreview() {
      this.preview = true;
    },
    hidePreview() {
      this.preview = false;
    },
    exportPDF() {
      // Utilise html2pdf.js pour exporter le bloc de preview
      const el = document.getElementById('facture-preview-block');
      if (!el) return;
      html2pdf().set({
        margin: 10,
        filename: `facture-${this.form.numero || 'preview'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save();
    },
    async sendEmail() {
      // Génère le PDF en blob, puis envoie via EmailJS
      const el = document.getElementById('facture-preview-block');
      if (!el) return;
      this.emailStatus = 'Envoi en cours...';
      // Générer le PDF en blob
      const opt = {
        margin: 10,
        filename: `facture-${this.form.numero || 'preview'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(el).outputPdf('blob').then(async (pdfBlob) => {
        // Préparer l'email
        const client = this.clients.find(c => c.id == this.form.clientId);
        const emailTo = this.emailTo || (client ? client.email : '');
        if (!emailTo) {
          this.emailStatus = 'Email du client manquant';
          return;
        }
        // Convertir le blob en base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          // Appel EmailJS (nécessite config user/service/template)
          try {
            await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
              to_email: emailTo,
              facture_numero: this.form.numero,
              facture_date: this.form.date,
              facture_total: this.form.totalTTC,
              attachment: base64
            });
            this.emailStatus = 'Facture envoyée à ' + emailTo;
          } catch (e) {
            this.emailStatus = 'Erreur envoi : ' + (e.text || e.message);
          }
        };
        reader.readAsDataURL(pdfBlob);
      });
    }
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
              <th class="px-4 py-2 text-left">Client</th>
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Total TTC</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.id">
              <td class="px-4 py-2">{{ f.numero }}</td>
              <td class="px-4 py-2">{{ clientLabel(f.clientId) }}</td>
              <td class="px-4 py-2">{{ f.date }}</td>
              <td class="px-4 py-2">{{ helpers.formatMontant(f.totalTTC, devise) }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(f)">Modifier</button>
                <button class="text-red-600 hover:underline" @click="remove(f.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="5" class="text-center text-gray-400 py-4">Aucune facture</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-2xl relative">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Nouvelle' }} facture</h3>
          <div v-if="error" class="text-red-600 mb-2">{{ error }}</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <input v-model="form.numero" type="text" class="border rounded px-3 py-2 w-full bg-gray-100 cursor-not-allowed" placeholder="Numéro" readonly disabled>
            <select v-model="form.clientId" class="border rounded px-3 py-2 w-full">
              <option value="">Client</option>
              <option v-for="c in clients" :value="c.id">{{ c.nom }}</option>
            </select>
            <input v-model="form.date" type="date" class="border rounded px-3 py-2 w-full bg-gray-100 cursor-not-allowed" placeholder="Date" readonly disabled>
          </div>
          <!-- Lignes de facture -->
          <div class="mb-2">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold">Lignes</span>
              <button class="bg-green-600 text-white px-2 py-1 rounded text-sm" @click="addLigne">Ajouter ligne</button>
            </div>
            <table class="min-w-full text-xs mb-2">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700">
                  <th>Désignation</th>
                  <th>Quantité</th>
                  <th>Prix</th>
                  <th>Taxe</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, idx) in form.lignes" :key="idx">
                  <td>
                    <select v-model="l.designationId" class="border rounded px-2 py-1 w-32" @change="updateLigne(idx)">
                      <option value="">--</option>
                      <option v-for="d in designations" :value="d.id">{{ d.nom }}</option>
                    </select>
                  </td>
                  <td><input v-model.number="l.quantite" type="number" min="1" class="border rounded px-2 py-1 w-16" @input="updateLigneField(idx, 'quantite', l.quantite)"></td>
                  <td><input v-model.number="l.prix" type="number" min="0" class="border rounded px-2 py-1 w-20" @input="updateLigneField(idx, 'prix', l.prix)"></td>
                  <td>
                    <select v-model="l.taxeId" class="border rounded px-2 py-1 w-24" @change="updateLigneField(idx, 'taxeId', l.taxeId)">
                      <option value="">--</option>
                      <option v-for="t in taxes" :value="t.id">{{ t.nom }} ({{ t.taux }}%)</option>
                    </select>
                  </td>
                  <td>{{ helpers.formatMontant(l.total, devise) }}</td>
                  <td><button class="text-red-600 text-xs" @click="removeLigne(idx)">Suppr</button></td>
                </tr>
                <tr v-if="form.lignes.length === 0">
                  <td colspan="6" class="text-center text-gray-400">Aucune ligne</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Totaux -->
          <div class="flex flex-wrap gap-4 mb-2">
            <div>Total HT : <span class="font-semibold">{{ helpers.formatMontant(form.totalHT, devise) }}</span></div>
            <div>TVA : <span class="font-semibold">{{ helpers.formatMontant(form.totalTVA, devise) }}</span></div>
            <div>Total TTC : <span class="font-semibold">{{ helpers.formatMontant(form.totalTTC, devise) }}</span></div>
          </div>
          <div class="flex justify-between items-center mt-4">
            <div class="flex gap-2">
              <button class="px-4 py-2 bg-gray-200 rounded" @click="showModal=false">Annuler</button>
              <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="save">Enregistrer</button>
            </div>
            <button class="px-4 py-2 bg-purple-600 text-white rounded" @click="showPreview">Prévisualiser</button>
          </div>
          <!-- Preview -->
          <div v-if="preview" class="mt-6 border-t pt-4">
            <div class="mb-2 flex justify-between">
              <div>
                <div class="font-bold text-lg">Facture n° {{ form.numero }}</div>
                <div>Date : {{ form.date }}</div>
                <div>Client : {{ clientLabel(form.clientId) }}</div>
              </div>
              <div class="flex gap-2">
                <button class="text-sm text-blue-600" @click="hidePreview">Fermer preview</button>
                <button class="text-sm text-green-600" @click="exportPDF">Exporter PDF</button>
                <button class="text-sm text-pink-600" @click="sendEmail">Envoyer par email</button>
              </div>
            </div>
            <div class="mb-2 flex items-center gap-2">
              <label class="text-xs">Email destinataire :</label>
              <input v-model="emailTo" type="email" class="border rounded px-2 py-1 w-64" placeholder="Email du client (optionnel)">
              <span v-if="emailStatus" class="text-xs" :class="emailStatus.startsWith('Erreur') ? 'text-red-600' : 'text-green-600'">{{ emailStatus }}</span>
            </div>
            <div id="facture-preview-block" class="bg-white p-4 rounded shadow mb-2">
              <table class="min-w-full text-xs mb-2">
                <thead>
                  <tr class="bg-gray-100 dark:bg-gray-700">
                    <th>Désignation</th>
                    <th>Quantité</th>
                    <th>Prix</th>
                    <th>Taxe</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in form.lignes" :key="l.designationId">
                    <td>{{ designationLabel(l.designationId) }}</td>
                    <td>{{ l.quantite }}</td>
                    <td>{{ l.prix }}</td>
                    <td>{{ taxeLabel(l.taxeId) }}</td>
                    <td>{{ helpers.formatMontant(l.total, devise) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="flex flex-wrap gap-4 mt-2">
                <div>Total HT : <span class="font-semibold">{{ helpers.formatMontant(form.totalHT, devise) }}</span></div>
                <div>TVA : <span class="font-semibold">{{ helpers.formatMontant(form.totalTVA, devise) }}</span></div>
                <div>Total TTC : <span class="font-semibold">{{ helpers.formatMontant(form.totalTTC, devise) }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
// src/pages/BonsCommandes.vue.js
window.BonsCommandesPage = {
  computed: {
    helpers() { return window.helpers; }
  },
  data() {
    return {
      bons: [],
      fournisseurs: [],
      search: '',
      showModal: false,
      editId: null,
      form: { numero: '', fournisseurId: '', date: '', total: '' },
      error: ''
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
    window.addEventListener('settings-changed', this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener('settings-changed', this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.bons = await bonsCommandesStore.getAll();
    },
    openAdd() {
      this.editId = null;
      this.form = { numero: '', fournisseurId: '', date: '', total: '' };
      this.error = '';
      this.showModal = true;
    },
    openEdit(b) {
      this.editId = b.id;
      this.form = { numero: b.numero, fournisseurId: b.fournisseurId, date: b.date, total: b.total };
      this.error = '';
      this.showModal = true;
    },
    async save() {
      if (!this.form.numero || !this.form.fournisseurId || !this.form.date || this.form.total === '' || isNaN(Number(this.form.total))) {
        this.error = 'Tous les champs sont requis';
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
      if (confirm('Supprimer ce bon de commande ?')) {
        await bonsCommandesStore.delete(id);
        this.refresh();
      }
    },
    fournisseurLabel(id) {
      const f = this.fournisseurs.find(f => f.id == id);
      return f ? f.nom : '--';
    }
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.bons.filter(b => b.numero.toLowerCase().includes(s));
    }
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
  `
};
// src/pages/Parametres.vue.js
window.ParametresPage = {
  computed: {
    helpers() { return window.helpers; }
  },
  data() {
    return {
      devise: 'EUR',
      theme: 'light',
      sidebarColor: '#1e293b',
      facturePrefix: 'FAC',
      factureIncrement: 1,
      devises: [
        { code: 'EUR', label: 'Euro (€)' },
        { code: 'XOF', label: 'Franc CFA (XOF)' },
        { code: 'USD', label: 'Dollar ($)' }
      ]
    };
  },
  async mounted() {
    const settings = await window.settingsStore.get();
    if (settings) {
      this.devise = settings.devisePrincipale || 'EUR';
      this.theme = settings.theme || 'light';
      this.sidebarColor = settings.sidebarColor || '#1e293b';
      this.facturePrefix = settings.facturePrefix || 'FAC';
      this.factureIncrement = settings.factureIncrement || 1;
    }
    // Listener settings-changed pour synchroniser dynamiquement l'UI
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === 'devisePrincipale') this.devise = value;
      if (key === 'theme') this.theme = value;
      if (key === 'sidebarColor') this.sidebarColor = value;
      if (key === 'facturePrefix') this.facturePrefix = value;
      if (key === 'factureIncrement') this.factureIncrement = value;
    };
    window.addEventListener('settings-changed', this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener('settings-changed', this._settingsListener);
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
        factureIncrement: Number(this.factureIncrement)
      });
      alert('Paramètres enregistrés !');
    }
  },
  template: `
    <div class="max-w-xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">Paramètres</h2>
      <form class="space-y-4" @submit.prevent="save">
        <div>
          <label class="block mb-1 font-semibold">Thème</label>
          <select v-model="theme" class="w-full border rounded px-3 py-2">
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-semibold">Couleur de la barre latérale</label>
          <input v-model="sidebarColor" type="color" class="w-16 h-8 border rounded">
        </div>
        <div>
          <label class="block mb-1 font-semibold">Devise principale</label>
          <select v-model="devise" class="w-full border rounded px-3 py-2">
            <option v-for="d in devises" :value="d.code">{{ d.label }}</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-semibold">Préfixe facture</label>
          <input v-model="facturePrefix" type="text" class="w-full border rounded px-3 py-2">
        </div>
        <div>
          <label class="block mb-1 font-semibold">Incrément facture</label>
          <input v-model="factureIncrement" type="number" class="w-full border rounded px-3 py-2">
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Enregistrer</button>
      </form>
    </div>
  `
};
// src/pages/ImportExport.vue.js
window.ImportExportPage = {
  data() {
    return {
      importFile: null,
      importExcelFile: null,
      importMessage: '',
      exportMessage: ''
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
        const workbook = XLSX.read(data, { type: 'array' });
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
      const tables = ['taxes','unites','clients','fournisseurs','categories','designations','factures','bons_commandes','settings'];
      const data = {};
      for (const t of tables) {
        data[t] = await db[t].toArray();
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export-db.json';
      a.click();
      URL.revokeObjectURL(url);
      this.exportMessage = 'Export JSON effectué !';
    },
    async importJSON(e) {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        this.importMessage = 'Fichier JSON invalide';
        return;
      }
      const tables = ['taxes','unites','clients','fournisseurs','categories','designations','factures','bons_commandes','settings'];
      for (const t of tables) await db[t].clear();
      for (const t of tables) {
        if (Array.isArray(data[t])) await db[t].bulkAdd(data[t]);
        else if (data[t]) await db[t].add(data[t]);
      }
      this.importMessage = 'Import JSON terminé !';
    }
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
  `
};
