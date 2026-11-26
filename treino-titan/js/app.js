import {
  state, onChange, save, allExercises, getExercise, addCustomExercise, deleteCustomExercise,
  activePlan, setActivePlan, addPlan, deletePlan, resetDefaultPlan, replaceAll, snapshot,
  logSet, lastLog, todayKey, cycleInfo, rotatePlan, setDone, weekDoneDays,
} from './store.js';
import { GROUPS, GROUP_ORDER, GROUP_TO_DB, DAY_KEYS, DAY_LABELS, DAY_FULL } from './data/exercises.js';
import { clonePlan, blankPlan } from './data/plan.js';
import { loadImageIndex, imageFor, secondImageFor, searchDb } from './images.js';
import { renderProgress } from './progress.js';
import { initFirebase, onStatus, getStatus, signIn, signOutUser } from './firebase.js';

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const modal = $('#modal');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dBR = (d) => String(d).split('-').reverse().join('/');
const jsDayToKey = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const todayDayKey = () => jsDayToKey[new Date().getDay()];

const ui = {
  tab: 'semana',
  day: todayDayKey() === 'dom' ? 'seg' : todayDayKey(),
  libGroup: 'todos',
  libQuery: '',
};

// ---------- util ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

function openSheet(html, { onMount, wide } = {}) {
  modal.innerHTML = `<div class="sheet"${wide ? ' style="max-width:900px"' : ''}>${html}</div>`;
  modal.classList.remove('hidden');
  modal.onclick = (e) => { if (e.target === modal) closeSheet(); };
  const closeBtn = modal.querySelector('[data-close]');
  if (closeBtn) closeBtn.onclick = closeSheet;
  if (onMount) onMount(modal.querySelector('.sheet'));
}
function closeSheet() {
  modal.classList.add('hidden');
  modal.innerHTML = '';
  modal.onclick = null;
}

function thumb(ex, cls = 'img') {
  const src = imageFor(ex);
  const icon = GROUPS[ex.group]?.icon || '🏋️';
  return src
    ? `<div class="${cls}"><img loading="lazy" src="${esc(src)}" alt="" onerror="this.parentNode.textContent='${icon}'"></div>`
    : `<div class="${cls}">${icon}</div>`;
}

// ---------- navegação ----------
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  ui.tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  render();
  window.scrollTo({ top: 0 });
});

function render() {
  $('#plan-name').textContent = activePlan().name;
  view.onclick = null;
  ({ semana: renderWeek, progresso: () => renderProgress(view, toast), biblioteca: renderLibrary, cronogramas: renderPlans, conta: renderAccount }[ui.tab])();
}

onChange(() => { if (modal.classList.contains('hidden') || ui.tab !== 'semana') render(); });

