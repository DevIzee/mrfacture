// src/pages/Factures.js
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
      const logoEntete = (settings && settings.logoEntete) || "";
      const logoPiedPage = (settings && settings.logoPiedPage) || "";
      const mentionSpeciale = (settings && settings.mentionSpeciale) || "";

      const client = this.clients.find((c) => c.id == this.form.clientId);
      const clientNom = client ? client.nom : "--";

      // Bloc pour l'en-tête avec logo
      const enteteHTML = logoEntete
        ? `<div style="text-align: center; margin-bottom: 20px;">
         <img src="${logoEntete}" alt="Logo" style="max-height: 80px; max-width: 300px; object-fit: contain;" onerror="this.style.display='none'">
       </div>`
        : "";

      // Bloc pour le pied de page avec logo et mention
      const piedPageHTML = `
    ${
      logoPiedPage
        ? `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <img src="${logoPiedPage}" alt="Logo pied de page" style="max-height: 60px; max-width: 250px; object-fit: contain;" onerror="this.style.display='none'">
      </div>
    `
        : ""
    }
    ${
      mentionSpeciale
        ? `
      <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 3px solid #2563eb; font-size: 12px; color: #666; line-height: 1.6;">
        ${mentionSpeciale.replace(/\n/g, "<br>")}
      </div>
    `
        : ""
    }
  `;

      // Modèle 1 - Classique
      if (modele === "modele1") {
        return `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: #000;">
        ${enteteHTML}
        
        <!-- En-tête -->
        <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 32px; color: #2563eb;">${
            this.form.type === "proforma" ? "FACTURE PROFORMA" : "FACTURE"
          }</h1>
          <p style="margin: 5px 0; font-size: 18px; color: #666;">N° ${
            this.form.numero
          }</p>
          <p style="margin: 5px 0; color: #666;">Date : ${this.form.date}</p>
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
                <tr style="background: ${idx % 2 === 0 ? "#f8f9fa" : "white"};">
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
        
        ${piedPageHTML}
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
