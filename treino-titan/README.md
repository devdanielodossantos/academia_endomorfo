# Treino Titan 🏋️ — versão web

App de treino (Seg–Sáb, hipertrofia, perfil endomorfo) com biblioteca de exercícios, troca de exercícios, vários cronogramas, modo treino com cronômetro de descanso e sincronização opcional via Firebase.

Sem build, sem framework: HTML + CSS + JavaScript (ES modules). Isso deixa a versão web simples e o modelo de dados fácil de reaproveitar no Flutter depois.

---

## 1. Instalação (uma vez só)

| Ferramenta | Para quê | Link |
|---|---|---|
| **Git** | versionar e enviar ao GitHub | https://git-scm.com/downloads |
| **VS Code** | editor | https://code.visualstudio.com |
| **Node.js (LTS)** | rodar servidor local e Firebase CLI | https://nodejs.org |
| Conta **GitHub** | repositório | https://github.com |
| Conta **Google** | Firebase | https://console.firebase.google.com |

Confira no terminal:

```bash
git --version
node --version
```

Configure o Git (uma vez):

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## 2. Rodar localmente

Os módulos JS não funcionam abrindo o `index.html` com duplo clique (`file://`). Use um servidor local:

```bash
cd treino-titan
npx http-server . -p 5173 -c-1
# abra http://localhost:5173
```

(Alternativa sem Node: `python3 -m http.server 5173`.)

Sem Firebase, tudo funciona e fica salvo no navegador (localStorage).

## 3. Subir para o GitHub

1. No GitHub: **New repository** → nome `treino-titan` → sem README (já existe um aqui).
2. No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Treino Titan: versão web inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/treino-titan.git
git push -u origin main
```

## 4. Conectar ao Firebase

### 4.1 Criar o projeto
1. https://console.firebase.google.com → **Adicionar projeto** (Analytics é opcional).
2. **Build → Authentication → Começar → Google** → ativar e salvar.
3. **Build → Firestore Database → Criar banco** (modo produção; escolha uma região, ex.: `southamerica-east1`).
4. **Configurações do projeto (engrenagem) → Seus apps → Web `</>`** → registre o app → copie o objeto `firebaseConfig`.

### 4.2 Colocar a config no app
```bash
cp js/firebase-config.example.js js/firebase-config.js
# edite js/firebase-config.js e cole os valores
```
> A config do app web não é segredo. Quem protege seus dados são as **regras do Firestore** (`firestore.rules`): cada usuário só acessa `users/{seuUid}/...`.

### 4.3 Publicar as regras e o site (Firebase CLI)
```bash
npm install -g firebase-tools
firebase login
firebase init          # escolha Firestore + Hosting; use o projeto criado
                       # Firestore rules: firestore.rules (já existe, não sobrescreva)
                       # Hosting public dir: .   |  SPA: Não  |  não sobrescrever index.html
firebase deploy
```
Seu app fica em `https://SEU_PROJETO.web.app`. Adicione esse domínio (e `localhost`) em **Authentication → Configurações → Domínios autorizados** se o login pedir.

### 4.4 Deploy automático a cada `git push` (GitHub ↔ Firebase)
```bash
firebase init hosting:github
```
O assistente cria os workflows do GitHub Actions e a chave de serviço no repositório. Depois disso: `git push` na `main` publica sozinho.

## 5. Arquitetura

```
treino-titan/
├─ index.html              # casca: header, abas, modal
├─ css/style.css           # tema escuro, mobile-first
├─ js/
│  ├─ app.js               # UI: Semana, Biblioteca, Cronogramas, Conta, Modo treino
│  ├─ store.js             # estado único + localStorage + helpers (planos, logs)
│  ├─ firebase.js          # Auth Google + sync Firestore (opcional)
│  ├─ pwa.js               # registro do service worker + botão instalar
│  ├─ progress.js          # aba Progresso: meta semanal, peso/medidas, comparação, carga
│  ├─ images.js            # fotos dos exercícios (free-exercise-db, domínio público)
│  ├─ firebase-config.js   # SUA config (criar a partir do .example)
│  └─ data/
│     ├─ exercises.js      # biblioteca (93 exercícios, 13 grupos) + grupos/dias
│     └─ plan.js           # cronograma padrão Seg–Sáb + criação de planos
├─ sw.js                   # service worker (offline)
├─ manifest.webmanifest    # nome, cores e ícones do app instalável
├─ icons/                  # ícones do app
├─ firestore.rules         # segurança por usuário
└─ firebase.json           # hosting + regras
```

**Fluxo de dados:** `UI → store.save() → localStorage → (se logado) Firestore`. Mudanças vindas da nuvem entram por `applyRemote()` (o mais recente vence, por `updatedAt`).

**Modelo de dados** (um documento em `users/{uid}/app/state`):

