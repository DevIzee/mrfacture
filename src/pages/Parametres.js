// src/pages/Parametres.js
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
      bonCommandePrefix: "BC",
      bonCommandeIncrement: 1,
      modeleFacture: "modele1",
      modeleBonLivraison: "modele1",
      modeleBonCommande: "modele1",
      logoEntete: "",
      logoPiedPage: "",
      mentionSpeciale: "",
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
      this.bonCommandePrefix = settings.bonCommandePrefix || "BC";
      this.bonCommandeIncrement = settings.bonCommandeIncrement || 1;
      this.modeleFacture = settings.modeleFacture || "modele1";
      this.modeleBonLivraison = settings.modeleBonLivraison || "modele1";
      this.modeleBonCommande = settings.modeleBonCommande || "modele1";
      this.logoEntete = settings.logoEntete || "";
      this.logoPiedPage = settings.logoPiedPage || "";
      this.mentionSpeciale = settings.mentionSpeciale || "";
    }
    // Listener settings-changed pour synchroniser dynamiquement l'UI
    this._settingsListener = (e) => {
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") this.devise = value;
      if (key === "theme") this.theme = value;
      if (key === "sidebarColor") this.sidebarColor = value;
      if (key === "facturePrefix") this.facturePrefix = value;
      if (key === "factureIncrement") this.factureIncrement = value;
      if (key === "bonCommandePrefix") this.bonCommandePrefix = value;
      if (key === "bonCommandeIncrement") this.bonCommandeIncrement = value;
      if (key === "modeleFacture") this.modeleFacture = value;
      if (key === "modeleBonLivraison") this.modeleBonLivraison = value;
      if (key === "modeleBonCommande") this.modeleBonCommande = value;
      if (key === "logoEntete") this.logoEntete = value;
      if (key === "logoPiedPage") this.logoPiedPage = value;
      if (key === "mentionSpeciale") this.mentionSpeciale = value;
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
        bonCommandePrefix: this.bonCommandePrefix,
        bonCommandeIncrement: Number(this.bonCommandeIncrement),
        modeleFacture: this.modeleFacture,
        modeleBonLivraison: this.modeleBonLivraison,
        modeleBonCommande: this.modeleBonCommande,
        logoEntete: this.logoEntete,
        logoPiedPage: this.logoPiedPage,
        mentionSpeciale: this.mentionSpeciale,
      });
      alert("Paramètres enregistrés !");
    },
    async resetSettings() {
      if (
        confirm(
          "Voulez-vous réinitialiser tous les paramètres aux valeurs par défaut ?"
        )
      ) {
        await window.settingsStore.setAll({
          devisePrincipale: "XOF",
          theme: "light",
          sidebarColor: "#f1f5f9",
          facturePrefix: "FAC",
          factureIncrement: 1,
          bonCommandePrefix: "BC",
          bonCommandeIncrement: 1,
          modeleFacture: "modele1",
          modeleBonLivraison: "modele1",
          modeleBonCommande: "modele1",
          logoEntete: "",
          logoPiedPage: "",
          mentionSpeciale: "",
        });

        // Recharger les valeurs
        const settings = await window.settingsStore.get();
        this.devise = settings.devisePrincipale;
        this.theme = settings.theme;
        this.sidebarColor = settings.sidebarColor;
        this.facturePrefix = settings.facturePrefix;
        this.factureIncrement = settings.factureIncrement;
        this.bonCommandePrefix = settings.bonCommandePrefix;
        this.bonCommandeIncrement = settings.bonCommandeIncrement;
        this.modeleFacture = settings.modeleFacture;
        this.modeleBonLivraison = settings.modeleBonLivraison;
        this.modeleBonCommande = settings.modeleBonCommande;
        this.logoEntete = settings.logoEntete;
        this.logoPiedPage = settings.logoPiedPage;
        this.mentionSpeciale = settings.mentionSpeciale;

        alert("Paramètres réinitialisés avec succès !");
      }
    },
    async clearDatabase() {
      if (
        confirm(
          "⚠️ ATTENTION : Cette action va supprimer TOUTES les données (clients, factures, etc.). Voulez-vous continuer ?"
        )
      ) {
        if (
          confirm("Êtes-vous VRAIMENT sûr ? Cette action est irréversible !")
        ) {
          try {
            // Fermer la connexion à la base de données
            window.db.close();

            // Supprimer complètement l'IndexedDB
            await Dexie.delete("elyot");

            alert(
              "Base de données supprimée avec succès ! La page va se recharger."
            );

            // Recharger la page pour réinitialiser l'application
            window.location.reload();
          } catch (error) {
            console.error(
              "Erreur lors de la suppression de la base de données:",
              error
            );
            alert(
              "Erreur lors de la suppression de la base de données. Veuillez rafraîchir la page."
            );
          }
        }
      }
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
            <label class="block mb-2 font-semibold dark:text-gray-300">Pas d'incrémentation (Facture)</label>
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

          <div class="mb-4 mt-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Modèle de bon de livraison</label>
            <select v-model="modeleBonLivraison" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option v-for="m in modeles" :value="m.code">{{ m.label }}</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Choisissez le style de vos bons de livraison</p>
          </div>
        </div>

        <!-- Bons de Commande -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Bons de Commande</h3>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Préfixe bon de commande</label>
            <input v-model="bonCommandePrefix" type="text" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="BC">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Exemple : BC-0001, BC-0002...</p>
          </div>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Pas d'incrémentation (Bon de commande)</label>
            <input v-model="bonCommandeIncrement" type="number" min="1" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="1">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">1 = numérotation normale (0001, 0002...), 2 = saute de 2 en 2 (0002, 0004...)</p>
          </div>
          
          <div>
            <label class="block mb-2 font-semibold dark:text-gray-300">Modèle de bon de commande</label>
            <select v-model="modeleBonCommande" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option v-for="m in modeles" :value="m.code">{{ m.label }}</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Choisissez le style de vos bons de commande PDF</p>
          </div>
        </div>
        
        <!-- Personnalisation PDF -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Personnalisation PDF (Facultatif)</h3>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Logo en-tête (URL)</label>
            <input v-model="logoEntete" type="url" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="https://i.ibb.co/xxxxx/logo.png">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">URL de l'image à afficher en haut des documents (imgBB recommandé)</p>
            <div v-if="logoEntete" class="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <img :src="logoEntete" alt="Logo en-tête" class="max-h-16 object-contain" @error="$event.target.style.display='none'">
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block mb-2 font-semibold dark:text-gray-300">Logo pied de page (URL)</label>
            <input v-model="logoPiedPage" type="url" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="https://i.ibb.co/xxxxx/footer.png">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">URL de l'image à afficher en bas des documents</p>
            <div v-if="logoPiedPage" class="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <img :src="logoPiedPage" alt="Logo pied de page" class="max-h-16 object-contain" @error="$event.target.style.display='none'">
            </div>
          </div>
          
          <div>
            <label class="block mb-2 font-semibold dark:text-gray-300">Mention spéciale</label>
            <textarea v-model="mentionSpeciale" rows="3" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Texte à afficher en bas des documents (conditions générales, mentions légales...)"></textarea>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ce texte apparaîtra en bas de tous vos documents PDF</p>
          </div>
        </div>
        
        <div class="flex justify-between items-center gap-3">
          <div class="flex gap-3">
            <button 
              type="button" 
              class="bg-yellow-600 text-white px-6 py-3 rounded-lg shadow hover:bg-yellow-700 font-semibold"
              @click="resetSettings">
              🔄 Réinitialiser
            </button>
            <button 
              type="button" 
              class="bg-red-600 text-white px-6 py-3 rounded-lg shadow hover:bg-red-700 font-semibold"
              @click="clearDatabase">
              🗑️ Vider la base
            </button>
          </div>
          <button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 font-semibold">
            💾 Enregistrer
          </button>
        </div>
      </form>
    </div>
  `,
};
