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
      await checkUserRole(userCredential.user.uid); // Verifica o papel do usuário
    } catch (error) {
      alert("Erro no login: " + error.message);
    }
  });

  // Registro
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const area = document.getElementById('area').value;
    const subarea = document.getElementById('subarea').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Salva dados adicionais no Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        nome: document.getElementById('nome').value.trim(),        email: email,
        area: area,
        subarea: subarea.toUpperCase().replace(" ", "_"),
        role: 'user',
        createdAt: new Date()
      });

      alert('Registro realizado! Faça login.');
      switchTab('login'); // Volta para a aba de login
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
  
  // Esconde todas as abas e remove a classe 'active'
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  // Ativa a aba selecionada
  if (tab === 'login') {
    document.getElementById('loginForm').classList.add('active');
    document.querySelector('.tab:first-child').classList.add('active');
  } else {
    document.getElementById('registerForm').classList.add('active');
    document.querySelector('.tab:last-child').classList.add('active');
  }
}

// ========== VERIFICAÇÃO DE PAPEL (ADMIN/USER) ==========
async function checkUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
      await auth.signOut();
      throw new Error("Usuário não registrado no sistema!");
    }

    const userData = userDoc.data();
    const targetPage = userData.role === 'admin' ? 'admin.html' : 'quiz.html';
    window.location.href = targetPage; // Redireciona conforme o papel

  } catch (error) {
    alert(error.message);
    window.location.href = 'index.html'; // Força logout em caso de erro
  }
}

// ========== MONITORAMENTO DE AUTENTICAÇÃO ==========
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    // Redireciona para o login se não estiver autenticado
    if (!user && !window.location.href.includes('index.html')) {
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