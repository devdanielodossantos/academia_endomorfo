// Biblioteca de exercícios (PT-BR).
// `en` = nome em inglês usado para achar a imagem na base pública free-exercise-db.
// Você pode trocar/adicionar exercícios pelo próprio app (aba Biblioteca).

export const GROUPS = {
  peito:       { label: 'Peito',       icon: '🫁' },
  costas:      { label: 'Costas',      icon: '🦅' },
  ombro:       { label: 'Ombro',       icon: '🥥' },
  biceps:      { label: 'Bíceps',      icon: '💪' },
  triceps:     { label: 'Tríceps',     icon: '🔱' },
  quadriceps:  { label: 'Quadríceps',  icon: '🦵' },
  posterior:   { label: 'Posterior',   icon: '🍗' },
  gluteo:      { label: 'Glúteo',      icon: '🍑' },
  panturrilha: { label: 'Panturrilha', icon: '🦶' },
  abdomen:     { label: 'Abdômen',     icon: '🧱' },
  trapezio:    { label: 'Trapézio',    icon: '⛰️' },
  antebraco:   { label: 'Antebraço',   icon: '✊' },
  cardio:      { label: 'Cardio',      icon: '🏃' },
};

export const GROUP_ORDER = Object.keys(GROUPS);

// Grupo do app -> músculos primários da base free-exercise-db
export const GROUP_TO_DB = {
  peito: ['chest'],
  costas: ['lats', 'middle back', 'lower back'],
  ombro: ['shoulders'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quadriceps: ['quadriceps'],
  posterior: ['hamstrings'],
  gluteo: ['glutes', 'abductors', 'adductors'],
  panturrilha: ['calves'],
  abdomen: ['abdominals'],
  trapezio: ['traps'],
  antebraco: ['forearms'],
};

export const DAY_KEYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
export const DAY_LABELS = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
};
export const DAY_FULL = {
  seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo',
};

const E = (id, name, group, equip, en, foco = '') => ({ id, name, group, equip, en, foco });

