// Imagens dos exercícios.
// Fonte: free-exercise-db (domínio público, Unlicense) — https://github.com/yuhonas/free-exercise-db
// O app baixa o índice uma vez, casa pelo nome em inglês (campo `en`) e usa a primeira foto.
// Sem internet ou sem correspondência: mostra um emoji do grupo muscular.
// Exercícios personalizados podem ter `image` (URL colada por você).

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/';
const INDEX_URL = BASE + 'dist/exercises.json';
const CACHE_KEY = 'treino-titan:imgindex:v1';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

let index = null;       // Map(nomeNormalizado -> { id, images:[...], name, instructions, primaryMuscles })
let list = [];          // lista completa (para busca/explorar)
let loading = null;

export function imagesReady() { return !!index; }

export function loadImageIndex() {
  if (loading) return loading;
  loading = (async () => {
    try {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { /* ignora */ }
      if (!data) {
        const res = await fetch(INDEX_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const full = await res.json();
        // guarda só o necessário para caber no localStorage
        data = full.map((x) => ({ id: x.id, n: x.name, i: (x.images || []).slice(0, 2), m: x.primaryMuscles }));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* cheio */ }
      }
      list = data;
      index = new Map(data.map((x) => [norm(x.n), x]));
    } catch (e) {
      index = new Map(); // offline: segue sem fotos
    }
    return index;
  })();
  return loading;
}

export function imageFor(ex) {
  if (ex.image) return ex.image;
  if (!index) return null;
  const hit = index.get(norm(ex.en));
  if (!hit || !hit.i.length) return null;
  return BASE + 'exercises/' + hit.i[0];
}

export function secondImageFor(ex) {
  if (!index || ex.image) return null;
  const hit = index.get(norm(ex.en));
  if (!hit || hit.i.length < 2) return null;
  return BASE + 'exercises/' + hit.i[1];
}

// Busca na base completa (800+) para o usuário importar um exercício novo
export function searchDb(q, muscles = null, limit = 40) {
  const nq = norm(q);
  return list
    .filter((x) => (!muscles || (x.m || []).some((m) => muscles.includes(m))) && (!nq || norm(x.n).includes(nq)))
    .slice(0, limit)
    .map((x) => ({ en: x.n, image: x.i[0] ? BASE + 'exercises/' + x.i[0] : null, muscles: x.m }));
}
