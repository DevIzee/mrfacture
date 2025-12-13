// src/pages/BonsCommandes.js
window.BonsCommandesPage = {
  data() {
    return {
      bons: [],
      fournisseurs: [],
      designations: [],
      taxes: [],
      unites: [],
      search: "",
      showModal: false,
      editId: null,
      form: {
        numero: "",
        fournisseurId: "",
        date: "",
        montantPort: "",
        lignes: [],
        tva: "",
        abic: "",
        modeTransport: "",
        lieuLivraison: "",
        conditionPaiement: "",
        totalHT: 0,
        totalTVA: 0,
        totalABIC: 0,
        totalTTC: 0,
      },
      error: "",
      devise: "XOF",
      helpers: window.helpers,
    };
  },
  async mounted() {
    this.fournisseurs = await fournisseursStore.getAll();
    this.designations = await designationsStore.getAll();
    this.taxes = await taxesStore.getAll();
    this.unites = await unitesStore.getAll();

    const settings = await window.settingsStore.get();
    this.devise = (settings && settings.devisePrincipale) || "XOF";

    this.refresh();

    // Listener pour ouvrir depuis la command palette
    this._modalListener = () => this.openAdd();
    window.addEventListener("open-bon-modal", this._modalListener);

    // Listener settings-changed
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") {
        this.devise = value;
      }
    };
    window.addEventListener("settings-changed", this._settingsListener);
  },
  beforeUnmount() {
    if (this._modalListener) {
      window.removeEventListener("open-bon-modal", this._modalListener);
    }
    if (this._settingsListener) {
      window.removeEventListener("settings-changed", this._settingsListener);
    }
  },
  methods: {
    async refresh() {
      this.bons = await bonsCommandesStore.getAll();
    },
    async openAdd() {
      this.editId = null;

      // Génération automatique du numéro
      const settings = await window.settingsStore.get();
      const prefix = (settings && settings.bonCommandePrefix) || "BC";
      const incrementStep = (settings && settings.bonCommandeIncrement) || 1;

      const nums = this.bons
        .map((b) => b.numero)
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
        fournisseurId: "",
        date: today,
        montantPort: "",
        lignes: [],
        tva: "",
        abic: "",
        modeTransport: "",
        lieuLivraison: "",
        conditionPaiement: "",
        totalHT: 0,
        totalTVA: 0,
        totalABIC: 0,
        totalTTC: 0,
      };
      this.error = "";
      this.showModal = true;
    },
    async openEdit(b) {
      this.editId = b.id;
      this.form = {
        numero: b.numero,
        fournisseurId: b.fournisseurId,
        date: b.date,
        montantPort: b.montantPort || "",
        lignes: b.lignes ? JSON.parse(JSON.stringify(b.lignes)) : [],
        tva: b.tva || "",
        abic: b.abic || "",
        modeTransport: b.modeTransport || "",
        lieuLivraison: b.lieuLivraison || "",
        conditionPaiement: b.conditionPaiement || "",
        totalHT: b.totalHT || 0,
        totalTVA: b.totalTVA || 0,
        totalABIC: b.totalABIC || 0,
        totalTTC: b.totalTTC || 0,
      };
      this.error = "";
      this.showModal = true;
    },
    addLigne() {
      this.form.lignes.push({
        designationId: "",
        quantite: 1,
        prix: 0,
        total: 0,
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
        this.form.lignes[idx].total =
          this.form.lignes[idx].quantite * this.form.lignes[idx].prix;
        this.calcTotals();
      }
    },
    calcTotals() {
      // 1. TOTAL HT des lignes (SANS le port)
      let ht = 0;
      for (const l of this.form.lignes) {
        ht += l.total || 0; // Somme de toutes les lignes (quantité × prix unitaire)
      }

      this.form.totalHT = ht;

      // 2. CALCUL de la TVA (sur le HT SANS le port)
      let tva = 0;
      if (this.form.tva) {
        const tauxTVA = parseFloat(this.form.tva) || 0;
        tva = (ht * tauxTVA) / 100;
      }
      this.form.totalTVA = tva;

      // 3. CALCUL de l'ABIC (sur le HT SANS le port)
      let abic = 0;
      if (this.form.abic) {
        const tauxABIC = parseFloat(this.form.abic) || 0;
        abic = (ht * tauxABIC) / 100;
      }
      this.form.totalABIC = abic;

      // 4. AJOUTER le montant du port à la fin
      const montantPort = parseFloat(this.form.montantPort) || 0;

      // 5. TOTAL TTC = HT + TVA + ABIC + Port
      this.form.totalTTC = ht + tva + abic + montantPort;
    },
    validateForm() {
      if (!this.form.numero || !this.form.numero.trim()) {
        this.error = "Le numéro du bon de commande est requis";
        return false;
      }
      if (!this.form.fournisseurId) {
        this.error = "Veuillez sélectionner un fournisseur";
        return false;
      }
      if (!this.form.date) {
        this.error = "La date est requise";
        return false;
      }
      if (this.form.lignes.length === 0) {
        this.error = "Veuillez ajouter au moins une ligne";
        return false;
      }

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

      return true;
    },
    async save() {
      this.error = "";

      if (!this.validateForm()) {
        return;
      }

      this.calcTotals();

      const data = {
        numero: this.form.numero.trim(),
        fournisseurId: this.form.fournisseurId,
        date: this.form.date,
        montantPort: this.form.montantPort
          ? parseFloat(this.form.montantPort)
          : null,
        lignes: JSON.parse(JSON.stringify(this.form.lignes)),
        tva: this.form.tva || null,
        abic: this.form.abic || null,
        modeTransport: this.form.modeTransport || null,
        lieuLivraison: this.form.lieuLivraison || null,
        conditionPaiement: this.form.conditionPaiement || null,
        totalHT: this.form.totalHT,
        totalTVA: this.form.totalTVA,
        totalABIC: this.form.totalABIC,
        totalTTC: this.form.totalTTC,
      };

      try {
        if (this.editId) {
          await bonsCommandesStore.update(this.editId, data);
        } else {
          await bonsCommandesStore.add(data);
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
      if (
        confirm(
          "Voulez-vous vraiment supprimer ce bon de commande ? Cette action est irréversible."
        )
      ) {
        try {
          await bonsCommandesStore.delete(id);
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
      const f = this.fournisseurs.find((f) => f.id == id);
      return f ? f.nom : "--";
    },
    designationLabel(id) {
      const d = this.designations.find((d) => d.id == id);
      return d ? d.nom : "--";
    },
    async openPreviewFromList(b) {
      // Stocker le bon de commande
      localStorage.setItem("bon_commande_preview", JSON.stringify(b));

      // Stocker les settings et les données nécessaires
      const settings = await window.settingsStore.get();
      localStorage.setItem("app_settings", JSON.stringify(settings));
      localStorage.setItem(
        "app_fournisseurs",
        JSON.stringify(this.fournisseurs)
      );
      localStorage.setItem(
        "app_designations",
        JSON.stringify(this.designations)
      );
      localStorage.setItem("app_unites", JSON.stringify(this.unites));
      localStorage.setItem("app_taxes", JSON.stringify(this.taxes));

      // Ouvrir dans un nouvel onglet
      window.open("preview-bon-commande.html", "_blank");
    },
  },
  computed: {
    filtered() {
      const s = this.search.toLowerCase();
      return this.bons
        .filter((b) => b.numero.toLowerCase().includes(s))
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        });
    },
    tvaList() {
      return this.taxes.filter((t) => t.type === "TVA");
    },
    abicList() {
      return this.taxes.filter((t) => t.type === "ABIC");
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
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Numéro</th>
              <th class="px-4 py-2 text-left">Fournisseur</th>
              <th class="px-4 py-2 text-left">Total TTC</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filtered" :key="b.id">
              <td class="px-4 py-2">{{ helpers.formatDateFrancais(b.date) }}</td>
              <td class="px-4 py-2">{{ b.numero }}</td>
              <td class="px-4 py-2">{{ fournisseurLabel(b.fournisseurId) }}</td>
              <td class="px-4 py-2">{{ helpers.formatMontant(b.totalTTC, devise) }}</td>
              <td class="px-4 py-2">
                <button class="text-blue-600 hover:underline mr-2" @click="openEdit(b)">Modifier</button>
                <button class="text-purple-600 hover:underline mr-2" @click="openPreviewFromList(b)">👁 Voir</button>
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
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto">
        <div class="bg-white dark:bg-gray-800 rounded shadow p-6 w-full max-w-3xl relative my-8">
          <h3 class="text-lg font-bold mb-4">{{ editId ? 'Modifier' : 'Nouveau' }} bon de commande</h3>
          <div v-if="error" class="text-red-600 mb-2 text-sm">{{ error }}</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Numéro</label>
              <input v-model="form.numero" type="text" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white" placeholder="Numéro">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Fournisseur</label>
              <select v-model="form.fournisseurId" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
                <option value="">Sélectionner un fournisseur</option>
                <option v-for="f in fournisseurs" :value="f.id">{{ f.nom }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Date</label>
              <input v-model="form.date" type="date" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
            </div>
          </div>

          <!-- Champs facultatifs -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Montant du port (Facultatif)</label>
              <input v-model="form.montantPort" type="number" step="0.01" class="border rounded px-3 py-2 w-full" placeholder="0" @input="calcTotals">
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Mode de transport (Facultatif)</label>
              <input v-model="form.modeTransport" type="text" class="border rounded px-3 py-2 w-full" placeholder="Routier, Aérien...">
            </div>
          </div>

          <div class="mb-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Lieu de livraison (Facultatif)</label>
            <input v-model="form.lieuLivraison" type="text" class="border rounded px-3 py-2 w-full" placeholder="Adresse de livraison">
          </div>

          <div class="mb-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Condition de paiement (Facultatif)</label>
            <input v-model="form.conditionPaiement" type="text" class="border rounded px-3 py-2 w-full" placeholder="30 jours net...">
          </div>

          <!-- Lignes -->
          <div class="mb-2">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold">Lignes du bon de commande</span>
              <button class="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700" @click="addLigne">+ Ajouter ligne</button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-xs mb-2 border">
                <thead>
                  <tr class="bg-gray-100 dark:bg-gray-700">
                    <th class="px-2 py-2 text-left">Désignation</th>
                    <th class="px-2 py-2 text-left">Quantité</th>
                    <th class="px-2 py-2 text-left">Prix unitaire</th>
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
                    </td>
                    <td class="px-2 py-2 font-semibold">{{ helpers.formatMontant(l.total, devise) }}</td>
                    <td class="px-2 py-2">
                      <button class="text-red-600 hover:text-red-800 text-xs font-semibold" @click="removeLigne(idx)">✕</button>
                    </td>
                  </tr>
                  <tr v-if="form.lignes.length === 0">
                    <td colspan="5" class="text-center text-gray-400 py-4">Aucune ligne ajoutée</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Taxes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">TVA (%)</label>
              <select v-model="form.tva" class="border rounded px-3 py-2 w-full" @change="calcTotals">
                <option value="">Aucune</option>
                <option v-for="t in tvaList" :value="t.taux">{{ t.nom }} ({{ t.taux }}%)</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">ABIC (%) - Facultatif</label>
              <select v-model="form.abic" class="border rounded px-3 py-2 w-full" @change="calcTotals">
                <option value="">Aucune</option>
                <option v-for="t in abicList" :value="t.taux">{{ t.nom }} ({{ t.taux }}%)</option>
              </select>
            </div>
          </div>

          <!-- Totaux -->
          <div class="flex flex-wrap gap-4 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div class="flex-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">Total HT</div>
              <div class="text-lg font-semibold">{{ helpers.formatMontant(form.totalHT, devise) }}</div>
            </div>
            <div class="flex-1" v-if="form.tva">
              <div class="text-xs text-gray-600 dark:text-gray-400">TVA ({{ form.tva }}%)</div>
              <div class="text-lg font-semibold text-orange-600">{{ helpers.formatMontant(form.totalTVA, devise) }}</div>
            </div>
            <div class="flex-1" v-if="form.abic">
              <div class="text-xs text-gray-600 dark:text-gray-400">ABIC ({{ form.abic }}%)</div>
              <div class="text-lg font-semibold text-purple-600">{{ helpers.formatMontant(form.totalABIC, devise) }}</div>
            </div>
            <div class="flex-1" v-if="form.montantPort">
              <div class="text-xs text-gray-600 dark:text-gray-400">Port</div>
              <div class="text-lg font-semibold text-green-600">{{ helpers.formatMontant(parseFloat(form.montantPort) || 0, devise) }}</div>
            </div>
            <div class="flex-1">
              <div class="text-xs text-gray-600 dark:text-gray-400">Total TTC</div>
              <div class="text-xl font-bold text-blue-600">{{ helpers.formatMontant(form.totalTTC, devise) }}</div>
            </div>
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