export const EXERCISES = [
  // ---------- PEITO ----------
  E('supino-reto-barra', 'Supino reto com barra', 'peito', 'Barra', 'Barbell Bench Press - Medium Grip', 'Peitoral médio, base de força'),
  E('supino-reto-halteres', 'Supino reto com halteres', 'peito', 'Halteres', 'Dumbbell Bench Press', 'Peitoral médio, maior amplitude'),
  E('supino-inclinado-halteres', 'Supino inclinado com halteres', 'peito', 'Halteres', 'Incline Dumbbell Press', 'Porção superior do peitoral (banco 15–30°)'),
  E('supino-inclinado-barra', 'Supino inclinado com barra', 'peito', 'Barra', 'Barbell Incline Bench Press - Medium Grip', 'Porção superior do peitoral'),
  E('supino-declinado-halteres', 'Supino declinado com halteres', 'peito', 'Halteres', 'Decline Dumbbell Bench Press', 'Porção inferior do peitoral'),
  E('supino-maquina', 'Supino na máquina', 'peito', 'Máquina', 'Machine Bench Press', 'Peitoral médio, mais estável'),
  E('crucifixo-reto', 'Crucifixo reto', 'peito', 'Halteres', 'Dumbbell Flyes', 'Alongamento do peitoral'),
  E('crucifixo-inclinado', 'Crucifixo inclinado', 'peito', 'Halteres', 'Incline Dumbbell Flyes', 'Peitoral superior, isolado'),
  E('crossover-alto', 'Crossover (polia alta)', 'peito', 'Polia', 'Cable Crossover', 'Peitoral inferior/médio, contração'),
  E('crossover-baixo', 'Crossover (polia baixa)', 'peito', 'Polia', 'Low Cable Crossover', 'Peitoral superior'),
  E('peck-deck', 'Peck deck (voador)', 'peito', 'Máquina', 'Butterfly', 'Isolamento do peitoral'),
  E('flexao', 'Flexão de braço', 'peito', 'Peso corporal', 'Pushups', 'Peitoral, finalizador'),
  E('pullover-halter', 'Pullover com halter', 'peito', 'Halter', 'Bent-Arm Dumbbell Pullover', 'Peitoral e serrátil'),

  // ---------- TRÍCEPS ----------
  E('triceps-corda', 'Tríceps na polia (corda)', 'triceps', 'Polia', 'Triceps Pushdown - Rope Attachment', 'Cabeça lateral'),
  E('triceps-barra-v', 'Tríceps na polia (barra V)', 'triceps', 'Polia', 'Triceps Pushdown - V-Bar Attachment', 'Cabeça lateral, mais carga'),
  E('triceps-testa', 'Tríceps testa', 'triceps', 'Barra W', 'EZ-Bar Skullcrusher', 'Cabeça longa e medial'),
  E('triceps-frances', 'Tríceps francês', 'triceps', 'Halter', 'Standing Dumbbell Triceps Extension', 'Cabeça longa'),
  E('triceps-coice', 'Tríceps coice', 'triceps', 'Halter', 'Tricep Dumbbell Kickback', 'Contração final'),
  E('mergulho-triceps', 'Mergulho nas paralelas (tríceps)', 'triceps', 'Paralelas', 'Dips - Triceps Version', 'Composto de tríceps'),
  E('supino-fechado', 'Supino fechado', 'triceps', 'Barra', 'Close-Grip Barbell Bench Press', 'Composto: tríceps + peito'),
  E('mergulho-banco', 'Mergulho no banco', 'triceps', 'Banco', 'Bench Dips', 'Tríceps, peso corporal'),
  E('triceps-unilateral-polia', 'Tríceps unilateral na polia', 'triceps', 'Polia', 'Cable One Arm Tricep Extension', 'Isolamento unilateral'),

  // ---------- COSTAS ----------
  E('puxada-aberta', 'Puxada frontal (pegada aberta)', 'costas', 'Polia', 'Wide-Grip Lat Pulldown', 'Largura das costas (dorsais)'),
  E('puxada-fechada', 'Puxada frontal (pegada fechada)', 'costas', 'Polia', 'Close-Grip Front Lat Pulldown', 'Dorsais e parte inferior'),
  E('remada-curvada', 'Remada curvada com barra', 'costas', 'Barra', 'Bent Over Barbell Row', 'Espessura das costas'),
  E('remada-baixa', 'Remada baixa (triângulo)', 'costas', 'Polia', 'Seated Cable Rows', 'Espessura, meio das costas'),
  E('remada-unilateral', 'Remada unilateral com halter', 'costas', 'Halter', 'One-Arm Dumbbell Row', 'Dorsais, amplitude e simetria'),
  E('remada-cavalinho', 'Remada cavalinho', 'costas', 'Barra T', 'T-Bar Row with Handle', 'Espessura'),
  E('barra-fixa', 'Barra fixa', 'costas', 'Peso corporal', 'Pullups', 'Largura, composto'),
  E('pulldown-braco-reto', 'Pulldown braço reto', 'costas', 'Polia', 'Straight-Arm Pulldown', 'Dorsais isolado'),
  E('levantamento-terra', 'Levantamento terra', 'costas', 'Barra', 'Barbell Deadlift', 'Cadeia posterior inteira'),
  E('extensao-lombar', 'Extensão lombar', 'costas', 'Banco', 'Hyperextensions (Back Extensions)', 'Lombar'),
  E('remada-alta-maquina', 'Remada alta na máquina', 'costas', 'Máquina', 'Leverage High Row', 'Parte superior das costas'),
  E('remada-supinada', 'Remada curvada supinada', 'costas', 'Barra', 'Reverse Grip Bent-Over Rows', 'Dorsais inferior e bíceps'),

  // ---------- BÍCEPS ----------
  E('rosca-direta', 'Rosca direta com barra', 'biceps', 'Barra', 'Barbell Curl', 'Bíceps, carga alta'),
  E('rosca-alternada', 'Rosca alternada com halteres', 'biceps', 'Halteres', 'Dumbbell Bicep Curl', 'Bíceps, supinação'),
  E('rosca-martelo', 'Rosca martelo', 'biceps', 'Halteres', 'Hammer Curls', 'Braquial e braquiorradial'),
  E('rosca-scott', 'Rosca Scott', 'biceps', 'Barra W', 'Preacher Curl', 'Cabeça curta, sem roubo'),
  E('rosca-inclinada', 'Rosca inclinada', 'biceps', 'Halteres', 'Incline Dumbbell Curl', 'Cabeça longa, alongamento'),
  E('rosca-concentrada', 'Rosca concentrada', 'biceps', 'Halter', 'Concentration Curls', 'Pico do bíceps'),
  E('rosca-polia', 'Rosca na polia baixa', 'biceps', 'Polia', 'Standing Biceps Cable Curl', 'Tensão constante'),
  E('rosca-w', 'Rosca com barra W', 'biceps', 'Barra W', 'EZ-Bar Curl', 'Bíceps, menos estresse no punho'),

  // ---------- OMBRO ----------
  E('desenvolvimento-halteres', 'Desenvolvimento com halteres', 'ombro', 'Halteres', 'Dumbbell Shoulder Press', 'Deltoide anterior e lateral'),
  E('desenvolvimento-militar', 'Desenvolvimento militar (barra)', 'ombro', 'Barra', 'Standing Military Press', 'Deltoides, força'),
  E('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'ombro', 'Halteres', 'Arnold Dumbbell Press', 'Deltoides, amplitude'),
  E('desenvolvimento-maquina', 'Desenvolvimento na máquina', 'ombro', 'Máquina', 'Machine Shoulder (Military) Press', 'Deltoides, estável'),
  E('elevacao-lateral', 'Elevação lateral', 'ombro', 'Halteres', 'Side Lateral Raise', 'Deltoide lateral (largura)'),
  E('elevacao-lateral-polia', 'Elevação lateral na polia', 'ombro', 'Polia', 'Cable Seated Lateral Raise', 'Lateral com tensão constante'),
  E('elevacao-frontal', 'Elevação frontal', 'ombro', 'Halteres', 'Front Dumbbell Raise', 'Deltoide anterior'),
  E('crucifixo-inverso', 'Crucifixo inverso', 'ombro', 'Halteres', 'Bent Over Dumbbell Rear Delt Raise With Head On Bench', 'Deltoide posterior'),
  E('face-pull', 'Face pull', 'ombro', 'Polia', 'Face Pull', 'Deltoide posterior e postura'),
  E('remada-alta', 'Remada alta', 'ombro', 'Barra', 'Upright Barbell Row', 'Deltoide lateral e trapézio'),

  // ---------- TRAPÉZIO ----------
  E('encolhimento-halteres', 'Encolhimento com halteres', 'trapezio', 'Halteres', 'Dumbbell Shrug', 'Trapézio superior'),
  E('encolhimento-barra', 'Encolhimento com barra', 'trapezio', 'Barra', 'Barbell Shrug', 'Trapézio superior, mais carga'),

  // ---------- QUADRÍCEPS ----------
  E('agachamento-livre', 'Agachamento livre', 'quadriceps', 'Barra', 'Barbell Full Squat', 'Pernas e glúteos, rei dos compostos'),
  E('agachamento-frontal', 'Agachamento frontal', 'quadriceps', 'Barra', 'Front Barbell Squat', 'Quadríceps'),
  E('agachamento-hack', 'Agachamento hack', 'quadriceps', 'Máquina', 'Hack Squat', 'Quadríceps'),
  E('leg-press', 'Leg press 45°', 'quadriceps', 'Máquina', 'Leg Press', 'Quadríceps e glúteos'),
  E('cadeira-extensora', 'Cadeira extensora', 'quadriceps', 'Máquina', 'Leg Extensions', 'Isolamento do quadríceps'),
  E('agachamento-goblet', 'Agachamento goblet', 'quadriceps', 'Halter', 'Goblet Squat', 'Quadríceps, boa técnica'),
  E('afundo', 'Afundo com halteres', 'quadriceps', 'Halteres', 'Dumbbell Lunges', 'Quadríceps e glúteos, unilateral'),
  E('agachamento-bulgaro', 'Agachamento búlgaro', 'quadriceps', 'Halteres', 'Split Squat with Dumbbells', 'Unilateral, quadríceps e glúteo'),
  E('agachamento-smith', 'Agachamento no Smith', 'quadriceps', 'Smith', 'Smith Machine Squat', 'Quadríceps, mais guiado'),

  // ---------- POSTERIOR ----------
  E('stiff', 'Stiff com barra', 'posterior', 'Barra', 'Stiff-Legged Barbell Deadlift', 'Posterior de coxa e glúteos'),
  E('levantamento-romeno', 'Levantamento romeno', 'posterior', 'Barra', 'Romanian Deadlift', 'Posterior de coxa'),
  E('mesa-flexora', 'Mesa flexora', 'posterior', 'Máquina', 'Lying Leg Curls', 'Isolamento do posterior'),
  E('cadeira-flexora', 'Cadeira flexora', 'posterior', 'Máquina', 'Seated Leg Curl', 'Posterior de coxa'),
  E('bom-dia', 'Bom dia (good morning)', 'posterior', 'Barra', 'Good Morning', 'Posterior e lombar'),

  // ---------- GLÚTEO ----------
  E('hip-thrust', 'Elevação pélvica (hip thrust)', 'gluteo', 'Barra', 'Barbell Hip Thrust', 'Glúteo máximo'),
  E('ponte-gluteo', 'Ponte de glúteo', 'gluteo', 'Peso corporal', 'Barbell Glute Bridge', 'Glúteo'),
  E('coice-polia', 'Coice na polia', 'gluteo', 'Polia', 'Glute Kickback', 'Glúteo isolado'),
  E('passada', 'Passada (caminhada com halteres)', 'gluteo', 'Halteres', 'Barbell Walking Lunge', 'Glúteo e quadríceps'),
  E('agachamento-sumo', 'Agachamento sumô', 'gluteo', 'Halter', 'Plie Dumbbell Squat', 'Glúteo e adutores'),
  E('abdutora', 'Cadeira abdutora', 'gluteo', 'Máquina', 'Thigh Abductor', 'Glúteo médio'),

  // ---------- PANTURRILHA ----------
  E('panturrilha-em-pe', 'Panturrilha em pé', 'panturrilha', 'Máquina', 'Standing Calf Raises', 'Gastrocnêmio'),
  E('panturrilha-sentado', 'Panturrilha sentado', 'panturrilha', 'Máquina', 'Seated Calf Raise', 'Sóleo'),
  E('panturrilha-leg-press', 'Panturrilha no leg press', 'panturrilha', 'Máquina', 'Calf Press On The Leg Press Machine', 'Gastrocnêmio'),
  E('panturrilha-burro', 'Panturrilha burro', 'panturrilha', 'Máquina', 'Donkey Calf Raises', 'Gastrocnêmio, alongamento'),

  // ---------- ABDÔMEN ----------
  E('abdominal-crunch', 'Abdominal crunch', 'abdomen', 'Peso corporal', 'Crunches', 'Reto abdominal'),
  E('abdominal-polia', 'Abdominal na polia', 'abdomen', 'Polia', 'Cable Crunch', 'Reto abdominal com carga'),
  E('elevacao-pernas', 'Elevação de pernas', 'abdomen', 'Barra/Banco', 'Hanging Leg Raise', 'Abdômen inferior'),
  E('prancha', 'Prancha', 'abdomen', 'Peso corporal', 'Plank', 'Core, isometria'),
  E('roda-abdominal', 'Roda abdominal', 'abdomen', 'Roda', 'Ab Roller', 'Core completo'),
  E('abdominal-infra', 'Abdominal infra (reverso)', 'abdomen', 'Peso corporal', 'Reverse Crunch', 'Abdômen inferior'),
  E('russian-twist', 'Russian twist', 'abdomen', 'Peso corporal', 'Russian Twist', 'Oblíquos'),
  E('prancha-lateral', 'Prancha lateral', 'abdomen', 'Peso corporal', 'Side Bridge', 'Oblíquos'),

  // ---------- ANTEBRAÇO ----------
  E('rosca-punho', 'Rosca de punho', 'antebraco', 'Barra', 'Palms-Up Barbell Wrist Curl Over A Bench', 'Flexores do antebraço'),
  E('rosca-inversa', 'Rosca inversa', 'antebraco', 'Barra W', 'Reverse Barbell Curl', 'Braquiorradial'),

  // ---------- CARDIO ----------
  E('esteira-inclinada', 'Esteira: caminhada inclinada', 'cardio', 'Esteira', 'Treadmill', 'Baixo impacto, queima de gordura'),
  E('bike', 'Bicicleta ergométrica', 'cardio', 'Bike', 'Bicycling, Stationary', 'Cardio sem impacto'),
  E('eliptico', 'Elíptico', 'cardio', 'Elíptico', 'Elliptical Trainer', 'Cardio sem impacto'),
  E('remo-ergometro', 'Remo ergométrico', 'cardio', 'Remo', 'Rowing, Stationary', 'Cardio de corpo inteiro'),
  E('escada', 'Simulador de escada', 'cardio', 'Escada', 'Stairmaster', 'Cardio com glúteo/perna'),
];
