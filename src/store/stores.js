// src/store/clientsStore.js
window.clientsStore = {
  getAll: () => db.clients.toArray(),
  add: (client) => db.clients.add(client),
  update: (id, data) => db.clients.update(id, data),
  delete: (id) => db.clients.delete(id),
  bulkAdd: (arr) => db.clients.bulkAdd(arr),
  findById: (id) => db.clients.get(id),
};
// src/store/taxesStore.js
window.taxesStore = {
  getAll: () => db.taxes.toArray(),
  add: (taxe) => db.taxes.add(taxe),
  update: (id, data) => db.taxes.update(id, data),
  delete: (id) => db.taxes.delete(id),
  bulkAdd: (arr) => db.taxes.bulkAdd(arr),
  findById: (id) => db.taxes.get(id),
};
// src/store/facturesStore.js
window.facturesStore = {
  getAll: () => db.factures.toArray(),
  add: (facture) => db.factures.add(facture),
  update: (id, data) => db.factures.update(id, data),
  delete: (id) => db.factures.delete(id),
  bulkAdd: (arr) => db.factures.bulkAdd(arr),
  findById: (id) => db.factures.get(id),
};
// src/store/unitesStore.js
window.unitesStore = {
  getAll: () => db.unites.toArray(),
  add: (unite) => db.unites.add(unite),
  update: (id, data) => db.unites.update(id, data),
  delete: (id) => db.unites.delete(id),
  bulkAdd: (arr) => db.unites.bulkAdd(arr),
  findById: (id) => db.unites.get(id),
};
// src/store/categoriesStore.js
window.categoriesStore = {
  getAll: () => db.categories.toArray(),
  add: (cat) => db.categories.add(cat),
  update: (id, data) => db.categories.update(id, data),
  delete: (id) => db.categories.delete(id),
  bulkAdd: (arr) => db.categories.bulkAdd(arr),
  findById: (id) => db.categories.get(id),
};
// src/store/designationsStore.js
window.designationsStore = {
  getAll: () => db.designations.toArray(),
  add: (des) => db.designations.add(des),
  update: (id, data) => db.designations.update(id, data),
  delete: (id) => db.designations.delete(id),
  bulkAdd: (arr) => db.designations.bulkAdd(arr),
  findById: (id) => db.designations.get(id),
};
// src/store/fournisseursStore.js
window.fournisseursStore = {
  getAll: () => db.fournisseurs.toArray(),
  add: (f) => db.fournisseurs.add(f),
  update: (id, data) => db.fournisseurs.update(id, data),
  delete: (id) => db.fournisseurs.delete(id),
  bulkAdd: (arr) => db.fournisseurs.bulkAdd(arr),
  findById: (id) => db.fournisseurs.get(id),
};
// src/store/bonsCommandesStore.js
window.bonsCommandesStore = {
  getAll: () => db.bons_commandes.toArray(),
  add: (b) => db.bons_commandes.add(b),
  update: (id, data) => db.bons_commandes.update(id, data),
  delete: (id) => db.bons_commandes.delete(id),
  bulkAdd: (arr) => db.bons_commandes.bulkAdd(arr),
  findById: (id) => db.bons_commandes.get(id),
};

// src/store/fluxStockStore.js
window.fluxStockStore = {
  getAll: () => db.flux_stock.toArray(),
  add: (flux) => db.flux_stock.add(flux),
  update: (id, data) => db.flux_stock.update(id, data),
  delete: (id) => db.flux_stock.delete(id),
  bulkAdd: (arr) => db.flux_stock.bulkAdd(arr),
  findById: (id) => db.flux_stock.get(id),
  // Récupérer tous les flux d'une désignation
  getByDesignation: (designationId) =>
    db.flux_stock.where("designationId").equals(designationId).toArray(),
  // Calculer le stock actuel d'un produit
  getStockActuel: async (designationId) => {
    const flux = await db.flux_stock
      .where("designationId")
      .equals(designationId)
      .toArray();
    let stock = 0;
    for (const f of flux) {
      if (f.type === "entree") {
        stock += f.quantite;
      } else if (f.type === "sortie") {
        stock -= f.quantite;
      }
    }
    return stock;
  },
};

// src/store/settingsStore.js

// EventBus simple pour la propagation
window.settingsEventBus = {
  emit(event, detail) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  },
  on(event, handler) {
    window.addEventListener(event, handler);
  },
  off(event, handler) {
    window.removeEventListener(event, handler);
  },
};

// Store settings réactif avec Proxy
window.settingsStore = new Proxy(
  {
    async get() {
      return await db.settings.toCollection().first();
    },
    async update(id, data) {
      await db.settings.update(id, data);
      // Émission d'un événement global pour chaque clé modifiée
      Object.keys(data).forEach((key) => {
        window.settingsEventBus.emit("settings-changed", {
          key,
          value: data[key],
        });
      });
    },
    async setAll(data) {
      // Pour mise à jour groupée (ex: lors du save dans ParametresPage)
      let settings = await db.settings.toCollection().first();
      if (!settings) settings = { id: 1 };
      Object.assign(settings, data);
      await db.settings.put(settings);
      Object.keys(data).forEach((key) => {
        window.settingsEventBus.emit("settings-changed", {
          key,
          value: data[key],
        });
      });
    },
  },
  {
    set(target, prop, value) {
      // Optionnel : permet d'utiliser settingsStore.x = y
      target[prop] = value;
      window.settingsEventBus.emit("settings-changed", { key: prop, value });
      return true;
    },
  }
);
