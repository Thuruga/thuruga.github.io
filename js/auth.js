import { 
  auth, 
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc
} from './firebase-config.js';

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm && registerForm) {
    setupForms();
    setupTabs();
    checkAuthState();
  }
});

// ========== FORMULÁRIOS ==========
function setupForms() {
  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await checkUserRole(userCredential.user.uid);
    } catch (error) {
      alert("Erro no login: " + error.message);
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Obter elementos do DOM
  const nomeInput = document.getElementById('regNome');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const areaInput = document.getElementById('area');
  const subareaInput = document.getElementById('subarea');

  // Verificar se elementos existem
  if (!nomeInput || !emailInput || !passwordInput || !areaInput || !subareaInput) {
    alert("Erro: Campos não encontrados!");
    return;
  }

  // Obter valores
  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const area = areaInput.value;
  const subarea = subareaInput.value.toUpperCase().replace(" ", "_");

  // Verificar campos vazios
  if (!nome || !email || !password || !area || !subarea) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, "users", userCredential.user.uid), {
      nome: nome, // Já foi feito .trim()
      email: email,
      area: area,
      subarea: subarea,
      role: 'user',
      createdAt: new Date()
    });

    alert('Registro realizado! Faça login.');
    switchTab('login');
  } catch (error) {
    alert("Erro no registro: " + error.message);
  }
});
}

// ========== GERENCIAMENTO DE ABAS ==========
function setupTabs() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      const tabType = button.textContent.toLowerCase().includes('login') ? 'login' : 'register';
      switchTab(tabType);
    });
  });
}

function switchTab(tab) {
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  if (tab === 'login') {
    document.getElementById('loginForm').classList.add('active');
    document.querySelector('.tab:first-child').classList.add('active');
  } else {
    document.getElementById('registerForm').classList.add('active');
    document.querySelector('.tab:last-child').classList.add('active');
  }
}

// ========== VERIFICAÇÃO DE PAPEL ==========
async function checkUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
      await auth.signOut();
      throw new Error("Usuário não registrado!");
    }

    const userData = userDoc.data();
    const targetPage = userData.role === 'admin' ? 'admin.html' : 'quiz.html';
    window.location.href = targetPage;

  } catch (error) {
    alert(error.message);
    window.location.href = 'index.html';
  }
}

// ========== MONITORAMENTO DE AUTENTICAÇÃO ==========
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (!user && !window.location.pathname.endsWith('index.html')) {
      window.location.href = 'index.html';
    }
  });
}

// ========== LOGOUT ==========
export const logout = async () => {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Erro no logout:", error);
  }
};
