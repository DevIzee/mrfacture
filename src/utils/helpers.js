// src/utils/helpers.js
window.helpers = {
  generateId: () => Math.random().toString(36).substr(2, 9),
  formatMontant: (val, devise = 'EUR') => {
    if (typeof val !== 'number') return '--';
    return val.toLocaleString('fr-FR', { style: 'currency', currency: devise });
  },
  formatDate: (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('fr-FR');
  },
  getNextNumero: async (type) => {
    // type: 'facture' ou 'bon_commande'
    const settings = await db.settings.toCollection().first();
    let prefix = type === 'facture' ? settings.facturePrefix : 'BC';
    let increment = type === 'facture' ? settings.factureIncrement : 1;
    return prefix + String(increment).padStart(4, '0');
  },
  updateNumero: async (type) => {
    const settings = await db.settings.toCollection().first();
    if (type === 'facture') {
      await db.settings.update(settings.id, { factureIncrement: settings.factureIncrement + 1 });
    }
    // étendre pour d'autres types si besoin
  },
  devisePrincipale: async () => {
    const settings = await db.settings.toCollection().first();
    return settings.devisePrincipale || 'EUR';
  },
  tauxConversion: async (devise) => {
    const settings = await db.settings.toCollection().first();
    return settings.tauxConversion?.[devise] || 1;
  }
};