// =====================================================
// SEMANA
// =====================================================
function renderWeek() {
  const plan = activePlan();
  const day = plan.days[ui.day];
  const today = todayDayKey();
  const wk = weekDoneDays();
  const ci = cycleInfo(plan);
  const goal = state.weeklyGoal;
  const dayDone = wk.days.has(ui.day);

  const pills = DAY_KEYS.map((k) => `
    <button class="day ${k === ui.day ? 'on' : ''} ${k === today ? 'today' : ''} ${wk.days.has(k) ? 'done' : ''}" data-day="${k}">
      <b>${DAY_LABELS[k]}</b><small>${esc((plan.days[k].title || '').split(/[+(]/)[0].trim().slice(0, 9))}</small>
    </button>`).join('');

  const chips = day.groups.map((g) => `<span class="chip">${GROUPS[g]?.icon || ''} ${esc(GROUPS[g]?.label || g)}</span>`).join('');

  const cards = day.items.map((it, i) => {
    const ex = getExercise(it.exId);
    if (!ex) return '';
    const last = lastLog(it.exId);
    return `
    <div class="card ex" data-i="${i}">
      ${thumb(ex)}
      <div class="body">
        <div class="name">${esc(ex.name)}</div>
        <div><span class="badge hot">${it.sets} × ${esc(it.reps)}</span>${it.pin ? '<span class="badge pin">📌 fixo</span>' : ''}${it.rest ? `<span class="badge">⏱ ${it.rest}s</span>` : ''}</div>
        <div class="meta">${esc(ex.foco || ex.equip || '')}${last ? ` • última: ${esc(last.kg)}kg×${esc(last.reps)}` : ''}</div>
        <div class="actions">
          <button class="btn" data-act="info">Ver</button>
          <button class="btn" data-act="swap">Trocar</button>
          <button class="btn" data-act="edit">Editar</button>
          <button class="btn" data-act="pin" title="Fixar: não muda ao gerar novo ciclo">${it.pin ? '📌' : '📍'}</button>
          <button class="btn danger" data-act="del">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');

  view.innerHTML = `
    <div class="card ${ci.expired ? 'banner' : ''}">
      <div class="row"><b>Semana: ${wk.count}/${goal} treinos</b><span class="grow"></span><button class="btn" id="cycle-btn">⚙ Ciclo</button></div>
      <div class="progress" style="margin:8px 0 6px"><i style="width:${Math.min(100, Math.round((wk.count / goal) * 100))}%"></i></div>
      <div class="muted small">${ci.expired
        ? `⏰ Ciclo de ${ci.months} meses concluído. Hora de renovar os exercícios!`
        : `Ciclo: mês ${ci.month} de ${ci.months} • faltam ${ci.remaining} dias (até ${dBR(ci.end)})`}</div>
      ${ci.expired ? '<button class="btn primary big" id="new-cycle" style="margin-top:8px">🔄 Gerar novo ciclo</button>' : ''}
    </div>
    <div class="days" id="days">${pills}</div>
    <div class="day-head">
      <div>
        <div class="title">${esc(day.title)}</div>
        <div class="muted small">${DAY_FULL[ui.day]} • ${day.items.length} exercícios</div>
      </div>
      <div class="row">
        <button class="btn ${dayDone ? 'primary' : ''}" id="done-day">${dayDone ? '✓ Feito' : 'Concluir'}</button>
        <button class="btn" id="edit-day">✎</button>
      </div>
    </div>
    <div class="chips">${chips}</div>
    ${day.items.length ? '' : '<div class="empty card">Nenhum exercício neste dia.<br>Toque em “+ Adicionar exercício”.</div>'}
    ${cards}
    <div class="row" style="margin-top:6px">
      <button class="btn grow" id="add-ex">+ Adicionar exercício</button>
    </div>
    ${day.items.length ? '<div style="margin-top:12px"><button class="btn primary big" id="start">▶ Iniciar treino</button></div>' : ''}
    ${plan.notes ? `<p class="muted small" style="margin-top:16px">📝 ${esc(plan.notes)}</p>` : ''}
  `;

  $('#days').onclick = (e) => {
    const b = e.target.closest('[data-day]');
    if (b) { ui.day = b.dataset.day; renderWeek(); }
  };
  $('#edit-day').onclick = () => editDaySheet();
  $('#done-day').onclick = () => setDone(ui.day, !dayDone);
  $('#cycle-btn').onclick = () => cycleSheet();
  const nc = $('#new-cycle');
  if (nc) nc.onclick = () => newCycle();
  $('#add-ex').onclick = () => pickExercise({ dayGroups: day.groups }, (exId) => {
    day.items.push({ exId, sets: 3, reps: '10-12', rest: 60 });
    save();
  });
  const startBtn = $('#start');
  if (startBtn) startBtn.onclick = () => startWorkout();

  view.querySelectorAll('.ex').forEach((card) => {
    card.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const i = Number(card.dataset.i);
      const it = day.items[i];
      const act = b.dataset.act;
      if (act === 'info') detailSheet(it.exId);
      if (act === 'swap') pickExercise({ dayGroups: day.groups, current: it.exId }, (exId) => { it.exId = exId; save(); toast('Exercício trocado'); });
      if (act === 'edit') editItemSheet(it);
      if (act === 'pin') { it.pin = !it.pin; if (!it.pin) delete it.pin; save(); toast(it.pin ? 'Fixo: não muda na rotação' : 'Pode mudar na rotação'); }
      if (act === 'del') { day.items.splice(i, 1); save(); }
    };
  });
}

function editItemSheet(it) {
  const ex = getExercise(it.exId);
  openSheet(`
    <div class="bar"><h3>${esc(ex?.name || 'Exercício')}</h3><button data-close>✕</button></div>
    <div class="row">
      <div class="grow"><label>Séries</label><input id="f-sets" type="number" min="1" max="12" value="${it.sets}"></div>
      <div class="grow"><label>Repetições</label><input id="f-reps" type="text" value="${esc(it.reps)}" placeholder="ex: 8-12"></div>
      <div class="grow"><label>Descanso (s)</label><input id="f-rest" type="number" min="0" step="5" value="${it.rest}"></div>
    </div>
    <label class="row" style="margin-top:12px;color:var(--text);font-size:14px"><input type="checkbox" id="f-pin" style="width:auto" ${it.pin ? 'checked' : ''}> 📌 Exercício principal (fica fixo ao gerar novo ciclo)</label>
    <div style="margin-top:14px"><button class="btn primary big" id="ok">Salvar</button></div>
  `, {
    onMount: (s) => {
      s.querySelector('#ok').onclick = () => {
        if (s.querySelector('#f-pin').checked) it.pin = true; else delete it.pin;
        it.sets = Math.max(1, Number(s.querySelector('#f-sets').value) || 1);
        it.reps = s.querySelector('#f-reps').value.trim() || '10';
        it.rest = Math.max(0, Number(s.querySelector('#f-rest').value) || 0);
        save(); closeSheet();
      };
    },
  });
}

function editDaySheet() {
  const plan = activePlan();
  const day = plan.days[ui.day];
  const sel = new Set(day.groups);
  openSheet(`
    <div class="bar"><h3>${DAY_FULL[ui.day]}</h3><button data-close>✕</button></div>
    <label>Nome do treino</label>
    <input id="f-title" type="text" value="${esc(day.title)}">
    <label>Grupos musculares do dia (definem a lista de troca)</label>
    <div class="chips" id="g-chips">
      ${GROUP_ORDER.map((g) => `<button class="chip ${sel.has(g) ? 'on' : ''}" data-g="${g}">${GROUPS[g].icon} ${GROUPS[g].label}</button>`).join('')}
    </div>
    <div style="margin-top:14px" class="row">
      <button class="btn grow" id="clear">Limpar exercícios do dia</button>
      <button class="btn primary grow" id="ok">Salvar</button>
    </div>
  `, {
    onMount: (s) => {
      s.querySelector('#g-chips').onclick = (e) => {
        const b = e.target.closest('[data-g]'); if (!b) return;
        const g = b.dataset.g;
        sel.has(g) ? sel.delete(g) : sel.add(g);
        b.classList.toggle('on');
      };
      s.querySelector('#clear').onclick = () => { if (confirm('Remover todos os exercícios deste dia?')) { day.items = []; save(); closeSheet(); } };
      s.querySelector('#ok').onclick = () => {
        day.title = s.querySelector('#f-title').value.trim() || 'Treino';
        day.groups = GROUP_ORDER.filter((g) => sel.has(g));
        save(); closeSheet();
      };
    },
  });
}

// Seletor de exercício: mostra TODOS os exercícios dos grupos do dia (e permite ver todos os grupos)
function pickExercise({ dayGroups = [], current = null }, onPick) {
  let groups = new Set(dayGroups.length ? dayGroups : GROUP_ORDER);
  let q = '';
  const body = () => {
    const list = allExercises().filter((e) => groups.has(e.group) && (!q || (e.name + ' ' + (e.foco || '')).toLowerCase().includes(q)));
    return list.length ? list.map((e) => `
      <button class="pick" data-id="${esc(e.id)}">
        ${thumb(e, 'img')}
        <div><b>${esc(e.name)}${e.id === current ? ' (atual)' : ''}</b><small>${esc(GROUPS[e.group]?.label || '')} • ${esc(e.equip || '')}${e.foco ? ' • ' + esc(e.foco) : ''}</small></div>
      </button>`).join('') : '<div class="empty">Nada encontrado.</div>';
  };
  const chips = () => GROUP_ORDER.map((g) => `<button class="chip ${groups.has(g) ? 'on' : ''}" data-g="${g}">${GROUPS[g].icon} ${GROUPS[g].label}</button>`).join('');

  openSheet(`
    <div class="bar"><h3>Escolher exercício</h3><button data-close>✕</button></div>
    <input id="q" type="search" placeholder="Buscar…">
    <div class="chips" id="chips" style="margin-top:8px">${chips()}</div>
    <div class="row" style="margin:4px 0 10px"><button class="btn ghost small" id="all">Todos os grupos</button><button class="btn ghost small" id="mine">Só os do dia</button></div>
    <div id="list">${body()}</div>
  `, {
    wide: true,
    onMount: (s) => {
      const refresh = () => { s.querySelector('#chips').innerHTML = chips(); s.querySelector('#list').innerHTML = body(); };
      s.querySelector('#q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); s.querySelector('#list').innerHTML = body(); };
      s.querySelector('#chips').onclick = (e) => {
        const b = e.target.closest('[data-g]'); if (!b) return;
        groups.has(b.dataset.g) ? groups.delete(b.dataset.g) : groups.add(b.dataset.g);
        refresh();
      };
      s.querySelector('#all').onclick = () => { groups = new Set(GROUP_ORDER); refresh(); };
      s.querySelector('#mine').onclick = () => { groups = new Set(dayGroups.length ? dayGroups : GROUP_ORDER); refresh(); };
      s.querySelector('#list').onclick = (e) => {
        const b = e.target.closest('[data-id]'); if (!b) return;
        closeSheet(); onPick(b.dataset.id);
      };
    },
  });
}

function detailSheet(exId, { allowAdd = false } = {}) {
  const ex = getExercise(exId);
  if (!ex) return;
  const a = imageFor(ex), b = secondImageFor(ex);
  const last = lastLog(exId);
  const icon = GROUPS[ex.group]?.icon || '🏋️';
  const imgs = a
    ? `<div class="${b ? 'imgs2' : ''}"><div class="detail-img"><img src="${esc(a)}" alt="" onerror="this.parentNode.textContent='${icon}'"></div>${b ? `<div class="detail-img"><img src="${esc(b)}" alt="" onerror="this.parentNode.textContent='${icon}'"></div>` : ''}</div>`
    : `<div class="detail-img">${icon}</div>`;
  openSheet(`
    <div class="bar"><h3>${esc(ex.name)}</h3><button data-close>✕</button></div>
    ${imgs}
    <div class="chips" style="margin-top:10px">
      <span class="chip on">${icon} ${esc(GROUPS[ex.group]?.label || ex.group)}</span>
      <span class="chip">${esc(ex.equip || '')}</span>
    </div>
    ${ex.foco ? `<p><b>Foco:</b> ${esc(ex.foco)}</p>` : ''}
    ${last ? `<p class="muted small">Última carga: ${esc(last.kg)} kg × ${esc(last.reps)} (${esc(last.date)})</p>` : ''}
    <div class="row" style="margin-top:12px">
      ${allowAdd ? '<button class="btn primary grow" id="add">+ Adicionar a um dia</button>' : ''}
      ${ex.custom ? '<button class="btn danger" id="del">Excluir</button>' : ''}
    </div>
  `, {
    onMount: (s) => {
      const add = s.querySelector('#add');
      if (add) add.onclick = () => addToDaySheet(exId);
      const del = s.querySelector('#del');
      if (del) del.onclick = () => { if (confirm('Excluir este exercício personalizado (some de todos os cronogramas)?')) { deleteCustomExercise(exId); closeSheet(); } };
    },
  });
}

function addToDaySheet(exId) {
  const plan = activePlan();
  openSheet(`
    <div class="bar"><h3>Adicionar a qual dia?</h3><button data-close>✕</button></div>
    ${DAY_KEYS.map((k) => `<button class="pick" data-d="${k}"><div><b>${DAY_FULL[k]}</b><small>${esc(plan.days[k].title)}</small></div></button>`).join('')}
  `, {
    onMount: (s) => {
      s.onclick = (e) => {
        const b = e.target.closest('[data-d]'); if (!b) return;
        plan.days[b.dataset.d].items.push({ exId, sets: 3, reps: '10-12', rest: 60 });
        save(); closeSheet(); toast('Adicionado a ' + DAY_FULL[b.dataset.d]);
      };
    },
  });
}

// =====================================================
// BIBLIOTECA
// =====================================================
function renderLibrary() {
  const q = ui.libQuery.toLowerCase();
  const list = allExercises().filter((e) =>
    (ui.libGroup === 'todos' || e.group === ui.libGroup) &&
    (!q || (e.name + ' ' + (e.foco || '') + ' ' + (e.equip || '')).toLowerCase().includes(q)));

  view.innerHTML = `
    <h2>Biblioteca (${allExercises().length} exercícios)</h2>
    <input id="q" type="search" placeholder="Buscar exercício…" value="${esc(ui.libQuery)}">
    <div class="chips" id="chips" style="margin:8px 0">
      <button class="chip ${ui.libGroup === 'todos' ? 'on' : ''}" data-g="todos">Todos</button>
      ${GROUP_ORDER.map((g) => `<button class="chip ${ui.libGroup === g ? 'on' : ''}" data-g="${g}">${GROUPS[g].icon} ${GROUPS[g].label}</button>`).join('')}
    </div>
    <div class="row" style="margin-bottom:10px"><button class="btn grow" id="new">+ Novo exercício</button></div>
    <div class="grid" id="grid">
      ${list.map((e) => `
        <button class="lib" data-id="${esc(e.id)}">
          ${thumb(e, 'img')}
          <div class="info"><b>${esc(e.name)}</b><small>${esc(GROUPS[e.group]?.label || '')} • ${esc(e.equip || '')}</small></div>
        </button>`).join('')}
    </div>
    ${list.length ? '' : '<div class="empty">Nada encontrado.</div>'}
  `;
  const input = $('#q');
  input.oninput = (e) => {
    ui.libQuery = e.target.value.trim();
    const pos = e.target.selectionStart;
    renderLibrary();
    const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos);
  };
  $('#chips').onclick = (e) => { const b = e.target.closest('[data-g]'); if (b) { ui.libGroup = b.dataset.g; renderLibrary(); } };
  $('#grid').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) detailSheet(b.dataset.id, { allowAdd: true }); };
  $('#new').onclick = newExerciseSheet;
}

function newExerciseSheet() {
  let image = '';
  openSheet(`
    <div class="bar"><h3>Novo exercício</h3><button data-close>✕</button></div>
    <label>Nome</label><input id="f-name" type="text" placeholder="ex: Supino com pegada neutra">
    <div class="row">
      <div class="grow"><label>Grupo</label><select id="f-group">${GROUP_ORDER.map((g) => `<option value="${g}">${GROUPS[g].label}</option>`).join('')}</select></div>
      <div class="grow"><label>Equipamento</label><input id="f-equip" type="text" placeholder="Halteres"></div>
    </div>
    <label>Foco / observação</label><input id="f-foco" type="text" placeholder="Porção superior do peitoral…">
    <label>Foto: busque na base pública (nome em inglês) ou cole uma URL</label>
    <div class="row"><input id="f-en" class="grow" type="search" placeholder="ex: incline dumbbell press"><button class="btn" id="find">Buscar</button></div>
    <div id="found" style="margin-top:8px"></div>
    <input id="f-img" type="url" placeholder="https://… (opcional)" style="margin-top:8px">
    <div style="margin-top:14px"><button class="btn primary big" id="ok">Salvar exercício</button></div>
  `, {
    onMount: (s) => {
      const found = s.querySelector('#found');
      s.querySelector('#find').onclick = async () => {
        await loadImageIndex();
        const g = s.querySelector('#f-group').value;
        const res = searchDb(s.querySelector('#f-en').value, null, 12);
        found.innerHTML = res.length ? res.map((r, i) => `
          <button class="pick" data-i="${i}">
            <div class="img">${r.image ? `<img src="${esc(r.image)}" alt="">` : '🏋️'}</div>
            <div><b>${esc(r.en)}</b><small>${esc((r.muscles || []).join(', '))}</small></div>
          </button>`).join('') : '<div class="muted small">Nada encontrado (ou sem internet).</div>';
        found.onclick = (e) => {
          const b = e.target.closest('[data-i]'); if (!b) return;
          const r = res[Number(b.dataset.i)];
          image = r.image || '';
          s.querySelector('#f-img').value = image;
          s.querySelector('#f-en').value = r.en;
          if (!s.querySelector('#f-name').value) s.querySelector('#f-name').value = r.en;
          const guess = Object.entries(GROUP_TO_DB).find(([, ms]) => (r.muscles || []).some((m) => ms.includes(m)));
          if (guess) s.querySelector('#f-group').value = guess[0];
          toast('Foto selecionada');
        };
        void g;
      };
      s.querySelector('#ok').onclick = () => {
        const name = s.querySelector('#f-name').value.trim();
        if (!name) { toast('Dê um nome ao exercício'); return; }
        addCustomExercise({
          name,
          group: s.querySelector('#f-group').value,
          equip: s.querySelector('#f-equip').value.trim() || '—',
          foco: s.querySelector('#f-foco').value.trim(),
          en: s.querySelector('#f-en').value.trim(),
          image: s.querySelector('#f-img').value.trim() || image,
        });
        closeSheet(); toast('Exercício criado');
      };
    },
  });
}

// =====================================================
// CRONOGRAMAS
// =====================================================
function renderPlans() {
  const active = activePlan();
  view.innerHTML = `
    <h2>Cronogramas</h2>
    ${state.plans.map((p) => `
      <div class="card" data-id="${esc(p.id)}">
        <div class="row">
          <div class="grow"><b>${esc(p.name)}</b>${p.id === active.id ? ' <span class="badge hot">ativo</span>' : ''}
            <div class="muted small">${Object.values(p.days).map((d) => esc(d.title)).join(' • ')}</div></div>
        </div>
        <div class="actions" style="margin-top:10px">
          ${p.id === active.id ? '' : '<button class="btn primary" data-act="use">Usar</button>'}
          <button class="btn" data-act="rename">Renomear</button>
          <button class="btn" data-act="dup">Duplicar</button>
          ${state.plans.length > 1 ? '<button class="btn danger" data-act="del">Excluir</button>' : ''}
        </div>
      </div>`).join('')}
    <div class="row">
      <button class="btn primary grow" id="blank">+ Novo em branco</button>
      <button class="btn grow" id="dup-active">+ Copiar do ativo</button>
    </div>
    <div style="margin-top:10px"><button class="btn ghost danger" id="reset">Restaurar cronograma padrão Titan</button></div>
    <p class="muted small">Dica: crie um cronograma novo, escolha os grupos de cada dia e monte tudo pela Biblioteca. Você pode alternar entre cronogramas quando quiser.</p>
  `;
  view.onclick = (e) => {
    const b = e.target.closest('[data-act]');
    const card = e.target.closest('[data-id]');
    if (b && card) {
      const id = card.dataset.id;
      const p = state.plans.find((x) => x.id === id);
      const act = b.dataset.act;
      if (act === 'use') { setActivePlan(id); toast('Cronograma ativo'); }
      if (act === 'rename') { const n = prompt('Novo nome:', p.name); if (n && n.trim()) { p.name = n.trim(); save(); } }
      if (act === 'dup') { addPlan(clonePlan(p, p.name + ' (cópia)')); toast('Duplicado'); }
      if (act === 'del' && confirm('Excluir este cronograma?')) deletePlan(id);
    }
  };
  $('#blank').onclick = () => { const n = prompt('Nome do novo cronograma:', 'Meu cronograma'); if (n) { addPlan(blankPlan(n.trim() || 'Meu cronograma')); ui.tab = 'semana'; syncTabs(); render(); toast('Monte os dias na aba Semana'); } };
  $('#dup-active').onclick = () => { const p = activePlan(); addPlan(clonePlan(p, p.name + ' (cópia)')); toast('Copiado e ativado'); };
  $('#reset').onclick = () => { if (confirm('Recriar o cronograma padrão? (substitui o padrão atual; seus outros cronogramas ficam)')) { resetDefaultPlan(); toast('Padrão restaurado'); } };
}

function syncTabs() {
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x.dataset.tab === ui.tab));
}

// =====================================================
// CONTA / BACKUP
// =====================================================
function renderAccount() {
  const st = getStatus();
  view.innerHTML = `
    <h2>Conta e nuvem</h2>
    <div class="card" id="fb"></div>
    <h2>Backup manual</h2>
    <div class="card">
      <div class="row">
        <button class="btn grow" id="exp">⬇ Exportar JSON</button>
        <button class="btn grow" id="imp">⬆ Importar JSON</button>
      </div>
      <p class="muted small">Exporta tudo: cronogramas, exercícios personalizados e histórico de cargas.</p>
    </div>
    <p class="muted small">Fotos: free-exercise-db (domínio público).</p>
  `;
  const paint = (s) => {
    const box = $('#fb'); if (!box) return;
    if (!s.configured) {
      box.innerHTML = `<b>Modo local</b><p class="muted small">${esc(s.message || '')}</p><p class="small">Seus dados ficam salvos neste navegador. Para sincronizar entre aparelhos, siga o README (seção Firebase).</p>`;
    } else if (!s.user) {
      box.innerHTML = `<b>Firebase conectado</b><p class="muted small">${esc(s.message)}</p><button class="btn primary big" id="login">Entrar com Google</button>`;
      $('#login').onclick = signIn;
    } else {
      box.innerHTML = `<div class="row">${s.user.photo ? `<img src="${esc(s.user.photo)}" width="40" height="40" style="border-radius:50%" alt="">` : ''}<div class="grow"><b>${esc(s.user.name || 'Conta')}</b><div class="muted small">${esc(s.user.email || '')}</div></div><button class="btn" id="logout">Sair</button></div><p class="muted small">${esc(s.message)}</p>`;
      $('#logout').onclick = signOutUser;
    }
  };
  paint(st);
  const off = onStatus((s) => { if (ui.tab === 'conta') paint(s); else off(); });

  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treino-titan-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#imp').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        if (!data.plans || !data.plans.length) throw new Error('arquivo inválido');
        if (confirm('Substituir seus dados atuais pelo arquivo?')) { replaceAll(data); toast('Importado'); }
      } catch (e) { toast('Erro: ' + e.message); }
    };
    inp.click();
  };
}

function newCycle() {
  const plan = activePlan();
  const base = plan.name.replace(/ • ciclo \d+$/, '');
  const n = Number(plan.name.match(/ciclo (\d+)$/)?.[1] || 1);
  if (!confirm('Gerar o próximo ciclo? Os exercícios fixos (📌) continuam e os demais são trocados por outros do mesmo grupo. O ciclo atual fica salvo em Planos.')) return;
  closeSheet();
  const np = rotatePlan(plan, `${base} • ciclo ${n + 1}`);
  const changed = np.rotatedCount;
  delete np.rotatedCount;
  addPlan(np);
  ui.tab = 'semana'; syncTabs(); render();
  toast(`Novo ciclo criado: ${changed} exercícios trocados`);
}

function cycleSheet() {
  const plan = activePlan();
  const ci = cycleInfo(plan);
  openSheet(`
    <div class="bar"><h3>Ciclo do cronograma</h3><button data-close>✕</button></div>
    <p class="muted small">Início ${dBR(ci.start)} • termina em ${dBR(ci.end)} (${ci.remaining > 0 ? 'faltam ' + ci.remaining + ' dias' : 'concluído'}).</p>
    <div class="row">
      <div class="grow"><label>Duração (meses)</label><input id="c-m" type="number" min="1" max="12" value="${plan.cycleMonths}"></div>
      <div class="grow"><label>Início</label><input id="c-s" type="date" value="${esc(plan.cycleStart)}"></div>
      <div class="grow"><label>Meta (treinos/semana)</label><input id="c-g" type="number" min="1" max="7" value="${state.weeklyGoal}"></div>
    </div>
    <p class="muted small">Ao gerar um novo ciclo, os exercícios fixos (📌) continuam e os demais são trocados por outros do mesmo grupo (composto por composto, isolador por isolador), sem repetir os do ciclo atual quando houver opção.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn grow" id="rot">🔄 Gerar novo ciclo agora</button>
      <button class="btn primary grow" id="ok">Salvar</button>
    </div>
  `, {
    onMount: (s) => {
      s.querySelector('#ok').onclick = () => {
        plan.cycleMonths = Math.min(12, Math.max(1, Number(s.querySelector('#c-m').value) || 6));
        plan.cycleStart = s.querySelector('#c-s').value || plan.cycleStart;
        state.weeklyGoal = Math.min(7, Math.max(1, Number(s.querySelector('#c-g').value) || 6));
        save(); closeSheet();
      };
      s.querySelector('#rot').onclick = () => newCycle();
    },
  });
}

// =====================================================
// MODO TREINO (relógio de etapas)
// =====================================================
function beep(freq = 880, ms = 160) {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = new C();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime + ms / 1000);
    setTimeout(() => ctx.close(), ms + 100);
  } catch (e) { /* sem áudio */ }
}

let run = null; // estado do treino em andamento
let wakeLock = null;

async function startWorkout() {
  const plan = activePlan();
  const day = plan.days[ui.day];
  const items = day.items.filter((it) => getExercise(it.exId));
  if (!items.length) return;
  run = { dayKey: ui.day, title: day.title, items, i: 0, s: 0, phase: 'work', endAt: 0, extra: 0, timer: null, done: 0, total: items.reduce((a, b) => a + b.sets, 0) };
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (e) { /* ignora */ }
  drawRun();
}

function stopRun() {
  if (run?.timer) clearInterval(run.timer);
  run = null;
  try { wakeLock?.release(); } catch (e) { /* ignora */ }
  wakeLock = null;
  closeSheet();
}

function drawRun() {
  if (!run) return;
  const it = run.items[run.i];
  const ex = getExercise(it.exId);
  const pct = Math.round((run.done / run.total) * 100);
  const dots = Array.from({ length: it.sets }, (_, k) => `<span class="dot ${k < run.s ? 'done' : k === run.s ? 'cur' : ''}"></span>`).join('');
  const last = lastLog(it.exId);

  if (run.phase === 'rest') {
    const next = nextStep();
    const nextEx = next ? getExercise(run.items[next.i].exId) : null;
    openSheet(`
      <div class="bar"><h3>${esc(run.title)}</h3><button data-close>✕</button></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="run">
        <div class="count">Descanso</div>
        <div class="timer">
          <svg width="190" height="190" viewBox="0 0 190 190"><circle cx="95" cy="95" r="86" fill="none" stroke="var(--card2)" stroke-width="10"/><circle id="ring" cx="95" cy="95" r="86" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="540.4" stroke-dashoffset="0"/></svg>
          <div class="t" id="clock">0:00</div>
        </div>
        <div class="muted">A seguir: <b>${esc(nextEx?.name || '')}</b> — série ${next ? next.s + 1 : ''}/${next ? run.items[next.i].sets : ''}</div>
        <div class="row" style="justify-content:center;margin-top:14px">
          <button class="btn" id="plus">+15s</button>
          <button class="btn primary" id="skip">Pular descanso</button>
        </div>
      </div>
    `, {
      onMount: (s) => {
        s.querySelector('[data-close]').onclick = confirmQuit;
        s.querySelector('#plus').onclick = () => { run.endAt += 15000; run.extra += 15; };
        s.querySelector('#skip').onclick = () => endRest();
        tick();
      },
    });
    return;
  }

  openSheet(`
    <div class="bar"><h3>${esc(run.title)}</h3><button data-close>✕</button></div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="run">
      <div class="count">Exercício ${run.i + 1}/${run.items.length}</div>
      ${thumb(ex, 'detail-img')}
      <div class="big-name">${esc(ex.name)}</div>
      <div class="muted small">${esc(ex.foco || '')}</div>
      <div class="target">Série ${run.s + 1}/${it.sets} • ${esc(it.reps)}</div>
      <div class="sets-dots">${dots}</div>
      ${/min/i.test(it.reps) ? `<p class="muted">Cardio: faça ${esc(it.reps)} em ritmo leve/moderado.</p>` : `
      <div class="setrow">
        <div><label>Carga (kg)</label><input id="kg" type="number" inputmode="decimal" step="0.5" value="${last ? esc(last.kg) : ''}"></div>
        <div><label>Reps</label><input id="reps" type="number" inputmode="numeric" value="${last ? esc(last.reps) : ''}"></div>
      </div>`}
      <button class="btn primary big" id="done">Série feita ✓</button>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="btn ghost" id="skipEx">Pular exercício</button>
      </div>
    </div>
  `, {
    onMount: (s) => {
      s.querySelector('[data-close]').onclick = confirmQuit;
      s.querySelector('#done').onclick = () => {
        const kg = s.querySelector('#kg')?.value;
        const reps = s.querySelector('#reps')?.value;
        if (kg || reps) logSet(it.exId, run.s, kg || '0', reps || '', run.dayKey);
        run.done += 1;
        advance();
      };
      s.querySelector('#skipEx').onclick = () => { run.done += it.sets - run.s; run.s = it.sets - 1; advance(true); };
    },
  });
}

function nextStep() {
  const it = run.items[run.i];
  if (run.s + 1 < it.sets) return { i: run.i, s: run.s + 1 };
  if (run.i + 1 < run.items.length) return { i: run.i + 1, s: 0 };
  return null;
}

function advance(skipRest = false) {
  const it = run.items[run.i];
  const nxt = nextStep();
  if (!nxt) return finishRun();
  if (!skipRest && it.rest > 0) {
    run.phase = 'rest';
    run.restTotal = it.rest;
    run.extra = 0;
    run.endAt = Date.now() + it.rest * 1000;
    drawRun();
    run.timer = setInterval(tick, 250);
  } else {
    run.i = nxt.i; run.s = nxt.s; run.phase = 'work'; drawRun();
  }
}

function tick() {
  if (!run || run.phase !== 'rest') return;
  const left = Math.max(0, Math.ceil((run.endAt - Date.now()) / 1000));
  const clock = $('#clock'); const ring = $('#ring');
  if (clock) clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (ring) ring.style.strokeDashoffset = String(540.4 * (1 - left / (run.restTotal + run.extra)));
  if (left <= 3 && left > 0 && run.lastBeep !== left) { run.lastBeep = left; beep(660, 90); }
  if (left <= 0) { beep(1040, 350); navigator.vibrate?.([200, 100, 200]); endRest(); }
}

function endRest() {
  if (!run) return;
  clearInterval(run.timer); run.timer = null; run.lastBeep = null;
  const nxt = nextStep();
  if (!nxt) return finishRun();
  run.i = nxt.i; run.s = nxt.s; run.phase = 'work';
  drawRun();
}

function confirmQuit() {
  if (confirm('Encerrar o treino agora? O que você registrou fica salvo.')) stopRun();
}

function finishRun() {
  const title = run.title;
  const dk = run.dayKey;
  stopRun();
  setDone(dk, true);
  beep(1040, 200); setTimeout(() => beep(1320, 300), 220);
  openSheet(`
    <div class="bar"><h3>Treino concluído 🔥</h3><button data-close>✕</button></div>
    <div class="empty"><div style="font-size:56px">🏆</div><p><b>${esc(title)}</b><br>Cargas salvas. Na próxima vez o app já sugere o último peso.</p>
    <button class="btn primary big" data-close>Fechar</button></div>
  `);
  modal.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeSheet));
}

// =====================================================
// INÍCIO
// =====================================================
render();
loadImageIndex().then(() => { if (!run && modal.classList.contains('hidden')) render(); });
initFirebase();
