// src/pages/pages.js
// Ce fichier sert de point d'entrée pour charger toutes les pages

// Vérification que helpers est chargé
if (!window.helpers) {
  throw new Error(
    "helpers.js must be loaded before pages.js. window.helpers is undefined."
  );
}

// Note: Les pages individuelles sont maintenant chargées via des fichiers séparés
// Dashboard.js, Clients.js, Fournisseurs.js, Taxes.js, Unites.js, Categories.js,
// Designations.js, Factures.js, BonsCommandes.js, Parametres.js, ImportExport.js

console.log("Pages loading system initialized");
