// Estado do app + persistência local (localStorage) + sincronização opcional (Firebase).
import { EXERCISES } from './data/exercises.js';
import { DEFAULT_PLAN } from './data/plan.js';

const KEY = 'treino-titan:v1';

const listeners = new Set();
let syncHook = null; // definido por firebase.js

export const state = load();

function fresh() {
  return {
    version: 1,
    activePlanId: DEFAULT_PLAN.id,
    plans: [JSON.parse(JSON.stringify(DEFAULT_PLAN))],
    customExercises: [],
    logs: {}, // { 'YYYY-MM-DD': { planId, dayKey, sets: { exId: [{kg, reps}] } } }
    updatedAt: 0,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.plans && s.plans.length) return s;
    }
  } catch (e) { /* ignora */ }
  return fresh();
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setSyncHook(fn) { syncHook = fn; }

export function save({ silent = false } = {}) {
  state.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* cheio/privado */ }
  if (syncHook) syncHook(snapshot());
  if (!silent) listeners.forEach((fn) => fn());
}

export function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

// Aplica um estado vindo da nuvem (mais novo vence)
export function applyRemote(remote) {
  if (!remote || !remote.plans || (remote.updatedAt || 0) <= (state.updatedAt || 0)) return false;
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, remote);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
  listeners.forEach((fn) => fn());
  return true;
}

export function replaceAll(next) {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  save();
}

// ---------- helpers de exercícios ----------
export function allExercises() {
  return [...EXERCISES, ...state.customExercises];
}
const exMap = () => new Map(allExercises().map((e) => [e.id, e]));
export function getExercise(id) { return exMap().get(id); }

export function addCustomExercise(ex) {
  const id = 'custom-' + Date.now().toString(36);
  state.customExercises.push({ ...ex, id, custom: true });
  save();
  return id;
}
export function deleteCustomExercise(id) {
  state.customExercises = state.customExercises.filter((e) => e.id !== id);
  // remove de todos os cronogramas
  for (const p of state.plans) for (const d of Object.values(p.days)) {
    d.items = d.items.filter((i) => i.exId !== id);
  }
  save();
}

// ---------- helpers de cronograma ----------
export function activePlan() {
  return state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
}
export function setActivePlan(id) { state.activePlanId = id; save(); }
export function addPlan(plan) { state.plans.push(plan); state.activePlanId = plan.id; save(); }
export function deletePlan(id) {
  if (state.plans.length <= 1) return false;
  state.plans = state.plans.filter((p) => p.id !== id);
  if (state.activePlanId === id) state.activePlanId = state.plans[0].id;
  save();
  return true;
}
export function resetDefaultPlan() {
  const i = state.plans.findIndex((p) => p.id === DEFAULT_PLAN.id);
  const copy = JSON.parse(JSON.stringify(DEFAULT_PLAN));
  if (i >= 0) state.plans[i] = copy; else state.plans.unshift(copy);
  save();
}

// ---------- logs (carga usada) ----------
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function logSet(exId, setIndex, kg, reps, dayKey) {
  const k = todayKey();
  const log = (state.logs[k] ||= { planId: state.activePlanId, dayKey, sets: {} });
  (log.sets[exId] ||= [])[setIndex] = { kg, reps };
  save({ silent: true });
}

// Última carga registrada para o exercício (antes de hoje ou hoje)
export function lastLog(exId) {
  const dates = Object.keys(state.logs).sort().reverse();
  for (const d of dates) {
    const sets = state.logs[d].sets[exId];
    if (sets && sets.some(Boolean)) {
      const best = sets.filter(Boolean).reduce((a, b) => (Number(b.kg) > Number(a.kg) ? b : a));
      return { date: d, ...best };
    }
  }
  return null;
}
