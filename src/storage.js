import AsyncStorage from '@react-native-async-storage/async-storage';
import { getState } from './engine/rng';

const KEY = 'brovka_save_v1';
const round = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10) / 10 : v);

export async function saveGame(W) {
  try {
    W.rng = getState();
    const clean = { ...W, _stop: false };
    await AsyncStorage.setItem(KEY, JSON.stringify(clean, round));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export async function loadGame() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

export async function hasSave() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return !!s;
  } catch {
    return false;
  }
}

export async function deleteSave() {
  await AsyncStorage.removeItem(KEY);
}