```jsonc
{
  "activePlanId": "padrao-endomorfo",
  "plans": [{
    "id": "...", "name": "...", "notes": "...",
    "days": {
      "seg": {
        "title": "Peito + Tríceps",
        "groups": ["peito", "triceps"],          // define a lista de troca do dia
        "items": [{ "exId": "supino-inclinado-halteres", "sets": 4, "reps": "8-12", "rest": 90 }]
      }
      // ter, qua, qui, sex, sab
    }
  }],
  "customExercises": [{ "id": "custom-...", "name": "...", "group": "peito", "equip": "...", "image": "https://..." }],
  "logs": { "2026-11-26": { "planId": "...", "dayKey": "seg", "sets": { "supino-reto-barra": [{ "kg": "60", "reps": "10" }] } } }
}
```

**Como a troca de exercício funciona:** cada dia tem `groups`. Ao tocar em **Trocar** ou **+ Adicionar**, o app lista *todos* os exercícios desses grupos (e você pode ligar outros grupos ou “Todos os grupos”). Em **Cronogramas** você cria um plano em branco ou copia o ativo e remonta como quiser.

## 6. Lógica do cronograma padrão (endomorfo)

| Dia | Foco |
|---|---|
| Seg | Peito + Tríceps |
| Ter | Costas + Bíceps |
| Qua | Pernas (quadríceps) + Panturrilha |
| Qui | Ombro + Abdômen |
| Sex | Costas + Bíceps (variação) |
| Sáb | Pernas (posterior + glúteo) + Peito superior |

Princípios usados (consenso geral de programas de hipertrofia, não uma regra rígida):
- Compostos primeiro (8–12 reps), isoladores depois (12–15+).
- Descansos de 45–120 s conforme o exercício (mais longos nos compostos) e repetições um pouco mais altas nos isoladores. Sem cardio no plano, pois o objetivo é só ganhar massa.
- Volume semanal por músculo importa mais que o formato exato do split; mantenha constância e progressão de carga.
- “Endomorfo” é uma classificação popular, não científica: trate como ponto de partida e ajuste conforme seus resultados, dieta (superávit moderado) e recuperação.

Fotos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). O app casa o nome em inglês (`en`) de cada exercício com a base; se não achar, mostra um emoji — e você pode colar uma URL própria ao criar um exercício.


## 6.1 Ciclo, rotação, metas e progresso

- **Ciclo (padrão 6 meses):** a aba Semana mostra o mês do ciclo e quantos dias faltam. Em **⚙ Ciclo** você muda duração, data de início e meta semanal.
- **Rotação automática:** ao fim do ciclo (ou quando quiser) use **Gerar novo ciclo**. Exercícios marcados com 📌 ficam; os demais são trocados por outros do mesmo grupo (composto por composto, isolador por isolador), mantendo séries/reps/descanso. O ciclo antigo continua salvo em **Planos**.
- **Meta semanal:** o modo treino marca o dia como concluído ao terminar (ou use “Marcar concluído”). A barra mostra `feitos/meta` e a aba Progresso mostra as últimas 8 semanas.
- **Peso e medidas:** salve peso (e opcionalmente cintura, braço, peito, coxa) por data, defina uma meta de peso e compare duas datas. O app interpreta com cautela: peso sobe + cintura estável + medidas musculares subindo = sinal favorável de massa magra; cintura subindo junto sugere gordura.
- **Evolução da carga:** por exercício, com 1RM estimado (Epley). Subir carga/reps com a mesma técnica é o melhor indicador prático de ganho de massa.
- A balança sozinha **não** diferencia músculo de gordura. Para isso, use as medidas e/ou bioimpedância/dobras de forma consistente (mesmo horário, mesmas condições).

## 6.2 App instalável (PWA) e offline

- **Instalar:** Android (Chrome) → menu ⋮ → *Instalar app*; iPhone (Safari) → Compartilhar → *Adicionar à Tela de Início*. A aba **Conta** também mostra o botão quando o navegador oferece.
- **Offline:** o app abre sem internet e salva as cargas no aparelho; ao voltar a conexão, o Firebase sincroniza. Fotos já vistas ficam em cache; as nunca abertas aparecem como emoji até ter conexão.
- **Atualizações:** com internet, o app sempre carrega a versão nova (rede primeiro, 3 s de limite; depois usa o cache). Ao mudar a lista de arquivos do app, atualize `SHELL` em `sw.js` e, se quiser forçar limpeza do cache, troque `VERSION`.
- **Testar local:** `npx http-server . -p 5173 -c-1` (o service worker funciona em `localhost`).

## 7. Próximo passo: Flutter (APK)

1. Instale o Flutter: https://docs.flutter.dev/get-started/install (inclui Android Studio + SDK Android). Confira com `flutter doctor`.
2. `flutter create treino_titan`
3. Firebase no Flutter: `dart pub global activate flutterfire_cli` → `flutterfire configure` (usa o **mesmo projeto**) → adicione `firebase_core`, `firebase_auth`, `cloud_firestore`, `google_sign_in`.
4. Reaproveite o **mesmo documento** `users/{uid}/app/state` — o app Flutter e o site ficam sincronizados.
5. Telas equivalentes: Semana, Biblioteca, Cronogramas, Modo treino (o relógio é só um `Timer.periodic` com `endAt`).
6. Gerar APK: `flutter build apk --release` → `build/app/outputs/flutter-apk/app-release.apk`.

## Atalhos úteis

```bash
git add . && git commit -m "mensagem" && git push   # salvar e publicar
firebase deploy                                      # publicar manualmente
```
