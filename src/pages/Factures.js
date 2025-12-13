// src/pages/Factures.js
window.FacturesPage = {
  data() {
    return {
      factures: [],
      clients: [],
      designations: [],
      taxes: [],
      unites: [],
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
      showBonLivraison: false,
      bonLivraisonHTML: "",
      gestionStock: false,
      stocks: {},
      helpers: window.helpers,
    };
  },
  computed: {
    helpers() {
      return window.helpers;
    },
    filtered() {
      const s = this.search.toLowerCase();
      return this.factures
        .filter((f) => f.numero.toLowerCase().includes(s))
        .sort((a, b) => {
          // Trier du plus récent au plus ancien
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        });
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
    this.unites = await unitesStore.getAll();

    // Récupère la devise depuis settings au chargement
    const settings = await window.settingsStore.get();
    this.devise = (settings && settings.devisePrincipale) || "XOF";
    this.gestionStock = settings?.gestionStock || false;

    // Charger les stocks si gestion activée
    if (this.gestionStock) {
      await this.loadStocks();
    }

    this.refresh();

    // Écouteur pour ouvrir le modal depuis App
    if (!this._factureModalListener) {
      this._factureModalListener = () => this.openAdd();
      window.addEventListener("open-facture-modal", this._factureModalListener);
    }

    // Listener settings-changed pour devise
    this._settingsListener = async (e) => {
      // MODIFIER pour async
      const { key, value } = e.detail || {};
      if (key === "devisePrincipale") {
        this.devise = value;
        this.refresh();
      }
      if (key === "gestionStock") {
        this.gestionStock = value;
        if (value) {
          await this.loadStocks();
        }
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
    async openBonLivraisonFromList(f) {
      // Charger la facture dans le formulaire
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

      // Récupérer la devise
      const settings = await window.settingsStore.get();
      this.devise = (settings && settings.devisePrincipale) || "XOF";

      // Générer et afficher le bon de livraison
      this.bonLivraisonHTML = await this.getBonLivraisonHTML();
      this.showBonLivraison = true;
      this.showModal = true;
      this.preview = false;
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
    async updateLigne(idx) {
      const l = this.form.lignes[idx];
      // Si une désignation est choisie, auto-remplir prix
      if (l.designationId) {
        const d = this.designations.find((d) => d.id == l.designationId);
        if (d) {
          l.prix = d.prix;
        }

        // Recharger le stock si gestion activée
        if (this.gestionStock && d && d.type === "produit") {
          const stock = await fluxStockStore.getStockActuel(l.designationId);
          this.stocks[l.designationId] = stock;
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

      // Vérification du stock pour les factures normales
      if (this.form.type === "normale" && this.gestionStock) {
        if (!this.checkStockDisponible()) {
          this.error = this.getStockInsuffisantMessage();
          return false;
        }
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
          // Créer la facture
          const factureId = await facturesStore.add(data);

          // Créer les flux de stock si facture normale et gestion activée
          if (this.form.type === "normale" && this.gestionStock) {
            await this.creerFluxStock(factureId, data);
          }
        }

        this.showModal = false;
        this.refresh();

        // Recharger les stocks après création
        if (this.gestionStock) {
          await this.loadStocks();
        }

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
      const logoEntete = (settings && settings.logoEntete) || "";
      const logoPiedPage = (settings && settings.logoPiedPage) || "";
      const mentionSpeciale = (settings && settings.mentionSpeciale) || "";

      const client = this.clients.find((c) => c.id == this.form.clientId);
      const clientNom = client ? client.nom : "--";

      // Utiliser directement les URLs avec tailles ajustées
      const enteteHTML = settings.logoEntete
        ? `<div style="text-align: center; margin-bottom: 20px;">
            <img src="${settings.logoEntete}" alt="Logo" style="max-height: 100px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="console.error('Erreur chargement logo entete')">
          </div>`
        : "";

      const piedPageHTML = `
        ${
          settings.logoPiedPage
            ? `
          <div style="text-align: center; margin-top: 40px; padding-top: 20px;">
            <img src="${settings.logoPiedPage}" alt="Logo pied de page" style="max-height: 80px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="console.error('Erreur chargement logo pied')">
          </div>`
            : ""
        }
        ${
          mentionSpeciale
            ? `
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 3px solid #2563eb; font-size: 12px; color: #666; line-height: 1.6;">
            ${mentionSpeciale.replace(/\n/g, "<br>")}
          </div>`
            : ""
        }
      `;

      // Modèle 1 - Classique
      if (modele === "modele1") {
        // Récupérer les abréviations des unités
        const getLigneHTML = (l) => {
          const des = this.designations.find((d) => d.id == l.designationId);
          const unite =
            des && des.uniteId
              ? this.unites.find((u) => u.id == des.uniteId)
              : null;
          const uniteAbrev = unite ? ` (${unite.abreviation})` : "";
          return `
      <tr>
        <td style="padding: 12px; border: 1px solid #d1d5db;">${this.designationLabel(
          l.designationId
        ).toUpperCase()}${uniteAbrev}</td>
        <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center;">${
          l.quantite
        }</td>
        <td style="padding: 12px; border: 1px solid #d1d5db; text-align: right;">${Math.round(
          l.prix
        ).toLocaleString("fr-FR")}</td>
        <td style="padding: 12px; border: 1px solid #d1d5db; text-align: right; font-weight: bold;">${Math.round(
          l.total
        ).toLocaleString("fr-FR")}</td>
      </tr>
    `;
        };

        return `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: #000;">
      ${enteteHTML}
      
      <!-- En-tête -->
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 32px; color: #2563eb; text-transform: uppercase;">${
          this.form.type === "proforma" ? "FACTURE PROFORMA" : "FACTURE"
        }</h1>
        <p style="margin: 5px 0; font-size: 18px; color: #666; text-transform: uppercase;">N° ${
          this.form.numero
        }</p>
        <p style="margin: 5px 0; color: #666; text-transform: uppercase;">DATE : ${this.helpers.formatDateFrancais(
          this.form.date
        )}</p>
      </div>
      
      <!-- Informations client -->
      <div style="margin-bottom: 30px;">
        <p style="margin: 5px 0; text-transform: uppercase;"><strong>CLIENT :</strong> ${clientNom.toUpperCase()}</p>
        ${
          this.form.objet
            ? `<p style="margin: 15px 0; font-size: 14px; text-transform: uppercase;"><strong>OBJET :</strong> ${this.form.objet}</p>`
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
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e; text-transform: uppercase;">CONDITIONS DE L'OFFRE</p>
          ${
            this.form.validiteOffre
              ? `<p style="margin: 5px 0; text-transform: uppercase;"><strong>VALIDITÉ :</strong> ${this.form.validiteOffre.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.delaisLivraison
              ? `<p style="margin: 5px 0; text-transform: uppercase;"><strong>DÉLAIS DE LIVRAISON :</strong> ${this.form.delaisLivraison.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.delaisExecution
              ? `<p style="margin: 5px 0; text-transform: uppercase;"><strong>DÉLAIS D'EXÉCUTION :</strong> ${this.form.delaisExecution.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.conditionPaiement
              ? `<p style="margin: 5px 0; text-transform: uppercase;"><strong>CONDITION DE PAIEMENT :</strong> ${this.form.conditionPaiement.toUpperCase()}</p>`
              : ""
          }
        </div>
      `
          : ""
      }
      
      ${
        this.form.garantie
          ? `<div style="background: #dbeafe; padding: 10px; border-left: 4px solid #2563eb; margin-bottom: 20px; text-transform: uppercase;"><strong>GARANTIE :</strong> ${this.form.garantie.toUpperCase()}</div>`
          : ""
      }
      
      <!-- Tableau des lignes -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; text-transform: uppercase;">DÉSIGNATION</th>
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center; width: 80px; text-transform: uppercase;">QTÉ</th>
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; width: 120px; text-transform: uppercase;">P.U.</th>
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; width: 120px; text-transform: uppercase;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${this.form.lignes.map((l) => getLigneHTML(l)).join("")}
        </tbody>
      </table>
      
      <!-- Totaux -->
      <div style="text-align: right; margin-top: 30px;">
        <div style="display: inline-block; min-width: 300px; text-align: left;">
          <div style="padding: 10px 0; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between; text-transform: uppercase;">
            <span>TOTAL HT :</span>
            <span style="font-weight: bold;">${Math.round(
              this.form.totalHT
            ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
          <div style="padding: 10px 0; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between; text-transform: uppercase;">
            <span>TVA :</span>
            <span style="font-weight: bold; color: #f59e0b;">${Math.round(
              this.form.totalTVA
            ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
          <div style="padding: 15px 0; border-top: 2px solid #000; display: flex; justify-content: space-between; font-size: 20px; text-transform: uppercase;">
            <span style="font-weight: bold;">TOTAL TTC :</span>
            <span style="font-weight: bold; color: #2563eb;">${Math.round(
              this.form.totalTTC
            ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
        </div>
      </div>
      
      <!-- Montant en lettres -->
      <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-weight: bold; text-transform: uppercase;">ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${this.helpers.nombreEnLettres(
          this.form.totalTTC,
          this.devise
        )}</p>
      </div>
      
      <!-- Signature -->
      <div style="margin-top: 60px; text-align: right;">
        <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE DIRECTEUR</p>
      </div>
      
      ${piedPageHTML}
    </div>
  `;
      }

      // Modèle 2 - Moderne
      if (modele === "modele2") {
        // Récupérer les abréviations des unités
        const getLigneHTML = (l) => {
          const des = this.designations.find((d) => d.id == l.designationId);
          const unite =
            des && des.uniteId
              ? this.unites.find((u) => u.id == des.uniteId)
              : null;
          const uniteAbrev = unite ? ` (${unite.abreviation})` : "";
          return `
            <tr style="background: ${
              this.form.lignes.indexOf(l) % 2 === 0 ? "#f8f9fa" : "white"
            };">
              <td style="padding: 12px;">${this.designationLabel(
                l.designationId
              ).toUpperCase()}${uniteAbrev}</td>
              <td style="padding: 12px; text-align: center;">${l.quantite}</td>
              <td style="padding: 12px; text-align: right;">${Math.round(
                l.prix
              ).toLocaleString("fr-FR")}</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #667eea;">${Math.round(
                l.total
              ).toLocaleString("fr-FR")}</td>
            </tr>
          `;
        };

        return `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 50px; max-width: 850px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000;">
            <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
              ${enteteHTML}
              
              <!-- En-tête moderne -->
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 50px; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">${
                    this.form.type === "proforma" ? "PROFORMA" : "FACTURE"
                  }</h1>
                </div>
                <p style="margin: 10px 0; font-size: 24px; color: #667eea; font-weight: bold; text-transform: uppercase;">№ ${
                  this.form.numero
                }</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px; text-transform: uppercase;">📅 ${this.helpers.formatDateFrancais(
                  this.form.date
                )}</p>
              </div>
              
              <!-- Info client avec style moderne -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #667eea;">
                <p style="margin: 5px 0; font-size: 16px; text-transform: uppercase;"><strong style="color: #667eea;">👤 CLIENT :</strong> ${clientNom.toUpperCase()}</p>
                ${
                  this.form.objet
                    ? `<p style="margin: 15px 0; font-size: 14px; text-transform: uppercase;"><strong style="color: #667eea;">📋 OBJET :</strong> ${this.form.objet}</p>`
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
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #2d3436; text-transform: uppercase;">⚡ CONDITIONS</p>
                  ${
                    this.form.validiteOffre
                      ? `<p style="margin: 5px 0; text-transform: uppercase;">✓ VALIDITÉ : ${this.form.validiteOffre.toUpperCase()}</p>`
                      : ""
                  }
                  ${
                    this.form.delaisLivraison
                      ? `<p style="margin: 5px 0; text-transform: uppercase;">✓ LIVRAISON : ${this.form.delaisLivraison.toUpperCase()}</p>`
                      : ""
                  }
                  ${
                    this.form.delaisExecution
                      ? `<p style="margin: 5px 0; text-transform: uppercase;">✓ EXÉCUTION : ${this.form.delaisExecution.toUpperCase()}</p>`
                      : ""
                  }
                  ${
                    this.form.conditionPaiement
                      ? `<p style="margin: 5px 0; text-transform: uppercase;">✓ PAIEMENT : ${this.form.conditionPaiement.toUpperCase()}</p>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
              
              ${
                this.form.garantie
                  ? `<div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #2196f3; text-transform: uppercase;"><strong>🛡️ GARANTIE :</strong> ${this.form.garantie.toUpperCase()}</div>`
                  : ""
              }
              
              <!-- Tableau moderne -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 10px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <th style="padding: 15px; text-align: left; text-transform: uppercase;">DÉSIGNATION</th>
                    <th style="padding: 15px; text-align: center; width: 80px; text-transform: uppercase;">QTÉ</th>
                    <th style="padding: 15px; text-align: right; width: 120px; text-transform: uppercase;">P.U.</th>
                    <th style="padding: 15px; text-align: right; width: 120px; text-transform: uppercase;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.form.lignes.map((l) => getLigneHTML(l)).join("")}
                </tbody>
              </table>
              
              <!-- Totaux modernes -->
              <div style="text-align: right; margin-top: 30px;">
                <div style="display: inline-block; min-width: 350px; background: #f8f9fa; padding: 25px; border-radius: 15px;">
                  <div style="padding: 10px 0; display: flex; justify-content: space-between; font-size: 16px; text-transform: uppercase;">
                    <span>TOTAL HT</span>
                    <span style="font-weight: bold;">${Math.round(
                      this.form.totalHT
                    ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
                  </div>
                  <div style="padding: 10px 0; display: flex; justify-content: space-between; font-size: 16px; border-bottom: 2px dashed #ddd; text-transform: uppercase;">
                    <span>TVA</span>
                    <span style="font-weight: bold; color: #f59e0b;">${Math.round(
                      this.form.totalTVA
                    ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
                  </div>
                  <div style="padding: 20px 0; display: flex; justify-content: space-between; font-size: 24px; text-transform: uppercase;">
                    <span style="font-weight: bold;">TOTAL TTC</span>
                    <span style="font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${Math.round(
                      this.form.totalTTC
                    ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
                  </div>
                </div>
              </div>
              
              <!-- Montant en lettres -->
              <div style="margin-top: 30px; padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 10px; border-left: 4px solid #667eea;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase;">ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${this.helpers.nombreEnLettres(
                  this.form.totalTTC,
                  this.devise
                )}</p>
              </div>
              
              <!-- Signature -->
              <div style="margin-top: 60px; text-align: right;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase; color: #667eea;">LE DIRECTEUR</p>
              </div>
              
              ${piedPageHTML}
            </div>
          </div>
        `;
      }

      // Modèle 3 - Minimaliste
      if (modele === "modele3") {
        // Récupérer les abréviations des unités
        const getLigneHTML = (l) => {
          const des = this.designations.find((d) => d.id == l.designationId);
          const unite =
            des && des.uniteId
              ? this.unites.find((u) => u.id == des.uniteId)
              : null;
          const uniteAbrev = unite ? ` (${unite.abreviation})` : "";
          return `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 0;">${this.designationLabel(
          l.designationId
        ).toUpperCase()}${uniteAbrev}</td>
        <td style="padding: 12px 0; text-align: center;">${l.quantite}</td>
        <td style="padding: 12px 0; text-align: right;">${Math.round(
          l.prix
        ).toLocaleString("fr-FR")}</td>
        <td style="padding: 12px 0; text-align: right;">${Math.round(
          l.total
        ).toLocaleString("fr-FR")}</td>
      </tr>
    `;
        };

        return `
    <div style="font-family: 'Courier New', monospace; padding: 60px 40px; max-width: 750px; margin: 0 auto; background: white; color: #000;">
      ${enteteHTML}
      
      <!-- En-tête minimaliste -->
      <div style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 40px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 5px; text-transform: uppercase;">${
          this.form.type === "proforma" ? "PROFORMA" : "INVOICE"
        }</h1>
      </div>
      
      <!-- Infos essentielles -->
      <div style="margin-bottom: 40px; line-height: 1.8;">
        <p style="margin: 5px 0; text-transform: uppercase;">N° ${
          this.form.numero
        }</p>
        <p style="margin: 5px 0; text-transform: uppercase;">DATE: ${this.helpers.formatDateFrancais(
          this.form.date
        )}</p>
        <p style="margin: 5px 0; text-transform: uppercase;">CLIENT: ${clientNom.toUpperCase()}</p>
        ${
          this.form.objet
            ? `<p style="margin: 15px 0; text-transform: uppercase;">OBJET: ${this.form.objet}</p>`
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
              ? `<p style="margin: 5px 0; text-transform: uppercase;">VALIDITÉ: ${this.form.validiteOffre.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.delaisLivraison
              ? `<p style="margin: 5px 0; text-transform: uppercase;">LIVRAISON: ${this.form.delaisLivraison.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.delaisExecution
              ? `<p style="margin: 5px 0; text-transform: uppercase;">EXÉCUTION: ${this.form.delaisExecution.toUpperCase()}</p>`
              : ""
          }
          ${
            this.form.conditionPaiement
              ? `<p style="margin: 5px 0; text-transform: uppercase;">PAIEMENT: ${this.form.conditionPaiement.toUpperCase()}</p>`
              : ""
          }
        </div>
      `
          : ""
      }
      
      ${
        this.form.garantie
          ? `<div style="border-left: 2px solid #000; padding-left: 15px; margin-bottom: 30px;"><p style="margin: 0; text-transform: uppercase;">GARANTIE: ${this.form.garantie.toUpperCase()}</p></div>`
          : ""
      }
      
      <!-- Tableau minimaliste -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="border-bottom: 2px solid #000;">
            <th style="padding: 10px 0; text-align: left; font-weight: normal; text-transform: uppercase;">DÉSIGNATION</th>
            <th style="padding: 10px 0; text-align: center; width: 60px; font-weight: normal; text-transform: uppercase;">QTÉ</th>
            <th style="padding: 10px 0; text-align: right; width: 100px; font-weight: normal; text-transform: uppercase;">P.U.</th>
            <th style="padding: 10px 0; text-align: right; width: 100px; font-weight: normal; text-transform: uppercase;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${this.form.lignes.map((l) => getLigneHTML(l)).join("")}
        </tbody>
      </table>
      
      <!-- Totaux minimalistes -->
      <div style="text-align: right; border-top: 2px solid #000; padding-top: 20px;">
        <div style="display: inline-block; min-width: 300px; text-align: left; line-height: 2;">
          <div style="display: flex; justify-content: space-between; text-transform: uppercase;">
            <span>TOTAL HT:</span>
            <span>${Math.round(this.form.totalHT).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
          <div style="display: flex; justify-content: space-between; text-transform: uppercase;">
            <span>TVA:</span>
            <span>${Math.round(this.form.totalTVA).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; font-size: 18px; text-transform: uppercase;">
            <span style="font-weight: bold;">TOTAL TTC:</span>
            <span style="font-weight: bold;">${Math.round(
              this.form.totalTTC
            ).toLocaleString("fr-FR")} ${
          this.devise === "XOF" ? "F CFA" : this.devise
        }</span>
          </div>
        </div>
      </div>
      
      <!-- Montant en lettres -->
      <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-left: 2px solid #000;">
        <p style="margin: 0; font-weight: bold; text-transform: uppercase;">ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">${this.helpers.nombreEnLettres(
          this.form.totalTTC,
          this.devise
        )}</p>
      </div>
      
      <!-- Signature -->
      <div style="margin-top: 60px; text-align: right;">
        <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE DIRECTEUR</p>
      </div>
      
      ${piedPageHTML}
    </div>
  `;
      }

      return "";
    },
    async showBonLivraisonPreview() {
      // Validation rapide
      if (!this.form.clientId) {
        this.error = "Veuillez sélectionner un client";
        return;
      }
      if (this.form.lignes.length === 0) {
        this.error = "Veuillez ajouter au moins une ligne";
        return;
      }
      this.error = "";

      // Générer le HTML du bon de livraison
      this.bonLivraisonHTML = await this.getBonLivraisonHTML();
      this.showBonLivraison = true;
    },
    hideBonLivraison() {
      this.showBonLivraison = false;
    },
    async getBonLivraisonHTML() {
      // Récupérer le modèle choisi dans les settings
      const settings = await window.settingsStore.get();
      const modele = (settings && settings.modeleBonLivraison) || "modele1";
      const logoEntete = (settings && settings.logoEntete) || "";
      const logoPiedPage = (settings && settings.logoPiedPage) || "";

      const client = this.clients.find((c) => c.id == this.form.clientId);
      const clientNom = client ? client.nom : "--";

      // Utiliser directement les URLs avec tailles ajustées
      const enteteHTML = settings.logoEntete
        ? `<div style="text-align: center; margin-bottom: 20px;">
            <img src="${settings.logoEntete}" alt="Logo" style="max-height: 100px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="console.error('Erreur chargement logo entete')">
          </div>`
        : "";

      const piedPageHTML = settings.logoPiedPage
        ? `<div style="text-align: center; margin-top: 40px; padding-top: 20px;">
            <img src="${settings.logoPiedPage}" alt="Logo pied de page" style="max-height: 80px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="console.error('Erreur chargement logo pied')">
          </div>`
        : "";

      // Fonction pour générer une ligne du tableau
      const getLigneHTML = (l, idx) => {
        const des = this.designations.find((d) => d.id == l.designationId);
        const unite =
          des && des.uniteId
            ? this.unites.find((u) => u.id == des.uniteId)
            : null;
        const uniteAbrev = unite ? ` (${unite.abreviation})` : "";

        if (modele === "modele1") {
          return `
        <tr>
          <td style="padding: 12px; border: 1px solid #d1d5db;">${this.designationLabel(
            l.designationId
          ).toUpperCase()}${uniteAbrev}</td>
          <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center;">${
            l.quantite
          }</td>
        </tr>
      `;
        } else if (modele === "modele2") {
          return `
        <tr style="background: ${idx % 2 === 0 ? "#f8f9fa" : "white"};">
          <td style="padding: 12px;">${this.designationLabel(
            l.designationId
          ).toUpperCase()}${uniteAbrev}</td>
          <td style="padding: 12px; text-align: center;">${l.quantite}</td>
        </tr>
      `;
        } else {
          return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 12px 0;">${this.designationLabel(
            l.designationId
          ).toUpperCase()}${uniteAbrev}</td>
          <td style="padding: 12px 0; text-align: center;">${l.quantite}</td>
        </tr>
      `;
        }
      };

      // Modèle 1 - Classique
      if (modele === "modele1") {
        return `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: #000;">
        ${enteteHTML}
        
        <!-- En-tête -->
        <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 32px; color: #2563eb; text-transform: uppercase;">BON DE LIVRAISON</h1>
          <p style="margin: 5px 0; font-size: 18px; color: #666; text-transform: uppercase;">N° ${
            this.form.numero
          }</p>
          <p style="margin: 5px 0; color: #666; text-transform: uppercase;">DATE : ${this.helpers.formatDateFrancais(
            this.form.date
          )}</p>
        </div>
        
        <!-- Informations client -->
        <div style="margin-bottom: 30px;">
          <p style="margin: 5px 0; text-transform: uppercase;"><strong>CLIENT :</strong> ${clientNom.toUpperCase()}</p>
          ${
            this.form.objet
              ? `<p style="margin: 15px 0; font-size: 14px; text-transform: uppercase;"><strong>OBJET :</strong> ${this.form.objet}</p>`
              : ""
          }
        </div>
        
        <!-- Tableau des lignes -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; text-transform: uppercase;">DÉSIGNATION</th>
              <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center; width: 150px; text-transform: uppercase;">QUANTITÉ</th>
            </tr>
          </thead>
          <tbody>
            ${this.form.lignes.map((l, idx) => getLigneHTML(l, idx)).join("")}
          </tbody>
        </table>
        
        <!-- Signatures -->
        <div style="margin-top: 80px; display: flex; justify-content: space-between;">
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE LIVREUR</p>
          </div>
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE CLIENT</p>
          </div>
        </div>
        
        ${piedPageHTML}
      </div>
    `;
      }

      // Modèle 2 - Moderne
      if (modele === "modele2") {
        return `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 50px; max-width: 850px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000;">
        <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          ${enteteHTML}
          
          <!-- En-tête moderne -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 50px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">BON DE LIVRAISON</h1>
            </div>
            <p style="margin: 10px 0; font-size: 24px; color: #667eea; font-weight: bold; text-transform: uppercase;">№ ${
              this.form.numero
            }</p>
            <p style="margin: 5px 0; color: #666; font-size: 14px; text-transform: uppercase;">📅 ${this.helpers.formatDateFrancais(
              this.form.date
            )}</p>
          </div>
          
          <!-- Info client -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #667eea;">
            <p style="margin: 5px 0; font-size: 16px; text-transform: uppercase;"><strong style="color: #667eea;">👤 CLIENT :</strong> ${clientNom.toUpperCase()}</p>
            ${
              this.form.objet
                ? `<p style="margin: 15px 0; font-size: 14px; text-transform: uppercase;"><strong style="color: #667eea;">📋 OBJET :</strong> ${this.form.objet}</p>`
                : ""
            }
          </div>
          
          <!-- Tableau moderne -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 10px; overflow: hidden;">
            <thead>
              <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <th style="padding: 15px; text-align: left; text-transform: uppercase;">DÉSIGNATION</th>
                <th style="padding: 15px; text-align: center; width: 150px; text-transform: uppercase;">QUANTITÉ</th>
              </tr>
            </thead>
            <tbody>
              ${this.form.lignes.map((l, idx) => getLigneHTML(l, idx)).join("")}
            </tbody>
          </table>
          
          <!-- Signatures -->
          <div style="margin-top: 80px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 45%;">
              <p style="margin: 0; font-weight: bold; text-transform: uppercase; color: #667eea;">LE LIVREUR</p>
            </div>
            <div style="text-align: center; width: 45%;">
              <p style="margin: 0; font-weight: bold; text-transform: uppercase; color: #667eea;">LE CLIENT</p>
            </div>
          </div>
          
          ${piedPageHTML}
        </div>
      </div>
    `;
      }

      // Modèle 3 - Minimaliste
      if (modele === "modele3") {
        return `
      <div style="font-family: 'Courier New', monospace; padding: 60px 40px; max-width: 750px; margin: 0 auto; background: white; color: #000;">
        ${enteteHTML}
        
        <!-- En-tête minimaliste -->
        <div style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 40px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 5px; text-transform: uppercase;">BON DE LIVRAISON</h1>
        </div>
        
        <!-- Infos essentielles -->
        <div style="margin-bottom: 40px; line-height: 1.8;">
          <p style="margin: 5px 0; text-transform: uppercase;">N° ${
            this.form.numero
          }</p>
          <p style="margin: 5px 0; text-transform: uppercase;">DATE: ${this.helpers.formatDateFrancais(
            this.form.date
          )}</p>
          <p style="margin: 5px 0; text-transform: uppercase;">CLIENT: ${clientNom.toUpperCase()}</p>
          ${
            this.form.objet
              ? `<p style="margin: 15px 0; text-transform: uppercase;">OBJET: ${this.form.objet}</p>`
              : ""
          }
        </div>
        
        <!-- Tableau minimaliste -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th style="padding: 10px 0; text-align: left; font-weight: normal; text-transform: uppercase;">DÉSIGNATION</th>
              <th style="padding: 10px 0; text-align: center; width: 150px; font-weight: normal; text-transform: uppercase;">QUANTITÉ</th>
            </tr>
          </thead>
          <tbody>
            ${this.form.lignes.map((l, idx) => getLigneHTML(l, idx)).join("")}
          </tbody>
        </table>
        
        <!-- Signatures -->
        <div style="margin-top: 80px; display: flex; justify-content: space-between;">
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE LIVREUR</p>
          </div>
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">LE CLIENT</p>
          </div>
        </div>
        
        ${piedPageHTML}
      </div>
    `;
      }

      return "";
    },
    printBonLivraison() {
      window.print();
    },
    exportBonLivraisonPDF() {
      const el = document.getElementById("bon-livraison-preview-block");
      if (!el) {
        alert("Impossible de générer le PDF.");
        return;
      }

      const filename = `bon_livraison_${this.form.numero.replace(
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
    printInvoice() {
      // Ouvrir la fenêtre d'impression du navigateur
      window.print();
    },
    async openPreviewFromList(f) {
      // Stocker la facture
      localStorage.setItem("facture_preview", JSON.stringify(f));

      // Stocker les settings et les données nécessaires
      const settings = await window.settingsStore.get();
      localStorage.setItem("app_settings", JSON.stringify(settings));
      localStorage.setItem("app_clients", JSON.stringify(this.clients));
      localStorage.setItem(
        "app_designations",
        JSON.stringify(this.designations)
      );
      localStorage.setItem("app_unites", JSON.stringify(this.unites));
      localStorage.setItem("app_taxes", JSON.stringify(this.taxes));

      // Ouvrir dans un nouvel onglet
      window.open("preview-facture.html", "_blank");
    },
    async openBonLivraisonPage(f) {
      // Stocker la facture
      localStorage.setItem("facture_preview", JSON.stringify(f));

      // Stocker les settings et les données nécessaires
      const settings = await window.settingsStore.get();
      localStorage.setItem("app_settings", JSON.stringify(settings));
      localStorage.setItem("app_clients", JSON.stringify(this.clients));
      localStorage.setItem(
        "app_designations",
        JSON.stringify(this.designations)
      );
      localStorage.setItem("app_unites", JSON.stringify(this.unites));

      // Ouvrir dans un nouvel onglet
      window.open("preview-bon-livraison.html", "_blank");
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
    async loadStocks() {
      // Charger les stocks pour tous les produits
      this.stocks = {};
      const produits = this.designations.filter((d) => d.type === "produit");

      for (const produit of produits) {
        const stock = await fluxStockStore.getStockActuel(produit.id);
        this.stocks[produit.id] = stock;
      }
    },
    getStock(designationId) {
      return this.stocks[designationId] || 0;
    },
    checkStockDisponible() {
      // Vérifier le stock pour chaque ligne (seulement pour factures normales)
      if (this.form.type !== "normale") return true;
      if (!this.gestionStock) return true;

      for (const ligne of this.form.lignes) {
        if (!ligne.designationId) continue;

        const designation = this.designations.find(
          (d) => d.id == ligne.designationId
        );
        if (designation && designation.type === "produit") {
          const stockActuel = this.getStock(ligne.designationId);
          if (stockActuel < ligne.quantite) {
            return false;
          }
        }
      }
      return true;
    },
    getStockInsuffisantMessage() {
      // Générer un message d'erreur détaillé pour les stocks insuffisants
      const problemes = [];

      for (const ligne of this.form.lignes) {
        if (!ligne.designationId) continue;

        const designation = this.designations.find(
          (d) => d.id == ligne.designationId
        );
        if (designation && designation.type === "produit") {
          const stockActuel = this.getStock(ligne.designationId);
          if (stockActuel < ligne.quantite) {
            problemes.push(
              `${designation.nom}: stock actuel ${stockActuel}, demandé ${ligne.quantite}`
            );
          }
        }
      }

      return "Stock insuffisant pour:\n" + problemes.join("\n");
    },
    async creerFluxStock(factureId, facture) {
      // Créer un flux de sortie pour chaque ligne contenant un produit
      const settings = await window.settingsStore.get();
      const prefix = (settings && settings.fluxStockPrefix) || "FS";

      for (const ligne of facture.lignes) {
        const designation = this.designations.find(
          (d) => d.id == ligne.designationId
        );

        // Créer un flux seulement pour les produits
        if (designation && designation.type === "produit") {
          // Générer un numéro de flux
          const allFlux = await fluxStockStore.getAll();
          const nums = allFlux
            .map((f) => f.numero)
            .filter((n) => n && n.startsWith(prefix + "-"))
            .map((n) => parseInt(n.replace(prefix + "-", "")))
            .filter((n) => !isNaN(n));

          let nextNum = 1;
          if (nums.length > 0) {
            const maxNum = Math.max(...nums);
            nextNum = maxNum + 1;
          }
          const numero = `${prefix}-${String(nextNum).padStart(4, "0")}`;

          // Créer le flux
          await fluxStockStore.add({
            numero: numero,
            date: facture.date,
            dateReelle: facture.date,
            fournisseurId: null,
            quantite: ligne.quantite,
            designationId: ligne.designationId,
            type: "sortie",
            nature: "facturation",
            detailCourt: `Facture ${
              facture.numero
            } - Client: ${this.clientLabel(facture.clientId)}`,
          });
        }
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
              <th class="px-4 py-2 text-left">Date</th>
              <th class="px-4 py-2 text-left">Numéro</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-left">Client</th>
              <th class="px-4 py-2 text-left">Total TTC</th>
              <th class="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.id">
              <td class="px-4 py-2">{{ helpers.formatDateFrancais(f.date) }}</td>
              <td class="px-4 py-2">{{ f.numero }}</td>
              <td class="px-4 py-2">
                <span :class="f.type === 'proforma' ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs' : 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs'">
                  {{ f.type === 'proforma' ? 'Proforma' : 'Normale' }}
                </span>
              </td>
              <td class="px-4 py-2">{{ clientLabel(f.clientId) }}</td>
              <td class="px-4 py-2">{{ helpers.formatMontant(f.totalTTC, devise) }}</td>
              <td class="px-4 py-2">
                <button v-if="f.type === 'proforma'" class="text-blue-600 hover:underline mr-2" @click="openEdit(f)">Modifier</button>
                <button class="text-purple-600 hover:underline mr-2" @click="openPreviewFromList(f)">👁 Voir</button>
                <button v-if="f.type === 'normale' || !f.type" class="text-orange-600 hover:underline mr-2" @click="openBonLivraisonPage(f)">📦 Bon</button>
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
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-1">Numéro</label>
              <input v-model="form.numero" type="text" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white" placeholder="Numéro">
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
              <input v-model="form.date" type="date" class="border rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white">
            </div>
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
                    <th v-if="gestionStock && form.type === 'normale'" class="px-2 py-2 text-left">Stock</th>
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
                    <td v-if="gestionStock && form.type === 'normale'" class="px-2 py-2">
                      <span v-if="l.designationId && designations.find(d => d.id == l.designationId)?.type === 'produit'" 
                            :class="['text-xs font-semibold', getStock(l.designationId) >= l.quantite ? 'text-green-600' : 'text-red-600']">
                        {{ getStock(l.designationId) }}
                        <span v-if="getStock(l.designationId) < l.quantite" class="block">⚠️ Insuffisant</span>
                      </span>
                      <span v-else class="text-xs text-gray-400">N/A</span>
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
             
            <!--
            <div class="flex gap-2">
              <button v-if="form.type === 'normale' || !form.type" class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700" @click="showBonLivraisonPreview">📦 Bon de livraison</button>
              <button class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" @click="showPreview">👁 Prévisualiser</button>
            </div>
            -->
          </div>
          
          <!-- Preview -->
          <div v-if="preview" class="mt-6 border-t pt-4">
            <div class="mb-2 flex justify-between items-start">
              <div class="flex-1">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Aperçu de la facture</div>
              </div>
              <div class="flex flex-col gap-2">
                <button class="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300" @click="hidePreview">✕ Fermer</button>
                <button class="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" @click="printInvoice">🖨️ Imprimer</button>
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

          <!-- Bon de Livraison Preview -->
          <div v-if="showBonLivraison" class="mt-6 border-t pt-4">
            <div class="mb-2 flex justify-between items-start">
              <div class="flex-1">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Aperçu du bon de livraison</div>
              </div>
              <div class="flex flex-col gap-2">
                <button class="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300" @click="hideBonLivraison">✕ Fermer</button>
                <button class="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" @click="printBonLivraison">🖨️ Imprimer</button>
                <button class="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700" @click="exportBonLivraisonPDF">📄 PDF</button>
              </div>
            </div>
            
            <!-- Conteneur pour le HTML du bon de livraison -->
            <div id="bon-livraison-preview-block" class="border rounded shadow-lg overflow-auto" style="max-height: 600px;" v-html="bonLivraisonHTML"></div>
          </div>

        </div>
      </div>
    </div>
  `,
};
