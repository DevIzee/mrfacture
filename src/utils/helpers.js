// src/utils/helpers.js
window.helpers = {
  generateId: () => Math.random().toString(36).substr(2, 9),
  formatMontant: (val, devise = "EUR") => {
    if (typeof val !== "number") return "--";
    return val.toLocaleString("fr-FR", { style: "currency", currency: devise });
  },
  formatDate: (d) => {
    if (!d) return "--";
    return new Date(d).toLocaleDateString("fr-FR");
  },
  getNextNumero: async (type) => {
    // type: 'facture' ou 'bon_commande'
    const settings = await db.settings.toCollection().first();
    let prefix = type === "facture" ? settings.facturePrefix : "BC";
    let increment = type === "facture" ? settings.factureIncrement : 1;
    return prefix + String(increment).padStart(4, "0");
  },
  updateNumero: async (type) => {
    const settings = await db.settings.toCollection().first();
    if (type === "facture") {
      await db.settings.update(settings.id, {
        factureIncrement: settings.factureIncrement + 1,
      });
    }
    // étendre pour d'autres types si besoin
  },
  devisePrincipale: async () => {
    const settings = await db.settings.toCollection().first();
    return settings.devisePrincipale || "EUR";
  },
  tauxConversion: async (devise) => {
    const settings = await db.settings.toCollection().first();
    return settings.tauxConversion?.[devise] || 1;
  },
  // Fonction pour convertir un nombre en lettres (français)
  nombreEnLettres: (nombre, devise = "XOF") => {
    const unites = [
      "",
      "UN",
      "DEUX",
      "TROIS",
      "QUATRE",
      "CINQ",
      "SIX",
      "SEPT",
      "HUIT",
      "NEUF",
    ];
    const dizaines = [
      "",
      "DIX",
      "VINGT",
      "TRENTE",
      "QUARANTE",
      "CINQUANTE",
      "SOIXANTE",
      "SOIXANTE",
      "QUATRE-VINGT",
      "QUATRE-VINGT",
    ];
    const especiales = [
      "DIX",
      "ONZE",
      "DOUZE",
      "TREIZE",
      "QUATORZE",
      "QUINZE",
      "SEIZE",
      "DIX-SEPT",
      "DIX-HUIT",
      "DIX-NEUF",
    ];

    const convertirMoinsDeMillle = (n) => {
      if (n === 0) return "";
      if (n < 10) return unites[n];
      if (n < 20) return especiales[n - 10];
      if (n < 100) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        if (d === 7 || d === 9) {
          return (
            dizaines[d] +
            (u === 0
              ? ""
              : "-" +
                (d === 7 ? especiales[u] : u === 1 ? "UN" : especiales[u]))
          );
        }
        if (u === 1 && d > 1) return dizaines[d] + "-ET-UN";
        if (u === 0) return dizaines[d];
        return dizaines[d] + "-" + unites[u];
      }
      const c = Math.floor(n / 100);
      const reste = n % 100;
      let resultat = c === 1 ? "CENT" : unites[c] + "-CENT";
      if (c > 1 && reste === 0) resultat += "S";
      if (reste > 0)
        resultat += (reste < 10 ? "-" : "-") + convertirMoinsDeMillle(reste);
      return resultat;
    };

    if (nombre === 0) return "ZÉRO";

    // Séparer partie entière et décimale
    let partieEntiere = Math.floor(nombre);
    const partieDecimale = Math.round((nombre - partieEntiere) * 100);

    let resultat = "";

    // Traiter les milliards
    if (partieEntiere >= 1000000000) {
      const milliards = Math.floor(partieEntiere / 1000000000);
      resultat += convertirMoinsDeMillle(milliards) + " MILLIARD";
      if (milliards > 1) resultat += "S";
      partieEntiere = partieEntiere % 1000000000;
      if (partieEntiere > 0) resultat += " ";
    }

    // Traiter les millions
    if (partieEntiere >= 1000000) {
      const millions = Math.floor(partieEntiere / 1000000);
      resultat += convertirMoinsDeMillle(millions) + " MILLION";
      if (millions > 1) resultat += "S";
      partieEntiere = partieEntiere % 1000000;
      if (partieEntiere > 0) resultat += " ";
    }

    // Traiter les milliers
    if (partieEntiere >= 1000) {
      const milliers = Math.floor(partieEntiere / 1000);
      if (milliers === 1) {
        resultat += "MILLE";
      } else {
        resultat += convertirMoinsDeMillle(milliers) + "-MILLE";
      }
      partieEntiere = partieEntiere % 1000;
      if (partieEntiere > 0) resultat += "-";
    }

    // Traiter les centaines, dizaines et unités
    if (partieEntiere > 0) {
      resultat += convertirMoinsDeMillle(partieEntiere);
    }

    // Ajouter le montant en chiffres entre parenthèses
    const montantChiffres = Math.floor(nombre).toLocaleString("fr-FR");
    resultat += ` (${montantChiffres})`;

    // Ajouter la devise
    if (devise === "XOF" || devise === "CFA") {
      resultat += " FRANCS CFA";
    } else if (devise === "EUR") {
      resultat += " EURO";
      if (Math.floor(nombre) > 1) resultat += "S";
      if (partieDecimale > 0) {
        resultat +=
          " ET " + convertirMoinsDeMillle(partieDecimale) + " CENTIME";
        if (partieDecimale > 1) resultat += "S";
      }
    } else if (devise === "USD") {
      resultat += " DOLLAR";
      if (Math.floor(nombre) > 1) resultat += "S";
      if (partieDecimale > 0) {
        resultat += " ET " + convertirMoinsDeMillle(partieDecimale) + " CENT";
        if (partieDecimale > 1) resultat += "S";
      }
    }

    return resultat;
  },
  // Fonction pour formater la date en français
  formatDateFrancais: (dateStr) => {
    if (!dateStr) return "";
    const mois = [
      "JANVIER",
      "FÉVRIER",
      "MARS",
      "AVRIL",
      "MAI",
      "JUIN",
      "JUILLET",
      "AOÛT",
      "SEPTEMBRE",
      "OCTOBRE",
      "NOVEMBRE",
      "DÉCEMBRE",
    ];
    const date = new Date(dateStr);
    const jour = date.getDate();
    const moisNom = mois[date.getMonth()];
    const annee = date.getFullYear();
    return `${jour} ${moisNom} ${annee}`;
  },
};
