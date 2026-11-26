// Estado do app + persistência local (localStorage) + sincronização opcional (Firebase).
import { EXERCISES, COMPOUND_IDS } from './data/exercises.js';
import { DEFAULT_PLAN, clonePlan } from './data/plan.js';

const KEY = 'treino-titan:v1';

const listeners = new Set();
let syncHook = null; // definido por firebase.js

export const state = load();

function fresh() {
  return migrate({
    version: 2,
    activePlanId: DEFAULT_PLAN.id,
    plans: [JSON.parse(JSON.stringify(DEFAULT_PLAN))],
    customExercises: [],
    logs: {}, // { 'YYYY-MM-DD': { planId, dayKey, done, sets: { exId: [{kg, reps}] } } }
    body: [], // [{ date, kg, cintura, braco, peito, coxa }]
    goalKg: null,
    weeklyGoal: 6,
    updatedAt: 0,
  });
}

// Garante que dados antigos (salvos antes dos novos recursos) ganhem os campos novos
function migrate(s) {
  s.version = 2;
  s.body ||= [];
  s.logs ||= {};
  s.customExercises ||= [];
  if (s.goalKg === undefined) s.goalKg = null;
  if (!s.weeklyGoal) s.weeklyGoal = 6;
  for (const p of s.plans) ensureCycle(p);
  return s;
}

function ensureCycle(p) {
  if (!p.cycleStart) p.cycleStart = todayKey();
  if (!p.cycleMonths) p.cycleMonths = 6;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.plans && s.plans.length) return migrate(s);
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
  Object.assign(state, migrate(remote));
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
  listeners.forEach((fn) => fn());
  return true;
}

export function replaceAll(next) {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, migrate(next));
  save();
}

// ---------- helpers de exercícios ----------
export function allExercises() {
  return [...EXERCISES, ...state.customExercises];
}
const exMap = () => new Map(allExercises().map((e) => [e.id, e]));
export function getExercise(id) { return exMap().get(id); }
export const isCompound = (ex) => COMPOUND_IDS.has(ex.id) || !!ex.compound;

export function addCustomExercise(ex) {
  const id = 'custom-' + Date.now().toString(36);
  state.customExercises.push({ ...ex, id, custom: true });
  save();
  return id;
}
export function deleteCustomExercise(id) {
  state.customExercises = state.customExercises.filter((e) => e.id !== id);
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
export function addPlan(plan) { ensureCycle(plan); state.plans.push(plan); state.activePlanId = plan.id; save(); }
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
  ensureCycle(copy);
  if (i >= 0) state.plans[i] = copy; else state.plans.unshift(copy);
  save();
}

// ---------- ciclo (duração do cronograma) ----------
const parseDate = (s) => new Date(s + 'T00:00:00');
const DAY_MS = 86400000;

export function cycleInfo(plan, now = new Date()) {
  const start = parseDate(plan.cycleStart || todayKey());
  const end = new Date(start.getFullYear(), start.getMonth() + (plan.cycleMonths || 6), start.getDate());
  const today = parseDate(todayKey(now));
  const total = Math.max(1, Math.round((end - start) / DAY_MS));
  const elapsed = Math.max(0, Math.round((today - start) / DAY_MS));
  const remaining = Math.round((end - today) / DAY_MS);
  return {
    start: plan.cycleStart, end: todayKey(end), total, elapsed, remaining,
    pct: Math.min(100, Math.round((elapsed / total) * 100)),
    month: Math.min(plan.cycleMonths || 6, Math.floor(elapsed / (total / (plan.cycleMonths || 6))) + 1),
    months: plan.cycleMonths || 6,
    expired: remaining <= 0,
  };
}

