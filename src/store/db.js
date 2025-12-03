// src/store/db.js
// Dexie DB config for Mr Facture
window.db = new Dexie("mr-facture");
window.db.version(1).stores({
  taxes: "++id, nom, taux",
  unites: "++id, nom",
  clients: "++id, nom, email",
  fournisseurs: "++id, nom, email",
  categories: "++id, nom",
  designations: "++id, nom, prix, uniteId, categorieId",
  factures: "++id, numero, clientId, date, lignes, total",
  bons_commandes: "++id, numero, fournisseurId, date, lignes, total",
  settings:
    "id, theme, sidebarColor, devisePrincipale, devises, tauxConversion, facturePrefix, factureIncrement",
});

window.db
  .version(2)
  .stores({
    taxes: "++id, nom, taux",
    unites: "++id, nom, abreviation",
    clients: "++id, nom, email",
    fournisseurs: "++id, nom, email",
    categories: "++id, nom",
    designations:
      "++id, nom, uniteId, prix, remiseMax, type, reference, categorieId",
    factures: "++id, numero, clientId, date, lignes, total",
    bons_commandes: "++id, numero, fournisseurId, date, lignes, total",
    settings:
      "id, theme, sidebarColor, devisePrincipale, devises, tauxConversion, facturePrefix, factureIncrement",
  })
  .upgrade(async (tx) => {
    // Migration des désignations existantes : ajoute/remap les nouveaux champs si absents
    const all = await tx.table("designations").toArray();
    for (const d of all) {
      if (d.type === undefined) d.type = "service";
      if (d.remiseMax === undefined) d.remiseMax = null;
      if (d.reference === undefined) d.reference = "";
      // Pour les anciens, si pas de categorieId, laisse vide
      await tx.table("designations").put(d);
    }
  });

window.db
  .version(3)
  .stores({
    taxes: "++id, nom, taux, type",
    unites: "++id, nom, abreviation",
    clients: "++id, nom, email",
    fournisseurs: "++id, nom, email",
    categories: "++id, nom",
    designations:
      "++id, nom, uniteId, prix, prixMin, type, reference, categorieId",
    factures:
      "++id, numero, clientId, date, type, objet, garantie, validiteOffre, delaisLivraison, delaisExecution, conditionPaiement, lignes, totalHT, totalTVA, totalTTC",
    bons_commandes: "++id, numero, fournisseurId, date, lignes, total",
    settings:
      "id, theme, sidebarColor, devisePrincipale, devises, tauxConversion, facturePrefix, factureIncrement",
  })
  .upgrade(async (tx) => {
    // Migration des factures existantes
    const factures = await tx.table("factures").toArray();
    for (const f of factures) {
      if (!f.type) f.type = "normale";
      if (!f.objet) f.objet = "";
      if (!f.garantie) f.garantie = "";
      if (!f.validiteOffre) f.validiteOffre = "";
      if (!f.delaisLivraison) f.delaisLivraison = "";
      if (!f.delaisExecution) f.delaisExecution = "";
      if (!f.conditionPaiement) f.conditionPaiement = "";
      await tx.table("factures").put(f);
    }

    // Migration des taxes existantes
    const taxes = await tx.table("taxes").toArray();
    for (const t of taxes) {
      if (!t.type) t.type = "TVA";
      await tx.table("taxes").put(t);
    }

    // Migration des désignations
    const designations = await tx.table("designations").toArray();
    for (const d of designations) {
      if (d.remiseMax !== undefined && d.prixMin === undefined) {
        d.prixMin = d.remiseMax;
        delete d.remiseMax;
      }
      if (!d.prixMin) d.prixMin = null;
      await tx.table("designations").put(d);
    }
  });

window.db
  .version(4)
  .stores({
    taxes: "++id, nom, taux, type",
    unites: "++id, nom, abreviation",
    clients: "++id, nom, email",
    fournisseurs: "++id, nom, email",
    categories: "++id, nom",
    designations:
      "++id, nom, uniteId, prix, prixMin, type, reference, categorieId",
    factures:
      "++id, numero, clientId, date, type, objet, garantie, validiteOffre, delaisLivraison, delaisExecution, conditionPaiement, lignes, totalHT, totalTVA, totalTTC",
    bons_commandes: "++id, numero, fournisseurId, date, lignes, total",
    settings:
      "id, theme, sidebarColor, devisePrincipale, devises, tauxConversion, facturePrefix, factureIncrement, modeleFacture",
  })
  .upgrade(async (tx) => {
    // Ajoute le champ modeleFacture aux settings existants
    const settings = await tx.table("settings").toArray();
    for (const s of settings) {
      if (!s.modeleFacture) s.modeleFacture = "modele1";
      await tx.table("settings").put(s);
    }
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
