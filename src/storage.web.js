// Веб-версия сохранений: IndexedDB (localStorage слишком мал для мира игры)
import { getState } from './engine/rng';

const DB = 'brovka';
const STORE = 'saves';
const KEY = 'main';

function open() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    const req = fn(st);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function saveGame(W) {
  try {
    W.rng = getState();
    const s = JSON.stringify({ ...W, _stop: false });
    await tx('readwrite', (st) => st.put(s, KEY));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}
export async function loadGame() {
  try {
    const s = await tx('readonly', (st) => st.get(KEY));
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}
export async function hasSave() {
  try {
    const s = await tx('readonly', (st) => st.count(KEY));
    return s > 0;
  } catch {
    return false;
  }
}
export async function deleteSave() {
  try {
    await tx('readwrite', (st) => st.delete(KEY));
  } catch {}
}
