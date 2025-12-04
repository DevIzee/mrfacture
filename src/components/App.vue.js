// src/components/App.vue.js
window.App = {
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
      
      <!-- Command Palette -->
      <div v-if="showCommandPalette" class="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20" @click.self="showCommandPalette = false">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4">
          <div class="p-4 border-b dark:border-gray-700">
            <input 
              ref="commandInput"
              v-model="commandSearch" 
              type="text" 
              class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white" 
              placeholder="Rechercher une action, page, client, facture..."
              @keydown.down.prevent="navigateDown"
              @keydown.up.prevent="navigateUp"
              @keydown.enter.prevent="executeCommand"
              @keydown.esc="showCommandPalette = false"
            >
          </div>
          <div class="max-h-96 overflow-y-auto">
            <div v-if="filteredCommands.length === 0" class="p-8 text-center text-gray-400">
              Aucun résultat trouvé
            </div>
            <div v-for="(cmd, idx) in filteredCommands" :key="idx" 
                 :class="['px-4 py-3 cursor-pointer border-b dark:border-gray-700 flex items-center justify-between', idx === selectedCommandIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700']"
                 @click="executeCommand(cmd)">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ cmd.icon }}</span>
                <div>
                  <div class="font-semibold dark:text-white">{{ cmd.label }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ cmd.description }}</div>
                </div>
              </div>
              <kbd class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">{{ cmd.shortcut }}</kbd>
            </div>
          </div>
        </div>
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
            <!-- Command Palette Button -->
            <button 
              class="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
              @click="toggleCommandPalette"
              title="Recherche rapide (Ctrl+K)">
              <span>🔍</span>
              <kbd class="hidden md:inline px-2 py-0.5 text-xs bg-white dark:bg-gray-600 rounded border">Ctrl+K</kbd>
            </button>
            
            <!-- Bouton Donation -->
            <a 
              href="https://www.paypal.com/donate" 
              target="_blank"
              class="px-4 py-2 rounded bg-pink-600 text-white shadow hover:bg-pink-700 flex items-center gap-2"
              title="Soutenir le projet">
              <span>❤️</span>
              <span class="hidden md:inline">Faire un don</span>
            </a>
            
            <button 
              class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600" 
              @click="toggleTheme"
              :title="theme === 'dark' ? 'Mode clair' : 'Mode sombre'">
              <span class="">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            </button>
          </div>
        </header>
        <!-- Main zone -->
        <main class="flex-1 p-6">
          <component :is="currentComponent" @toast="showToast" @loading="setLoading"></component>
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
      showCommandPalette: false,
      commandSearch: "",
      selectedCommandIndex: 0,
      commands: [],
    };
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
    filteredCommands() {
      if (!this.commandSearch.trim()) return this.commands;
      const search = this.commandSearch.toLowerCase();
      return this.commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(search) ||
          cmd.description.toLowerCase().includes(search) ||
          (cmd.keywords &&
            cmd.keywords.some((k) => k.toLowerCase().includes(search)))
      );
    },
  },
  methods: {
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";

      if (this.theme === "dark") {
        this.sidebarColor = "#1f2937";
      } else {
        this.sidebarColor = "#f1f5f9";
      }

      localStorage.setItem("theme", this.theme);
      localStorage.setItem("sidebarColor", this.sidebarColor);

      this.applyTheme();
      this.applySidebarColor();

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
    toggleCommandPalette() {
      this.showCommandPalette = !this.showCommandPalette;
      if (this.showCommandPalette) {
        this.commandSearch = "";
        this.selectedCommandIndex = 0;
        this.$nextTick(() => {
          this.$refs.commandInput?.focus();
        });
      }
    },
    navigateDown() {
      if (this.selectedCommandIndex < this.filteredCommands.length - 1) {
        this.selectedCommandIndex++;
      }
    },
    navigateUp() {
      if (this.selectedCommandIndex > 0) {
        this.selectedCommandIndex--;
      }
    },
    executeCommand(cmd) {
      const command = cmd || this.filteredCommands[this.selectedCommandIndex];
      if (command && command.action) {
        command.action();
        this.showCommandPalette = false;
      }
    },
    async buildCommands() {
      this.commands = [
        // Navigation - Pages principales
        ...this.menu.map((item) => ({
          icon: this.getPageIcon(item.page),
          label: `Aller à ${item.label}`,
          description: `Naviguer vers la page ${item.label}`,
          shortcut: "",
          keywords: [item.page, item.label, "navigation", "page"],
          action: () => (this.currentPage = item.page),
        })),

        // Actions rapides - Créations
        {
          icon: "📄",
          label: "Nouvelle facture",
          description: "Créer une nouvelle facture",
          shortcut: "N",
          keywords: ["facture", "nouvelle", "créer", "ajouter", "new"],
          action: () => {
            this.currentPage = "Factures";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-facture-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "👤",
          label: "Nouveau client",
          description: "Ajouter un nouveau client",
          shortcut: "",
          keywords: ["client", "nouveau", "créer", "ajouter"],
          action: () => {
            this.currentPage = "Clients";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-client-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "🏢",
          label: "Nouveau fournisseur",
          description: "Ajouter un nouveau fournisseur",
          shortcut: "",
          keywords: ["fournisseur", "nouveau", "créer", "ajouter"],
          action: () => {
            this.currentPage = "Fournisseurs";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-fournisseur-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "💰",
          label: "Nouvelle taxe",
          description: "Ajouter une nouvelle taxe",
          shortcut: "",
          keywords: ["taxe", "nouvelle", "créer", "ajouter", "tva"],
          action: () => {
            this.currentPage = "Taxes";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-taxe-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "📏",
          label: "Nouvelle unité",
          description: "Ajouter une nouvelle unité de mesure",
          shortcut: "",
          keywords: ["unité", "nouvelle", "créer", "ajouter", "mesure"],
          action: () => {
            this.currentPage = "Unites";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-unite-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "🏷️",
          label: "Nouvelle catégorie",
          description: "Ajouter une nouvelle catégorie",
          shortcut: "",
          keywords: ["catégorie", "nouvelle", "créer", "ajouter"],
          action: () => {
            this.currentPage = "Categories";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-categorie-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "📝",
          label: "Nouvelle désignation",
          description: "Ajouter une nouvelle désignation",
          shortcut: "",
          keywords: [
            "désignation",
            "nouvelle",
            "créer",
            "ajouter",
            "produit",
            "service",
          ],
          action: () => {
            this.currentPage = "Designations";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-designation-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
        {
          icon: "📦",
          label: "Nouveau bon de commande",
          description: "Créer un nouveau bon de commande",
          shortcut: "",
          keywords: ["bon", "commande", "nouveau", "créer", "ajouter"],
          action: () => {
            this.currentPage = "BonsCommandes";
            this.$nextTick(() => {
              setTimeout(() => {
                const event = new CustomEvent("open-bon-modal");
                window.dispatchEvent(event);
              }, 150);
            });
          },
        },
      ];
    },
    getPageIcon(page) {
      const icons = {
        Dashboard: "📊",
        Clients: "👥",
        Fournisseurs: "🏢",
        Taxes: "💰",
        Unites: "📏",
        Categories: "🏷️",
        Designations: "📝",
        Factures: "📄",
        BonsCommandes: "📦",
        Parametres: "⚙️",
        ImportExport: "💾",
      };
      return icons[page] || "📄";
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
    handleKeyboardShortcuts(e) {
      // Ctrl+K ou Cmd+K pour ouvrir la command palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        this.toggleCommandPalette();
      }
    },
  },
  async mounted() {
    await this.syncSettings();
    await this.buildCommands();

    // Écouter les raccourcis clavier
    window.addEventListener("keydown", this.handleKeyboardShortcuts);

    this._settingsListener = async (e) => {
      const { key, value } = e.detail || {};
      if (key === "theme") {
        this.theme = value;
      } else if (key === "sidebarColor") {
        this.sidebarColor = value;
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleKeyboardShortcuts);
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
    async showCommandPalette(val) {
      if (val) {
        await this.buildCommands();
      }
    },
  },
};
