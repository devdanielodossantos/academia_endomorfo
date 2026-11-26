// Cronograma padrão: Seg–Sáb, hipertrofia, pensado para perfil endomorfo.
// Lógica: músculo grande + pequeno no mesmo dia, compostos pesados no começo
// (8–12 reps), isoladores em 12–15+, descansos curtos (45–90 s) e cardio leve no fim.
// Tudo editável no app. Ids referenciam js/data/exercises.js.

const it = (exId, sets, reps, rest) => ({ exId, sets, reps, rest });

export const DEFAULT_PLAN = {
  id: 'padrao-endomorfo',
  name: 'Titan • Hipertrofia Endomorfo (Seg–Sáb)',
  notes:
    'Foco total em ganho de massa: compostos pesados primeiro (8–12 reps), isoladores depois (12–15). Sem cardio. ' +
    'Progrida a carga quando completar todas as séries no topo das reps.',
  days: {
    seg: {
      title: 'Peito + Tríceps',
      groups: ['peito', 'triceps'],
      items: [
        it('supino-inclinado-halteres', 4, '8-12', 90),
        it('supino-reto-barra', 3, '8-10', 90),
        it('crucifixo-reto', 3, '12-15', 60),
        it('crossover-alto', 3, '12-15', 60),
        it('triceps-corda', 3, '12-15', 60),
        it('triceps-testa', 3, '10-12', 60),
        it('triceps-frances', 3, '12-15', 60),
      ],
    },
    ter: {
      title: 'Costas + Bíceps',
      groups: ['costas', 'biceps'],
      items: [
        it('puxada-aberta', 4, '8-12', 90),
        it('remada-curvada', 3, '8-10', 90),
        it('remada-baixa', 3, '10-12', 75),
        it('pulldown-braco-reto', 3, '12-15', 60),
        it('rosca-direta', 3, '8-12', 60),
        it('rosca-martelo', 3, '10-12', 60),
        it('rosca-concentrada', 3, '12-15', 45),
      ],
    },
    qua: {
      title: 'Pernas (quadríceps) + Panturrilha',
      groups: ['quadriceps', 'panturrilha'],
      items: [
        it('agachamento-livre', 4, '8-12', 120),
        it('leg-press', 4, '10-15', 90),
        it('cadeira-extensora', 3, '12-15', 60),
        it('afundo', 3, '10-12', 75),
        it('panturrilha-em-pe', 4, '15-20', 45),
      ],
    },
    qui: {
      title: 'Ombro + Abdômen',
      groups: ['ombro', 'trapezio', 'abdomen'],
      items: [
        it('desenvolvimento-halteres', 4, '8-12', 90),
        it('elevacao-lateral', 4, '12-15', 45),
        it('crucifixo-inverso', 3, '12-15', 45),
        it('face-pull', 3, '15-20', 45),
        it('encolhimento-halteres', 3, '12-15', 60),
        it('abdominal-polia', 3, '12-15', 45),
        it('elevacao-pernas', 3, '12-15', 45),
      ],
    },
    sex: {
      title: 'Costas + Bíceps (variação)',
      groups: ['costas', 'biceps'],
      items: [
        it('barra-fixa', 4, '6-10', 90),
        it('remada-unilateral', 3, '10-12', 75),
        it('puxada-fechada', 3, '10-12', 75),
        it('remada-alta-maquina', 3, '12-15', 60),
        it('rosca-scott', 3, '10-12', 60),
        it('rosca-inclinada', 3, '12-15', 60),
        it('rosca-polia', 2, '15-20', 45),
      ],
    },
    sab: {
      title: 'Pernas (posterior + glúteo) + Peito',
      groups: ['posterior', 'gluteo', 'panturrilha', 'peito'],
      items: [
        it('levantamento-romeno', 4, '8-12', 90),
        it('hip-thrust', 4, '10-12', 90),
        it('mesa-flexora', 3, '12-15', 60),
        it('agachamento-bulgaro', 3, '10-12', 75),
        it('panturrilha-sentado', 4, '15-20', 45),
        it('supino-inclinado-halteres', 3, '10-12', 75),
      ],
    },
  },
};

export function clonePlan(plan, name) {
  const copy = JSON.parse(JSON.stringify(plan));
  copy.id = 'plan-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (name) copy.name = name;
  return copy;
}

export function blankPlan(name = 'Novo cronograma') {
  const days = {};
  for (const k of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']) {
    days[k] = { title: 'Dia livre', groups: [], items: [] };
  }
  return {
    id: 'plan-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    notes: '',
    days,
  };
}