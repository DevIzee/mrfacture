// src/components/App.vue.js
window.App = {
  template: `
    <div class="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <!-- Sidebar -->
      <aside class="w-64 bg-white dark:bg-gray-800 shadow flex flex-col">
        <div class="h-16 flex items-center justify-center font-bold text-xl border-b dark:border-gray-700">Mr Facture</div>
        <nav class="flex-1 p-4 space-y-2">
          <a v-for="item in menu" :key="item.page" href="#" @click.prevent="currentPage = item.page" :class="['block py-2 px-4 rounded', currentPage === item.page ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700']">{{ item.label }}</a>
        </nav>
      </aside>
      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <header class="h-16 bg-white dark:bg-gray-800 shadow flex items-center px-6 justify-between">
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white">Bienvenue sur Mr Facture</h1>
          <div class="flex items-center gap-2">
            <button v-if="currentPage === 'Factures'" class="px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700" @click="openNewFacture">Nouvelle facture</button>
            <button class="ml-4 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white" @click="toggleTheme">{{ theme === 'dark' ? 'Clair' : 'Sombre' }}</button>
          </div>
        </header>
        <!-- Main zone -->
        <main class="flex-1 p-6">
          <component :is="currentComponent"></component>
        </main>
      </div>
    </div>
  `,
  data() {
    return {
      theme: localStorage.getItem("theme") || "light",
      sidebarColor: localStorage.getItem("sidebarColor") || "#f1f5f9",
      currentPage: "Dashboard",
      menu: [
        { page: "Dashboard", label: "Dashboard" },
        { page: "Clients", label: "Clients" },
        { page: "Fournisseurs", label: "Fournisseurs" },
        { page: "Taxes", label: "Taxes" },
        { page: "Unites", label: "Unités" },
        { page: "Categories", label: "Catégories" },
        { page: "Designations", label: "Designations" },
        { page: "Factures", label: "Factures" },
        { page: "BonsCommandes", label: "Bons de commande" },
        { page: "Parametres", label: "Paramètres" },
        { page: "ImportExport", label: "Import/Export" },
      ],
      toast: null,
      loading: false,
    };
  },
  methods: {
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";

      // Définir une couleur de sidebar cohérente selon le thème
      if (this.theme === "dark") {
        // Mode sombre : sidebar gris très foncé
        this.sidebarColor = "#1f2937";
      } else {
        // Mode clair : sidebar gris ardoise
        this.sidebarColor = "#f1f5f9";
      }

      // Sauvegarder les changements
      localStorage.setItem("theme", this.theme);
      localStorage.setItem("sidebarColor", this.sidebarColor);

      // Appliquer immédiatement
      this.applyTheme();
      this.applySidebarColor();

      // Mettre à jour dans les settings
      if (window.settingsStore) {
        window.settingsStore.setAll({
          theme: this.theme,
          sidebarColor: this.sidebarColor,
        });
      }
    },
    applyTheme() {
      if (this.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
    openNewFacture() {
      // Passe à la page Factures, puis attend que le composant soit monté avant d'ouvrir le modal
      if (this.currentPage !== "Factures") {
        this.currentPage = "Factures";
        // Attend le prochain tick du DOM pour garantir que FacturesPage est prêt
        setTimeout(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent("open-facture-modal"));
          }
        }, 100);
      } else {
        if (window.FacturesPage && window.FacturesPage.openAdd) {
          window.FacturesPage.openAdd();
        } else if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent("open-facture-modal"));
        }
      }
    },
    showToast(msg, type = "success") {
      this.toast = { msg, type };
      setTimeout(() => {
        this.toast = null;
      }, 2500);
    },
    setLoading(val) {
      this.loading = val;
    },
    async syncSettings() {
      let settings = null;
      if (window.db && window.db.settings) {
        settings = await window.db.settings.toCollection().first();
      }
      this.theme =
        (settings && settings.theme) ||
        localStorage.getItem("theme") ||
        "light";
      this.sidebarColor =
        (settings && settings.sidebarColor) ||
        localStorage.getItem("sidebarColor") ||
        "#f1f5f9";
      this.applyTheme();
      this.applySidebarColor();
    },
    applySidebarColor() {
      const sidebar = document.querySelector("aside");
      if (sidebar) sidebar.style.backgroundColor = this.sidebarColor;
    },
  },
  async mounted() {
    await this.syncSettings();
    // Synchronisation dynamique sur settings-changed
    this._settingsListener = async (e) => {
      const { key, value } = e.detail || {};
      if (key === "theme") {
        this.theme = value;
      } else if (key === "sidebarColor") {
        this.sidebarColor = value;
      }
      // Ajout d'autres paramètres si besoin
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  watch: {
    theme() {
      this.applyTheme();
    },
    sidebarColor() {
      this.applySidebarColor();
    },
  },
  computed: {
    currentComponent() {
      const map = {
        Dashboard: window.DashboardPage,
        Clients: window.ClientsPage,
        Fournisseurs: window.FournisseursPage,
        Taxes: window.TaxesPage,
        Unites: window.UnitesPage,
        Categories: window.CategoriesPage,
        Designations: window.DesignationsPage,
        Factures: window.FacturesPage,
        BonsCommandes: window.BonsCommandesPage,
        Parametres: window.ParametresPage,
        ImportExport: window.ImportExportPage,
      };
      return map[this.currentPage] || { template: "<div>Page inconnue</div>" };
    },
  },
  template: `
    <div class="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <!-- Toast -->
      <div v-if="toast" class="fixed top-4 right-4 z-50">
        <div :class="['px-4 py-2 rounded shadow text-white', toast.type === 'success' ? 'bg-green-600' : 'bg-red-600']">{{ toast.msg }}</div>
      </div>
      <!-- Loader -->
      <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
        <div class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
      </div>
      <!-- Sidebar -->
      <aside class="w-64 bg-white dark:bg-gray-800 shadow flex flex-col">
        <div class="h-16 flex items-center justify-center font-bold text-xl border-b dark:border-gray-700">Mr Facture</div>
        <nav class="flex-1 p-4 space-y-2">
          <a v-for="item in menu" :key="item.page" href="#" @click.prevent="currentPage = item.page" :class="['block py-2 px-4 rounded', currentPage === item.page ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700']">{{ item.label }}</a>
        </nav>
      </aside>
      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <header class="h-16 bg-white dark:bg-gray-800 shadow flex items-center px-6 justify-between">
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white">Bienvenue sur Mr Facture</h1>
          <div class="flex items-center gap-2">
            <button v-if="currentPage === 'Factures'" class="px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700" @click="openNewFacture">Nouvelle facture</button>
            <button class="ml-4 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white" @click="toggleTheme">{{ theme === 'dark' ? 'Clair' : 'Sombre' }}</button>
          </div>
        </header>
        <!-- Main zone -->
        <main class="flex-1 p-6">
          <component :is="currentComponent" @toast="showToast" @loading="setLoading"></component>
        </main>
      </div>
    </div>
  `,
};
