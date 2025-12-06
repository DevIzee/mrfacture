// src/pages/Dashboard.js
window.DashboardPage = {
  data() {
    return {
      nbFactures: 0,
      nbClients: 0,
      nbFournisseurs: 0,
      nbProduits: 0,
      caTotal: 0,
      caProforma: 0,
      caNormale: 0,
      topClients: [],
      volumeMensuel: [],
      factures: [],
      clients: [],
      designations: [],
      categories: [],
      devise: "EUR",
      chartInstances: [], // Pour stocker les instances Chart.js
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    },
    // Stats par type de facture
    statsParType() {
      const normale = this.factures.filter(
        (f) => f.type === "normale" || !f.type
      );
      const proforma = this.factures.filter((f) => f.type === "proforma");
      return {
        normale: {
          count: normale.length,
          ca: normale.reduce((sum, f) => sum + (f.totalTTC || 0), 0),
        },
        proforma: {
          count: proforma.length,
          ca: proforma.reduce((sum, f) => sum + (f.totalTTC || 0), 0),
        },
      };
    },
    // CA moyen par facture
    moyenneParFacture() {
      return this.nbFactures > 0 ? this.caTotal / this.nbFactures : 0;
    },
    // Produits les plus vendus
    topProduits() {
      const produitStats = {};
      this.factures.forEach((f) => {
        if (f.lignes) {
          f.lignes.forEach((l) => {
            const des = this.designations.find((d) => d.id == l.designationId);
            if (des) {
              if (!produitStats[des.id]) {
                produitStats[des.id] = {
                  nom: des.nom,
                  quantite: 0,
                  ca: 0,
                };
              }
              produitStats[des.id].quantite += l.quantite || 0;
              produitStats[des.id].ca += l.total || 0;
            }
          });
        }
      });
      return Object.values(produitStats)
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 5);
    },
    // CA par catégorie
    caParCategorie() {
      const catStats = {};
      this.factures.forEach((f) => {
        if (f.lignes) {
          f.lignes.forEach((l) => {
            const des = this.designations.find((d) => d.id == l.designationId);
            if (des && des.categorieId) {
              const cat = this.categories.find((c) => c.id == des.categorieId);
              const catNom = cat ? cat.nom : "Non catégorisé";
              if (!catStats[catNom]) {
                catStats[catNom] = 0;
              }
              catStats[catNom] += l.total || 0;
            }
          });
        }
      });
      return Object.entries(catStats)
        .map(([nom, ca]) => ({ nom, ca }))
        .sort((a, b) => b.ca - a.ca);
    },
  },
  async mounted() {
    await this.refreshData();
    this.$nextTick(() => {
      this.createCharts();
    });

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
    // Détruire tous les graphiques
    this.chartInstances.forEach((chart) => {
      if (chart) chart.destroy();
    });
    this.chartInstances = [];

    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refreshData() {
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || "XOF";

      this.factures = await facturesStore.getAll();
      this.clients = await clientsStore.getAll();
      this.designations = await designationsStore.getAll();
      this.categories = await categoriesStore.getAll();
      const fournisseurs = await fournisseursStore.getAll();

      this.nbFactures = this.factures.length;
      this.nbClients = this.clients.length;
      this.nbFournisseurs = fournisseurs.length;
      this.nbProduits = this.designations.filter(
        (d) => d.type === "produit"
      ).length;

      this.caTotal = this.factures.reduce(
        (sum, f) => sum + (f.totalTTC || 0),
        0
      );
      this.caNormale = this.factures
        .filter((f) => f.type === "normale" || !f.type)
        .reduce((sum, f) => sum + (f.totalTTC || 0), 0);
      this.caProforma = this.factures
        .filter((f) => f.type === "proforma")
        .reduce((sum, f) => sum + (f.totalTTC || 0), 0);

      // Top clients
      const caByClient = {};
      for (const f of this.factures) {
        if (!caByClient[f.clientId]) caByClient[f.clientId] = 0;
        caByClient[f.clientId] += f.totalTTC || 0;
      }
      this.topClients = Object.entries(caByClient)
        .map(([id, ca]) => ({
          nom: (this.clients.find((c) => c.id == id) || {}).nom || "Inconnu",
          ca,
        }))
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 5);

      // Volume mensuel
      const byMonth = {};
      for (const f of this.factures) {
        if (!f.date) continue;
        const m = f.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = 0;
        byMonth[m] += f.totalTTC || 0;
      }
      this.volumeMensuel = Object.entries(byMonth)
        .map(([mois, ca]) => ({ mois, ca }))
        .sort((a, b) => a.mois.localeCompare(b.mois));
    },
    createCharts() {
      // Détruire les anciens graphiques
      this.chartInstances.forEach((chart) => {
        if (chart) chart.destroy();
      });
      this.chartInstances = [];

      // 1. Graphique Volume Mensuel (Ligne + Barre)
      const ctxMensuel = document.getElementById("chartVolumeMensuel");
      if (ctxMensuel && this.volumeMensuel.length > 0) {
        const chartMensuel = new Chart(ctxMensuel, {
          type: "bar",
          data: {
            labels: this.volumeMensuel.map((v) => v.mois),
            datasets: [
              {
                label: "CA Mensuel",
                data: this.volumeMensuel.map((v) => v.ca),
                backgroundColor: "rgba(37, 99, 235, 0.7)",
                borderColor: "rgba(37, 99, 235, 1)",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
              title: {
                display: true,
                text: "Chiffre d'affaires mensuel",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return this.helpers.formatMontant(
                      context.parsed.y,
                      this.devise
                    );
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) =>
                    this.helpers.formatMontant(value, this.devise),
                },
              },
            },
          },
        });
        this.chartInstances.push(chartMensuel);
      }

      // 2. Graphique Top Clients (Doughnut)
      const ctxClients = document.getElementById("chartTopClients");
      if (ctxClients && this.topClients.length > 0) {
        const chartClients = new Chart(ctxClients, {
          type: "doughnut",
          data: {
            labels: this.topClients.map((c) => c.nom),
            datasets: [
              {
                label: "CA par client",
                data: this.topClients.map((c) => c.ca),
                backgroundColor: [
                  "rgba(37, 99, 235, 0.8)",
                  "rgba(16, 185, 129, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(239, 68, 68, 0.8)",
                  "rgba(139, 92, 246, 0.8)",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
              },
              title: {
                display: true,
                text: "Top 5 Clients",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || "";
                    const value = this.helpers.formatMontant(
                      context.parsed,
                      this.devise
                    );
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = ((context.parsed / total) * 100).toFixed(
                      1
                    );
                    return `${label}: ${value} (${percentage}%)`;
                  },
                },
              },
            },
          },
        });
        this.chartInstances.push(chartClients);
      }

      // 3. Graphique Types de Factures (Pie)
      const ctxTypes = document.getElementById("chartTypesFactures");
      if (ctxTypes && this.factures.length > 0) {
        const stats = this.statsParType;
        const chartTypes = new Chart(ctxTypes, {
          type: "pie",
          data: {
            labels: ["Factures Normales", "Factures Proforma"],
            datasets: [
              {
                data: [stats.normale.ca, stats.proforma.ca],
                backgroundColor: [
                  "rgba(37, 99, 235, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
              },
              title: {
                display: true,
                text: "CA par Type de Facture",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || "";
                    const value = this.helpers.formatMontant(
                      context.parsed,
                      this.devise
                    );
                    const count =
                      context.dataIndex === 0
                        ? stats.normale.count
                        : stats.proforma.count;
                    return `${label}: ${value} (${count} factures)`;
                  },
                },
              },
            },
          },
        });
        this.chartInstances.push(chartTypes);
      }

      // 4. Graphique Top Produits (Bar horizontale)
      const ctxProduits = document.getElementById("chartTopProduits");
      if (ctxProduits && this.topProduits.length > 0) {
        const chartProduits = new Chart(ctxProduits, {
          type: "bar",
          data: {
            labels: this.topProduits.map((p) => p.nom),
            datasets: [
              {
                label: "CA par produit",
                data: this.topProduits.map((p) => p.ca),
                backgroundColor: "rgba(16, 185, 129, 0.7)",
                borderColor: "rgba(16, 185, 129, 1)",
                borderWidth: 2,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Top 5 Produits/Services",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const produit = this.topProduits[context.dataIndex];
                    return [
                      `CA: ${this.helpers.formatMontant(
                        context.parsed.x,
                        this.devise
                      )}`,
                      `Quantité: ${produit.quantite}`,
                    ];
                  },
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  callback: (value) =>
                    this.helpers.formatMontant(value, this.devise),
                },
              },
            },
          },
        });
        this.chartInstances.push(chartProduits);
      }

      // 5. Graphique CA par Catégorie (Polararea)
      const ctxCategories = document.getElementById("chartCategories");
      if (ctxCategories && this.caParCategorie.length > 0) {
        const chartCategories = new Chart(ctxCategories, {
          type: "polarArea",
          data: {
            labels: this.caParCategorie.map((c) => c.nom),
            datasets: [
              {
                label: "CA par catégorie",
                data: this.caParCategorie.map((c) => c.ca),
                backgroundColor: [
                  "rgba(37, 99, 235, 0.6)",
                  "rgba(16, 185, 129, 0.6)",
                  "rgba(245, 158, 11, 0.6)",
                  "rgba(239, 68, 68, 0.6)",
                  "rgba(139, 92, 246, 0.6)",
                  "rgba(236, 72, 153, 0.6)",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
              },
              title: {
                display: true,
                text: "CA par Catégorie de Produits",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || "";
                    const value = this.helpers.formatMontant(
                      context.parsed.r,
                      this.devise
                    );
                    return `${label}: ${value}`;
                  },
                },
              },
            },
          },
        });
        this.chartInstances.push(chartCategories);
      }

      // 6. Graphique Évolution du CA (Ligne)
      const ctxEvolution = document.getElementById("chartEvolution");
      if (ctxEvolution && this.volumeMensuel.length > 0) {
        const chartEvolution = new Chart(ctxEvolution, {
          type: "line",
          data: {
            labels: this.volumeMensuel.map((v) => v.mois),
            datasets: [
              {
                label: "Évolution du CA",
                data: this.volumeMensuel.map((v) => v.ca),
                borderColor: "rgba(139, 92, 246, 1)",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
              title: {
                display: true,
                text: "Évolution du Chiffre d'affaires",
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return this.helpers.formatMontant(
                      context.parsed.y,
                      this.devise
                    );
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) =>
                    this.helpers.formatMontant(value, this.devise),
                },
              },
            },
          },
        });
        this.chartInstances.push(chartEvolution);
      }
    },
  },
  watch: {
    devise() {
      this.$nextTick(() => {
        this.createCharts();
      });
    },
  },
  template: `
    <div>
      <!-- KPIs -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-4 dark:text-white">Dashboard</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Factures -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center border-l-4 border-blue-500">
            <div class="text-4xl mb-2">📄</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 font-semibold">Factures</div>
            <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ nbFactures }}</div>
            <div class="text-xs text-gray-500 mt-1">
              <span class="text-blue-600">{{ statsParType.normale.count }}</span> normales / 
              <span class="text-orange-600">{{ statsParType.proforma.count }}</span> proforma
            </div>
          </div>
          
          <!-- CA Total -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center border-l-4 border-green-500">
            <div class="text-4xl mb-2">💰</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 font-semibold">CA Total</div>
            <div class="text-3xl font-bold text-green-600 dark:text-green-400">{{ helpers.formatMontant(caTotal, devise) }}</div>
            <div class="text-xs text-gray-500 mt-1">
              Moy: {{ helpers.formatMontant(moyenneParFacture, devise) }}
            </div>
          </div>
          
          <!-- Clients -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center border-l-4 border-purple-500">
            <div class="text-4xl mb-2">👥</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 font-semibold">Clients</div>
            <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{ nbClients }}</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ nbFournisseurs }} fournisseurs
            </div>
          </div>
          
          <!-- Produits -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center border-l-4 border-orange-500">
            <div class="text-4xl mb-2">📦</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 font-semibold">Produits</div>
            <div class="text-3xl font-bold text-orange-600 dark:text-orange-400">{{ nbProduits }}</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ designations.length - nbProduits }} services
            </div>
          </div>
        </div>
      </div>

      <!-- Graphiques -->
      <div v-if="factures.length > 0" class="space-y-6">
        <!-- Row 1: Volume mensuel + Types de factures -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartVolumeMensuel" height="300"></canvas>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartTypesFactures" height="300"></canvas>
          </div>
        </div>

        <!-- Row 2: Top Clients + Top Produits -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartTopClients" height="300"></canvas>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartTopProduits" height="300"></canvas>
          </div>
        </div>

        <!-- Row 3: Évolution + Catégories -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartEvolution" height="300"></canvas>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <canvas id="chartCategories" height="300"></canvas>
          </div>
        </div>
      </div>

      <!-- Message si pas de données -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-semibold mb-2 dark:text-white">Aucune donnée disponible</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Créez votre première facture pour voir apparaître les statistiques et graphiques
        </p>
        <button 
          class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          @click="$parent.currentPage = 'Factures'">
          Créer une facture
        </button>
      </div>
    </div>
  `,
};
