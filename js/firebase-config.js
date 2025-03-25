import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js"; // Correção importante aqui

const firebaseConfig = {
  apiKey: "AIzaSyBSDlff_k_i0_4O8J2UIXS67kDY2H5pFuI",
  authDomain: "paperless-kc.firebaseapp.com",
  projectId: "paperless-kc",
  messagingSenderId: "11444788144",
  appId: "1:11444788144:web:454a9c37faec71d5d69475"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserSessionPersistence)
  .then(() => console.log("Persistência configurada!"))
  .catch((error) => console.error("Erro na persistência:", error));

export { 
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  limit,
  Timestamp
};
