// src/pages/Dashboard.js
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
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || "XOF";
      const factures = await facturesStore.getAll();
      const clients = await clientsStore.getAll();
      this.nbFactures = factures.length;
      this.caTotal = factures.reduce((sum, f) => sum + (f.totalTTC || 0), 0);

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

      const byMonth = {};
      for (const f of factures) {
        if (!f.date) continue;
        const m = f.date.slice(0, 7);
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
