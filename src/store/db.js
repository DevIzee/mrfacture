// src/store/db.js
// Dexie DB config for Mr Facture
window.db = new Dexie("mr-facture");

window.db.version(1).stores({
  taxes: "++id, nom, taux, type",
  unites: "++id, nom, abreviation",
  clients: "++id, nom, email, telephone",
  fournisseurs: "++id, nom, email, telephone",
  categories: "++id, nom",
  designations:
    "++id, nom, uniteId, prix, prixMin, type, reference, categorieId",
  factures:
    "++id, numero, clientId, date, type, objet, garantie, validiteOffre, delaisLivraison, delaisExecution, conditionPaiement, lignes, totalHT, totalTVA, totalTTC",
  bons_commandes: "++id, numero, fournisseurId, date, lignes, total",
  settings:
    "id, theme, sidebarColor, devisePrincipale, devises, tauxConversion, facturePrefix, factureIncrement, modeleFacture, logoEntete, logoPiedPage, mentionSpeciale",
});

// Chargement initial si DB vide
async function initDB() {
  const tables = [
    "taxes",
    "unites",
    "clients",
    "fournisseurs",
    "categories",
    "designations",
    "factures",
    "bons_commandes",
    "settings",
  ];
  const res = await fetch("/data/db-template.json");
  const data = await res.json();
  for (const t of tables) {
    if ((await db[t].count()) === 0) {
      if (Array.isArray(data[t])) await db[t].bulkAdd(data[t]);
      else if (data[t]) await db[t].add(data[t]);
    }
  }
}
window.initDB = initDB;
initDB();
