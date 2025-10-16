// scripts/storage.js
export const KEY_RECORDS = "bnv:records:v1";
export const KEY_SETTINGS = "bnv:settings:v1";

export function loadRecords(){
  try {
    return JSON.parse(localStorage.getItem(KEY_RECORDS) || "[]");
  } catch (e) {
    console.error("Load records error", e);
    return [];
  }
}
export function saveRecords(records){
  try {
    localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  } catch(e){
    console.error("Save records error", e);
  }
}
export function loadSettings(){
  try {
    return JSON.parse(localStorage.getItem(KEY_SETTINGS) || "{}");
  } catch(e){
    return {};
  }
}
export function saveSettings(settings){
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch(e){
    console.error(e);
  }
}

export async function loadSeed(url = "seed.json"){
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error("Seed fetch failed");
    const data = await res.json();
    return data;
  } catch(e) {
    console.warn("Seed load failed", e);
    return [];
  }
}
