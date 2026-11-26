// Integração opcional com Firebase (Auth Google + Firestore).
// Se js/firebase-config.js não existir, o app funciona 100% local.
import { state, applyRemote, setSyncHook, snapshot } from './store.js';

const SDK = '10.14.1';
let api = null;        // { auth, db, ... }
let user = null;
let unsub = null;
let pushTimer = null;
const statusListeners = new Set();
let status = { ready: false, configured: false, user: null, message: '' };

function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((fn) => fn(status));
}
export function onStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }
export function getStatus() { return status; }

export async function initFirebase() {
  let cfg;
  try {
    ({ firebaseConfig: cfg } = await import('./firebase-config.js'));
  } catch (e) {
    setStatus({ ready: true, configured: false, message: 'Firebase não configurado (modo local).' });
    return;
  }
  if (!cfg || !cfg.apiKey || cfg.apiKey === 'COLE_AQUI') {
    setStatus({ ready: true, configured: false, message: 'Preencha js/firebase-config.js para ativar a nuvem.' });
    return;
  }
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(cfg);
    api = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    setStatus({ ready: true, configured: true, message: 'Firebase conectado. Entre com o Google para sincronizar.' });

    authMod.onAuthStateChanged(api.auth, (u) => {
      user = u;
      setStatus({ user: u ? { name: u.displayName, email: u.email, photo: u.photoURL } : null });
      if (unsub) { unsub(); unsub = null; }
      if (u) startSync();
      else setSyncHook(null);
    });
  } catch (e) {
    setStatus({ ready: true, configured: false, message: 'Erro ao iniciar Firebase: ' + e.message });
  }
}

function docRef() {
  const { doc } = api.fsMod;
  return doc(api.db, 'users', user.uid, 'app', 'state');
}

function startSync() {
  const { onSnapshot, getDoc, setDoc } = api.fsMod;
  // 1) envia local se a nuvem estiver vazia; 2) escuta mudanças remotas
  getDoc(docRef()).then((snap) => {
    if (!snap.exists()) setDoc(docRef(), JSON.parse(JSON.stringify(snapshot())));
  }).catch((e) => setStatus({ message: 'Erro ao ler a nuvem: ' + e.message }));

  unsub = onSnapshot(docRef(), (snap) => {
    if (snap.exists() && !snap.metadata.hasPendingWrites) {
      if (applyRemote(snap.data())) setStatus({ message: 'Atualizado da nuvem.' });
    }
  }, (e) => setStatus({ message: 'Erro de sincronização: ' + e.message }));

  setSyncHook((snap) => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      setDoc(docRef(), JSON.parse(JSON.stringify(snap)))
        .then(() => setStatus({ message: 'Salvo na nuvem ✓' }))
        .catch((e) => setStatus({ message: 'Erro ao salvar: ' + e.message }));
    }, 800);
  });
}

export async function signIn() {
  if (!api) return;
  const { GoogleAuthProvider, signInWithPopup } = api.authMod;
  try { await signInWithPopup(api.auth, new GoogleAuthProvider()); }
  catch (e) { setStatus({ message: 'Login cancelado/erro: ' + e.message }); }
}
export async function signOutUser() {
  if (!api) return;
  await api.authMod.signOut(api.auth);
}
