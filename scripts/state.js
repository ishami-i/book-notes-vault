// scripts/state.js
import { loadRecords, saveRecords, loadSettings, saveSettings } from "./storage.js";

function genId() {
  return "rec_" + Math.random().toString(36).slice(2,10);
}

const listeners = new Set();

export const State = {
  records: loadRecords(),
  settings: Object.assign({ goal: 0, unit: "pages" }, loadSettings()),

  subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); },
  notify(){ listeners.forEach(fn => fn(this)); },

  add(record){
    const now = new Date().toISOString();
    const rec = Object.assign({
      id: genId(),
      createdAt: now,
      updatedAt: now
    }, record);
    this.records.push(rec);
    saveRecords(this.records);
    this.notify();
    return rec;
  },

  update(id, changes){
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.records[idx] = Object.assign({}, this.records[idx], changes, { updatedAt: new Date().toISOString() });
    saveRecords(this.records);
    this.notify();
    return this.records[idx];
  },

  remove(id){
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.records.splice(idx,1);
    saveRecords(this.records);
    this.notify();
    return true;
  },

  setRecords(arr){
    this.records = arr;
    saveRecords(this.records);
    this.notify();
  },

  setSettings(s){
    this.settings = Object.assign(this.settings, s);
    saveSettings(this.settings);
    this.notify();
  },

  exportJSON(){
    return JSON.stringify({ records: this.records, settings: this.settings }, null, 2);
  },

  importJSON(raw){
    try {
      const data = JSON.parse(raw);
      if(!Array.isArray(data.records)) throw new Error("Invalid records array");
      this.records = data.records;
      this.settings = data.settings || this.settings;
      saveRecords(this.records);
      saveSettings(this.settings);
      this.notify();
      return true;
    } catch(e) {
      console.error("Import failed", e);
      return false;
    }
  },

  clearAll(){
    this.records = [];
    this.settings = { goal: 0, unit: "pages" };
    saveRecords(this.records);
    saveSettings(this.settings);
    this.notify();
  },

  // stats helpers
  totalPages(){
    return this.records.reduce((s,r) => s + (Number(r.pages) || 0), 0);
  },

  topTags(limit = 3){
    const counts = this.records.reduce((m,r) => {
      const t = (r.tag || "Untagged").trim();
      m[t] = (m[t]||0) + 1;
      return m;
    }, {});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(e => ({tag:e[0],count:e[1]}));
  },

  weeklyTrend(){ // simple last-7-days sum by date
    const arr = new Array(7).fill(0);
    const today = new Date();
    for (const r of this.records){
      const d = new Date(r.dateAdded);
      const diff = Math.floor((today - d)/(1000*60*60*24));
      if (diff >=0 && diff < 7) arr[6-diff] += Number(r.pages) || 0;
    }
    return arr;
  }
};
