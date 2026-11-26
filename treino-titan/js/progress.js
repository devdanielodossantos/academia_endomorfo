// Aba Progresso: meta semanal, peso corporal/medidas, comparação entre datas e evolução de carga.
import {
  state, save, saveBody, deleteBody, weeklyHistory, weekDoneDays,
  exerciseHistory, loggedExerciseIds, getExercise, todayKey,
} from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
const dBR = (s) => s.split('-').reverse().join('/');

export const MEASURES = [
  { key: 'cintura', label: 'Cintura' },
  { key: 'braco', label: 'Braço' },
  { key: 'peito', label: 'Peito' },
  { key: 'coxa', label: 'Coxa' },
];

// Compara duas medições. Função pura (fácil de testar).
export function compareEntries(a, b) {
  const days = Math.max(1, Math.round((new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')) / 86400000));
  const dKg = b.kg - a.kg;
  const perWeek = dKg / (days / 7);
  const pctWeek = (perWeek / a.kg) * 100;
  const dM = {};
  for (const m of MEASURES) if (a[m.key] != null && b[m.key] != null) dM[m.key] = b[m.key] - a[m.key];

  let tone = 'neutral';
  let text;
  const waist = dM.cintura;
  const grew = ['braco', 'peito', 'coxa'].filter((k) => dM[k] != null && dM[k] > 0.2);
  const shrank = ['braco', 'peito', 'coxa'].filter((k) => dM[k] != null && dM[k] < -0.5);

  if (dKg > 0.2) {
    if (waist == null) {
      text = 'O peso subiu, mas só a balança não separa músculo de gordura. Registre também cintura, braço, peito e coxa para ter uma leitura melhor.';
    } else if (waist > 1) {
      tone = 'warn';
      text = `O peso subiu e a cintura aumentou ${sgn(waist)} cm: parte do ganho pode ser gordura. Considere reduzir um pouco o superávit calórico.`;
    } else if (grew.length) {
      tone = 'good';
      text = 'O peso subiu, a cintura ficou estável e há medidas musculares aumentando: sinal favorável de ganho de massa magra.';
    } else {
      text = 'O peso subiu com a cintura estável, mas as medidas musculares ainda não mudaram. Pode ser cedo, ou parte do ganho pode ser água/glicogênio; compare de novo em 3–4 semanas.';
    }
    if (pctWeek > 0.5) {
      tone = tone === 'good' ? 'neutral' : 'warn';
      text += ' O ritmo está acima de ~0,5% do peso por semana, o que em geral aumenta a chance de ganhar gordura junto.';
    }
  } else if (dKg < -0.2) {
    tone = 'warn';
    text = 'O peso caiu. Como o objetivo é ganhar massa, revise calorias e proteína. Se a força continua subindo, parte da queda pode ser gordura ou água.';
  } else {
    text = 'Peso estável no período. Se a cintura está igual e as medidas musculares sobem, você pode estar recompondo; se nada muda, falta superávit.';
  }
  if (shrank.length) text += ' Alguma medida muscular diminuiu: confira se a medição foi feita do mesmo jeito.';
  return { days, dKg, perWeek, pctWeek, dM, tone, text };
}

function lineChart(points, { unit = 'kg', goal = null } = {}) {
  if (points.length < 2) return '<div class="muted small">Registre ao menos 2 datas para ver o gráfico.</div>';
  const W = 320, H = 150, L = 34, R = 10, T = 12, B = 24;
  const ys = points.map((p) => p.y).concat(goal != null ? [goal] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
  const t0 = new Date(points[0].x + 'T00:00:00').getTime();
  const t1 = new Date(points[points.length - 1].x + 'T00:00:00').getTime();
  const X = (x) => L + ((new Date(x + 'T00:00:00').getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const Y = (y) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const dots = points.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join('');
  const goalLine = goal != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--accent2)" stroke-dasharray="4 4"/><text x="${W - R}" y="${Y(goal) - 3}" text-anchor="end" font-size="9" fill="var(--accent2)">meta ${fmt(goal)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de ${unit}">
    <line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="var(--line)"/>
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="var(--line)"/>
    <text x="${L - 4}" y="${T + 4}" text-anchor="end" font-size="9" fill="var(--muted)">${fmt(hi)}</text>
    <text x="${L - 4}" y="${H - B}" text-anchor="end" font-size="9" fill="var(--muted)">${fmt(lo)}</text>
    <text x="${L}" y="${H - 8}" font-size="9" fill="var(--muted)">${dBR(points[0].x)}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end" font-size="9" fill="var(--muted)">${dBR(points[points.length - 1].x)}</text>
    ${goalLine}
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${dots}
  </svg>`;
}

const ui = { from: null, to: null, ex: null };

export function renderProgress(view, toast) {
  const body = state.body;
  const goal = state.weeklyGoal;
  const wk = weekDoneDays();
  const hist = weeklyHistory(8);
  const maxBar = Math.max(goal, ...hist.map((h) => h.count), 1);

  // datas selecionadas para comparação
  if (body.length >= 2) {
    if (!body.some((b) => b.date === ui.from)) ui.from = body[body.length - 2].date;
    if (!body.some((b) => b.date === ui.to)) ui.to = body[body.length - 1].date;
  }
  const a = body.find((b) => b.date === ui.from);
  const b = body.find((b) => b.date === ui.to);
  const cmp = a && b && a.date < b.date ? compareEntries(a, b) : null;

  const last = body[body.length - 1];
  const goalKg = state.goalKg;
  const exIds = loggedExerciseIds().filter((id) => getExercise(id));
  if (!exIds.includes(ui.ex)) ui.ex = exIds[0] || null;
  const hx = ui.ex ? exerciseHistory(ui.ex) : [];

  view.innerHTML = `
    <h2>Meta da semana</h2>
    <div class="card">
      <div class="row"><b>${wk.count}/${goal} treinos concluídos</b><span class="grow"></span>
        <label style="margin:0">Meta</label><input id="goal" class="mini" type="number" min="1" max="7" value="${goal}"></div>
      <div class="progress" style="margin-top:8px"><i style="width:${Math.min(100, Math.round((wk.count / goal) * 100))}%"></i></div>
      <div class="bars">${hist.map((h) => `
        <div class="bar-col" title="${dBR(h.week)}">
          <div class="bar-fill ${h.count >= goal ? 'ok' : ''}" style="height:${Math.round((h.count / maxBar) * 100)}%"></div>
          <small>${h.count}</small>
        </div>`).join('')}</div>
      <div class="muted small">Últimas 8 semanas (verde = meta batida).</div>
    </div>

    <h2>Peso e medidas</h2>
    <div class="card">
      <div class="row">
        <div class="grow"><label>Data</label><input id="b-date" type="date" value="${todayKey()}"></div>
        <div class="grow"><label>Peso (kg)</label><input id="b-kg" type="text" inputmode="decimal" placeholder="${last ? fmt(last.kg) : '75,0'}"></div>
      </div>
      <div class="row">
        ${MEASURES.map((m) => `<div class="grow"><label>${m.label} (cm)</label><input id="b-${m.key}" type="text" inputmode="decimal" placeholder="cm"></div>`).join('')}
      </div>
      <div style="margin-top:10px"><button class="btn primary big" id="b-save">Salvar medição</button></div>
      <div class="row" style="margin-top:10px">
        <label style="margin:0">Meta de peso (kg)</label>
        <input id="goalKg" class="mini" style="width:80px !important" type="text" inputmode="decimal" value="${goalKg != null ? fmt(goalKg) : ''}" placeholder="—">
        ${goalKg != null && last ? `<span class="muted small">${last.kg < goalKg ? 'faltam ' + fmt(goalKg - last.kg) + ' kg' : 'meta atingida ✓'}</span>` : ''}
      </div>
    </div>

    ${body.length ? `<div class="card">${lineChart(body.map((x) => ({ x: x.date, y: x.kg })), { goal: goalKg })}</div>` : ''}

    <h2>Comparar duas datas</h2>
    <div class="card">
      ${body.length < 2 ? '<div class="muted small">Salve ao menos 2 medições em datas diferentes.</div>' : `
      <div class="row">
        <div class="grow"><label>De</label><select id="c-from">${body.map((x) => `<option value="${x.date}" ${x.date === ui.from ? 'selected' : ''}>${dBR(x.date)} — ${fmt(x.kg)} kg</option>`).join('')}</select></div>
        <div class="grow"><label>Para</label><select id="c-to">${body.map((x) => `<option value="${x.date}" ${x.date === ui.to ? 'selected' : ''}>${dBR(x.date)} — ${fmt(x.kg)} kg</option>`).join('')}</select></div>
      </div>
      ${cmp ? `
        <div class="delta ${cmp.dKg > 0.2 ? 'up' : cmp.dKg < -0.2 ? 'down' : ''}">${sgn(cmp.dKg)} kg <small>em ${cmp.days} dias (${sgn(cmp.perWeek, 2)} kg/semana)</small></div>
        <div class="chips">${Object.entries(cmp.dM).map(([k, v]) => `<span class="chip">${esc(MEASURES.find((m) => m.key === k).label)} ${sgn(v)} cm</span>`).join('')}</div>
        <div class="verdict ${cmp.tone}">${esc(cmp.text)}</div>`
        : '<div class="muted small" style="margin-top:8px">Escolha uma data inicial anterior à final.</div>'}`}
    </div>

    ${body.length ? `<div class="card"><b>Histórico</b>${body.slice().reverse().map((x) => `
      <div class="hist-row"><span>${dBR(x.date)}</span><b>${fmt(x.kg)} kg</b>
        <span class="muted small">${MEASURES.filter((m) => x[m.key] != null).map((m) => `${m.label[0]}${fmt(x[m.key])}`).join(' · ')}</span>
        <button class="btn danger" data-del="${x.date}">✕</button></div>`).join('')}
      <div class="muted small" style="margin-top:6px">C = cintura, B = braço, P = peito, C = coxa (cm).</div></div>` : ''}

    <h2>Evolução da carga</h2>
    <div class="card">
      ${!exIds.length ? '<div class="muted small">Faça treinos pelo botão “Iniciar treino” e informe a carga: o histórico aparece aqui.</div>' : `
      <select id="ex-sel">${exIds.map((id) => `<option value="${esc(id)}" ${id === ui.ex ? 'selected' : ''}>${esc(getExercise(id).name)}</option>`).join('')}</select>
      ${hx.length ? `
        ${lineChart(hx.map((h) => ({ x: h.date, y: h.e1rm })), { unit: '1RM estimado (kg)' })}
        ${hx.length >= 2 ? `<div class="verdict ${hx[hx.length - 1].e1rm > hx[0].e1rm ? 'good' : 'neutral'}">1RM estimado: ${fmt(hx[0].e1rm)} → ${fmt(hx[hx.length - 1].e1rm)} kg (${sgn(((hx[hx.length - 1].e1rm / hx[0].e1rm) - 1) * 100)}%)</div>` : ''}
        ${hx.slice().reverse().map((h, i, arr) => {
          const prev = arr[i + 1];
          return `<div class="hist-row"><span>${dBR(h.date)}</span><b>${fmt(h.kg)} kg × ${h.reps}</b><span class="muted small">1RM ~${fmt(h.e1rm)}</span>${prev ? `<span class="${h.e1rm >= prev.e1rm ? 'pos' : 'neg'}">${sgn(h.e1rm - prev.e1rm)}</span>` : '<span></span>'}</div>`;
        }).join('')}
        <div class="muted small" style="margin-top:6px">1RM estimado pela fórmula de Epley (carga × (1 + reps/30)). Subir a carga ou as reps com a mesma técnica é um bom indicador de ganho de força, e costuma acompanhar o ganho de massa.</div>`
        : '<div class="muted small" style="margin-top:8px">Sem cargas registradas para este exercício.</div>'}`}
    </div>
  `;

  view.querySelector('#goal').onchange = (e) => {
    state.weeklyGoal = Math.min(7, Math.max(1, Number(e.target.value) || 6));
    save();
  };
  view.querySelector('#goalKg').onchange = (e) => { state.goalKg = num(e.target.value); save(); };
  view.querySelector('#b-save').onclick = () => {
    const kg = num(view.querySelector('#b-kg').value);
    const date = view.querySelector('#b-date').value || todayKey();
    if (kg == null || kg < 20 || kg > 400) { toast('Informe o peso em kg'); return; }
    const entry = { date, kg };
    for (const m of MEASURES) {
      const v = num(view.querySelector('#b-' + m.key).value);
      if (v != null) entry[m.key] = v;
    }
    saveBody(entry);
    toast('Medição salva');
  };
  const cf = view.querySelector('#c-from'), ct = view.querySelector('#c-to');
  if (cf) cf.onchange = () => { ui.from = cf.value; renderProgress(view, toast); };
  if (ct) ct.onchange = () => { ui.to = ct.value; renderProgress(view, toast); };
  const es = view.querySelector('#ex-sel');
  if (es) es.onchange = () => { ui.ex = es.value; renderProgress(view, toast); };
  view.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d && confirm('Excluir esta medição?')) deleteBody(d.dataset.del);
  };
}
