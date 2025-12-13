// src/pages/FluxStock.js
window.FluxStockPage = {
  data() {
    return {
      flux: [],
      fournisseurs: [],
      designations: [],
      unites: [],
      search: "",
      showModal: false,
      editId: null,
      gestionStock: false,
      form: {
        numero: "",
        date: "",
        dateReelle: "",
        fournisseurId: "",
        quantite: "",
        designationId: "",
        type: "entree",
        nature: "approvisionnement",
        detailCourt: "",
      },
      error: "",
      helpers: window.helpers,
    };
  },
  async mounted() {
    // Vérifier si la gestion de stock est activée
    const settings = await window.settingsStore.get();
    this.gestionStock = settings?.gestionStock || false;

    if (!this.gestionStock) {
      // Rediriger vers Dashboard si gestion stock désactivée
      this.$parent.currentPage = "Dashboard";
      alert(
        "La gestion de stock n'est pas activée. Activez-la dans les Paramètres."
      );
      return;
    }

    this.fournisseurs = await fournisseursStore.getAll();
    this.designations = await designationsStore.getAll();
    this.unites = await unitesStore.getAll();
    this.refresh();

    // Listener pour ouvrir depuis la command palette
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-flux-modal", this._modalListener);

    // Listener settings-changed
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "gestionStock") {
        this.gestionStock = value;
        if (!value) {
          this.$parent.currentPage = "Dashboard";
          alert("La gestion de stock a été désactivée.");
        }
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-flux-modal", this._modalListener);
    }
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.flux = await fluxStockStore.getAll();
    },
    async openAdd() {
      this.editId = null;

      // Génération automatique du numéro
      const settings = await window.settingsStore.get();
      const prefix = (settings && settings.fluxStockPrefix) || "FS";
      const incrementStep = (settings && settings.fluxStockIncrement) || 1;

      const nums = this.flux
        .map((f) => f.numero)
        .filter((n) => n && n.startsWith(prefix + "-"))
        .map((n) => parseInt(n.replace(prefix + "-", "")))
        .filter((n) => !isNaN(n));

      let nextNum = incrementStep;
      if (nums.length > 0) {
        const maxNum = Math.max(...nums);
        nextNum = maxNum + incrementStep;
      }
      const numero = `${prefix}-${String(nextNum).padStart(4, "0")}`;

      // Date du jour
      const today = new Date().toISOString().slice(0, 10);

      this.form = {
        numero,
        date: today,
        dateReelle: today,
        fournisseurId: "",
        quantite: "",
        designationId: "",
        type: "entree",
        nature: "approvisionnement",
        detailCourt: "",
      };
      this.error = "";
      this.showModal = true;
    },
    async openEdit(f) {
      this.editId = f.id;
      this.form = {
        numero: f.numero,
        date: f.date,
        dateReelle: f.dateReelle,
        fournisseurId: f.fournisseurId || "",
        quantite: f.quantite,
        designationId: f.designationId,
        type: f.type,
        nature: f.nature,
        detailCourt: f.detailCourt || "",
      };
      this.error = "";
      this.showModal = true;
    },
    onNatureChange() {
      // Mettre à jour automatiquement le type selon la nature
      if (
        this.form.nature === "approvisionnement" ||
        this.form.nature === "retour_stock"
      ) {
        this.form.type = "entree";
      } else if (
        this.form.nature === "destockage" ||
        this.form.nature === "facturation"
      ) {
        this.form.type = "sortie";
      }
    },
    validateForm() {
      if (!this.form.numero || !this.form.numero.trim()) {
        this.error = "Le numéro du flux est requis";
        return false;
      }
      if (!this.form.date) {
        this.error = "La date est requise";
        return false;
      }
      if (!this.form.dateReelle) {
        this.error = "La date réelle est requise";
        return false;
      }
      if (!this.form.designationId) {
        this.error = "Veuillez sélectionner une désignation";
        return false;
      }

      // Vérifier que c'est un produit
      const designation = this.designations.find(
        (d) => d.id == this.form.designationId
      );
      if (designation && designation.type !== "produit") {
        this.error = "Seuls les produits peuvent être gérés en stock";
        return false;
      }

      if (!this.form.quantite || this.form.quantite <= 0) {
        this.error = "La quantité doit être supérieure à 0";
        return false;
      }

      // Fournisseur obligatoire sauf pour destockage et facturation
      if (
        this.form.nature !== "destockage" &&
        this.form.nature !== "facturation" &&
        !this.form.fournisseurId
      ) {
        this.error = "Le fournisseur est requis pour cette nature de flux";
        return false;
      }

      // Détail obligatoire pour retour et destockage
      if (
        (this.form.nature === "retour_stock" ||
          this.form.nature === "destockage") &&
        !this.form.detailCourt?.trim()
      ) {
        this.error =
          "Le détail est obligatoire pour un retour de stock ou un déstockage";
        return false;
      }

      return true;
    },
    async save() {
      this.error = "";

      if (!this.validateForm()) {
        return;
      }

      const data = {
        numero: this.form.numero.trim(),
        date: this.form.date,
        dateReelle: this.form.dateReelle,
        fournisseurId: this.form.fournisseurId || null,
        quantite: Number(this.form.quantite),
        designationId: this.form.designationId,
        type: this.form.type,
        nature: this.form.nature,
        detailCourt: this.form.detailCourt?.trim() || null,
      };

      try {
        if (this.editId) {
          await fluxStockStore.update(this.editId, data);
        } else {
          await fluxStockStore.add(data);
        }
        this.showModal = false;
        this.refresh();
      } catch (err) {
        this.error =
          "Erreur lors de l'enregistrement : " +
          (err.message || "erreur inconnue");
      }
    },
    async remove(id) {
      // Empêcher la suppression des flux de nature "facturation"
      const flux = this.flux.find((f) => f.id === id);
      if (flux && flux.nature === "facturation") {
        alert(
          "Impossible de supprimer un flux généré par une facture. Supprimez la facture concernée."
        );
        return;
      }

      if (
        confirm(
          "Voulez-vous vraiment supprimer ce flux ? Cette action est irréversible."
        )
      ) {
        try {
          await fluxStockStore.delete(id);
          this.refresh();
        } catch (err) {
          alert(
            "Erreur lors de la suppression : " +
              (err.message || "erreur inconnue")
          );
        }
      }
    },
    fournisseurLabel(id) {
      if (!id) return "--";
      const f = this.fournisseurs.find((f) => f.id == id);
      return f ? f.nom : "--";
    },
    designationLabel(id) {
      const d = this.designations.find((d) => d.id == id);
      return d ? d.nom : "--";
    },
    getUniteAbrev(designationId) {
      const des = this.designations.find((d) => d.id == designationId);
      if (des && des.uniteId) {
        const unite = this.unites.find((u) => u.id == des.uniteId);
        return unite ? unite.abreviation : "";
      }
      return "";
    },
    getNatureLabel(nature) {
      const labels = {
        approvisionnement: "Approvisionnement",
        retour_stock: "Retour de stock",
        destockage: "Déstockage",
        facturation: "Facturation",
      };
      return labels[nature] || nature;
    },
    getTypeLabel(type) {
      return type === "entree" ? "Entrée" : "Sortie";
    },
    getTypeBadge(type) {
      return type === "entree"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.flux
        .filter(
          (f) =>
            f.numero.toLowerCase().includes(s) ||
            this.designationLabel(f.designationId).toLowerCase().includes(s)
        )
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        });
    },
    // Filtrer uniquement les produits
    produitsOnly() {
      return this.designations.filter((d) => d.type === "produit");
    },
    // Cacher le champ fournisseur si destockage ou facturation
    showFournisseur() {
      return (
        this.form.nature !== "destockage" && this.form.nature !== "facturation"
      );
    },
    // Détail obligatoire pour retour et destockage
    detailRequired() {
      return (
        this.form.nature === "retour_stock" || this.form.nature === "destockage"
      );
    },
  },
  template: `
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Flux de Stock</h2>
        <button class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" @click="openAdd">Nouveau flux</button>
      </div>
      <div class="mb-4 flex items-center">
        <input v-model="search" type="text" class="border rounded px-3 py-2 w-full md:w-1/3" placeholder="Recherche flux...">
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Numéro</th>
              <th class="px-4 py-2 text-left">Désignation</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-left">Nature</th>
              <th class="px-4 py-2 text-left">Quantité</th>
              <th class="px-4 py-2 text-left">Fournisseur</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.id">
              <td class="px-4 py-2">{{ helpers.formatDateFrancais(f.date) }}</td>
              <td class="px-4 py-2">{{ f.numero }}</td>
              <td class="px-4 py-2">{{ designationLabel(f.designationId) }} <span class="text-xs text-gray-500">({{ getUniteAbrev(f.designationId) }})</span></td>
              <td class="px-4 py-2">
                <span :class="['px-2 py-1 rounded text-xs font-semibold', getTypeBadge(f.type)]">
                  {{ getTypeLabel(f.type) }}
                </span>
              </td>
              <td class="px-4 py-2">{{ getNatureLabel(f.nature) }}</td>
              <td class="px-4 py-2 font-semibold">{{ f.quantite }}</td>
              <td class="px-4 py-2">{{ fournisseurLabel(f.fournisseurId) }}</td>
              <td class="px-4 py-2">
                <!--
                <button v-if="f.nature !== 'facturation'" class="text-blue-600 hover:underline mr-2" @click="openEdit(f)">Modifier</button>
                <button v-if="f.nature !== 'facturation'" class="text-red-600 hover:underline" @click="remove(f.id)">Supprimer</button>
                <span v-else class="text-gray-400 text-xs">Auto-généré</span>
                -->

                <span v-if="f.nature === 'facturation'" class="text-gray-400 text-xs">
                  Auto-généré
                </span>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="text-center text-gray-400 py-4">Aucun flux de stock</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal Ajout/Modification -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-2xl relative my-8">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Nouveau' }} flux de stock</h3>
          <div v-if="error" class="text-red-600 mb-2 text-sm">{{ error }}</div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Numéro</label>
              <input v-model="form.numero" type="text" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white bg-gray-100" placeholder="Numéro" readonly>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Date</label>
              <input v-model="form.date" type="date" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Date réelle</label>
              <input v-model="form.dateReelle" type="date" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Nature <span class="text-red-500">*</span></label>
              <select v-model="form.nature" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white" @change="onNatureChange">
                <option value="approvisionnement">Approvisionnement</option>
                <option value="retour_stock">Retour de stock</option>
                <option value="destockage">Déstockage</option>
              </select>
            </div>
          </div>

          <div v-if="showFournisseur" class="mb-3">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Fournisseur <span class="text-red-500">*</span></label>
            <select v-model="form.fournisseurId" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
              <option value="">Sélectionner un fournisseur</option>
              <option v-for="f in fournisseurs" :value="f.id">{{ f.nom }}</option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Produit <span class="text-red-500">*</span></label>
              <select v-model="form.designationId" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
                <option value="">Sélectionner un produit</option>
                <option v-for="d in produitsOnly" :value="d.id">{{ d.nom }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Quantité <span class="text-red-500">*</span></label>
              <input v-model.number="form.quantite" type="number" min="1" step="1" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white" placeholder="Quantité">
            </div>
          </div>

          <div class="mb-3">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">
              Type (auto-déterminé par la nature)
            </label>
            <input v-model="form.type" type="text" class="border rounded px-3 py-2 w-full bg-gray-100 dark:bg-gray-700 dark:text-white" readonly>
          </div>

          <div class="mb-4">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">
              Détail court {{ detailRequired ? '(Obligatoire)' : '(Facultatif)' }}
            </label>
            <textarea v-model="form.detailCourt" rows="2" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white" placeholder="Description du flux..."></textarea>
          </div>

          <div class="flex justify-end gap-2">
            <button class="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300" @click="showModal=false">Annuler</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold" @click="save">
              {{ editId ? 'Mettre à jour' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
