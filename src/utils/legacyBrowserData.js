// Reads the data the old browser-only version stored in IndexedDB ("PartyManagerDB"),
// so it can be copied into MySQL once through the Backup & Restore page.
const LEGACY_DB_NAME = 'PartyManagerDB';
const LEGACY_STORES = ['salespersons', 'parties', 'machines', 'quotations', 'events'];

const readStore = (db, name) =>
    new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(name)) return resolve([]);
        const request = db.transaction(name, 'readonly').objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });

// Resolves to null when this browser has no old database.
export async function readLegacyBrowserData() {
    const exists = typeof indexedDB.databases === 'function'
        ? (await indexedDB.databases()).some((d) => d.name === LEGACY_DB_NAME)
        : true;
    if (!exists) return null;

    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(LEGACY_DB_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    try {
        const data = {};
        for (const name of LEGACY_STORES) data[name] = await readStore(db, name);
        return data;
    } finally {
        db.close();
    }
}