// Gera uma cópia do cronograma trocando os exercícios NÃO fixos por outros do mesmo grupo
// (preferindo o mesmo tipo: composto/isolado, e exercícios que ainda não estavam no plano).
export function rotatePlan(plan, newName, rnd = Math.random) {
  const copy = clonePlan(plan, newName);
  const all = allExercises();
  const usedBefore = new Set();
  for (const d of Object.values(plan.days)) for (const it of d.items) usedBefore.add(it.exId);
  const pickFrom = (arr) => arr[Math.floor(rnd() * arr.length)];
  let changed = 0;

  for (const day of Object.values(copy.days)) {
    const inDay = new Set(day.items.map((i) => i.exId));
    for (const it of day.items) {
      if (it.pin) continue;
      const cur = all.find((e) => e.id === it.exId);
      if (!cur || cur.group === 'cardio') continue;
      const base = all.filter((e) => e.group === cur.group && !inDay.has(e.id));
      const sameType = (arr) => arr.filter((e) => isCompound(e) === isCompound(cur));
      const fresh = base.filter((e) => !usedBefore.has(e.id));
      const pool = [sameType(fresh), fresh, sameType(base), base].find((a) => a.length);
      if (!pool) continue;
      const next = pickFrom(pool);
      inDay.delete(it.exId);
      it.exId = next.id;
      inDay.add(next.id);
      changed += 1;
    }
  }
  copy.cycleStart = null; // addPlan() inicia o novo ciclo hoje
  copy.rotatedCount = changed;
  return copy;
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

// Última carga registrada para o exercício
export function lastLog(exId) {
  const dates = Object.keys(state.logs).sort().reverse();
  for (const d of dates) {
    const sets = state.logs[d].sets?.[exId];
    if (sets && sets.some(Boolean)) {
      const best = sets.filter(Boolean).reduce((a, b) => (Number(b.kg) > Number(a.kg) ? b : a));
      return { date: d, ...best };
    }
  }
  return null;
}

// Histórico de um exercício: melhor série por data (com 1RM estimado, fórmula de Epley)
export function exerciseHistory(exId) {
  const out = [];
  for (const d of Object.keys(state.logs).sort()) {
    const sets = (state.logs[d].sets?.[exId] || []).filter((s) => s && Number(s.kg) > 0 && Number(s.reps) > 0);
    if (!sets.length) continue;
    const e1 = (s) => Number(s.kg) * (1 + Number(s.reps) / 30);
    const best = sets.reduce((a, b) => (e1(b) > e1(a) ? b : a));
    out.push({ date: d, kg: Number(best.kg), reps: Number(best.reps), e1rm: Math.round(e1(best) * 10) / 10 });
  }
  return out;
}
export function loggedExerciseIds() {
  const ids = new Set();
  for (const l of Object.values(state.logs)) for (const id of Object.keys(l.sets || {})) ids.add(id);
  return [...ids];
}

// ---------- treino concluído / meta semanal ----------
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function setDone(dayKey, flag = true) {
  const mon = todayKey(mondayOf());
  if (flag) {
    const k = todayKey();
    const log = (state.logs[k] ||= { planId: state.activePlanId, dayKey, sets: {} });
    log.dayKey = dayKey;
    log.done = true;
  } else {
    for (const [d, l] of Object.entries(state.logs)) {
      if (d >= mon && l.dayKey === dayKey && l.done) l.done = false;
    }
  }
  save();
}

export function weekDoneDays(date = new Date()) {
  const mon = mondayOf(date);
  const from = todayKey(mon);
  const to = todayKey(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6));
  const days = new Set();
  const dates = new Set();
  for (const [d, l] of Object.entries(state.logs)) {
    if (l.done && d >= from && d <= to) { days.add(l.dayKey); dates.add(d); }
  }
  return { days, count: dates.size };
}

// Treinos concluídos nas últimas N semanas (mais antiga primeiro)
export function weeklyHistory(n = 8, now = new Date()) {
  const mon = mondayOf(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const a = todayKey(start), b = todayKey(end);
    const count = Object.entries(state.logs).filter(([d, l]) => l.done && d >= a && d <= b).length;
    out.push({ week: a, count });
  }
  return out;
}

// ---------- peso corporal e medidas ----------
export function saveBody(entry) {
  const i = state.body.findIndex((b) => b.date === entry.date);
  if (i >= 0) state.body[i] = { ...state.body[i], ...entry }; else state.body.push(entry);
  state.body.sort((a, b) => a.date.localeCompare(b.date));
  save();
}
export function deleteBody(date) {
  state.body = state.body.filter((b) => b.date !== date);
  save();
}
