import { initializeReports } from './reports.js';
import { 
  auth, 
  db,
  doc,
  getDoc, 
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  onAuthStateChanged,
} from './firebase-config.js';

const AreaName = {
  mecanico: "Mecânico",
  eletronico: "Eletrônico"
};

const SubareaName = {
  geralMec: 'Geral Mecânica',
  geralElet: 'Geral Eletrônica',
  BCM: 'BCM',
  PH: 'PH',
  ADULT: 'ADULT',
  ABS: 'ABS',
  WIPES: 'WIPES',
  ENC: 'ENC'
};

// Configurar event listeners para as abas
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      window.showTab(tabId);
    });
  });
});

// Versão corrigida da função showTab
window.showTab = (tabId) => {
  try {
    // Elementos
    const questionForm = document.querySelector('.question-form');
    const tabs = document.querySelectorAll('.admin-tab-content');
    const buttons = document.querySelectorAll('.tab-btn');

    // Resetar estado
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    questionForm.style.display = 'block';

    // Esconder formulário se não for a aba de perguntas
    if (tabId !== 'questions') {
      questionForm.style.display = 'none';
    }

    // Ativar elementos da aba selecionada
    const activeTab = document.getElementById(`${tabId}Tab`);
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);

    if (!activeTab || !activeButton) {
      throw new Error(`Elementos da aba ${tabId} não encontrados`);
    }

    activeTab.classList.add('active');
    activeButton.classList.add('active');

  } catch (error) {
    console.error("Erro na navegação:", error);
    alert("Erro ao mudar de aba. Recarregue a página.");
  }
};
// ===================== FUNÇÕES GLOBAIS =====================
window.showTab = (tabId) => {
  try {
    // Elementos da interface
    const questionFormSection = document.querySelector('.question-form');
    const tabsContainer = document.querySelector('.admin-tabs');

    // Esconder formulário de perguntas se não for a aba principal
    if (tabId !== 'questions') {
      questionFormSection.classList.add('hidden');
      tabsContainer.classList.add('other-tab-active');
    } else {
      questionFormSection.classList.remove('hidden');
      tabsContainer.classList.remove('other-tab-active');
    }

    // Remover classes ativas de todas as abas
    document.querySelectorAll('.admin-tab-content').forEach(tab => 
      tab.classList.remove('active')
    );
    document.querySelectorAll('.tab-btn').forEach(btn => 
      btn.classList.remove('active')
    );

    // Ativar elementos da aba selecionada
    const tabElement = document.getElementById(`${tabId}Tab`);
    const buttonElement = document.querySelector(`button[data-tab="${tabId}"]`);

    if (!tabElement || !buttonElement) {
      throw new Error(`Elementos da aba ${tabId} não encontrados!`);
    }

    tabElement.classList.add('active');
    buttonElement.classList.add('active');

  } catch (error) {
    console.error("Erro ao mudar aba:", error);
  }
};

// ===================== GERENCIAMENTO DE PERGUNTAS =====================
window.editQuestion = async (questionId) => {
  try {
    const docSnap = await getDoc(doc(db, "questions", questionId));
    
    if (docSnap.exists()) {
      const question = docSnap.data();
      currentImageBase64 = question.imagemBase64 || '';
      
      // Preencher campos
      document.getElementById('questionId').value = questionId;
      document.getElementById('questionText').value = question.text;
      document.getElementById('questionArea').value = question.area;
      document.getElementById('questionSubarea').value = question.subarea;
      document.getElementById('optionA').value = question.options[0];
      document.getElementById('optionB').value = question.options[1];
      document.getElementById('optionC').value = question.options[2];
      document.getElementById('optionD').value = question.options[3];
      document.querySelector(`input[name="correctOption"][value="${question.correctIndex}"]`).checked = true;

      // Exibir imagem existente
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = currentImageBase64 ? 
        `<img src="${currentImageUrl}" class="preview-image">` : 
        '';
    }
  } catch (error) {
    alert("Erro ao editar: " + error.message);
  }
};

// ===================== IMAGEM NA PERGUNTA =====================
let currentImageBase64 = '';

document.getElementById('questionImage').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';

  if (file) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      currentImageBase64 = event.target.result; // Armazena Base64
      preview.innerHTML = `<img src="${currentImageBase64}" class="preview-image">`;
    };
    
    reader.readAsDataURL(file);
  }
});

window.deleteQuestion = async (questionId) => {
  if (confirm("Tem certeza que deseja excluir esta pergunta?")) {
    try {
      await deleteDoc(doc(db, "questions", questionId));
      await loadQuestions();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }
};

window.applyFilters = async () => {
  const area = document.getElementById('filterArea').value;
  const subarea = document.getElementById('filterSubarea').value;
  await loadQuestions(area, subarea);
};

async function loadQuestions(areaFilter = '', subareaFilter = '') {
  try {
    let q = query(collection(db, "questions")); // Inicia a consulta base

    // Aplicar filtro de ÁREA (se fornecido)
    if (areaFilter) {
      q = query(q, where("area", "==", areaFilter));
    }

    // Aplicar filtro de SUBÁREA (se fornecido)
    if (subareaFilter) {
      q = query(q, where("subarea", "==", subareaFilter));
    }

    // Executar consulta e atualizar a tabela
    const querySnapshot = await getDocs(q);
    const tbody = document.getElementById('questionsBody');
    tbody.innerHTML = '';

    querySnapshot.forEach(doc => {
      const question = doc.data();
      tbody.innerHTML += `
        <tr>
          <td>${question.text}
            ${question.imagemBase64 ? 
              `<div class="image-container">
                <button onclick="viewImage('${doc.id}')">Imagem da questão</button>
              </div>
              `:''}
              </td>
          <td>${AreaName[question.area] || question.area}</td>
          <td>${SubareaName[question.subarea] || question.subarea}</td>
          <td>
            ${question.options.map((opt, i) => `
              ${String.fromCharCode(65 + i)} - ${opt}
            `).join('<br>')}
          </td>
          <td>${String.fromCharCode(65 + question.correctIndex)}</td>
          <td>
            ${question.imagemBase64 ? 
              `<img src="${question.imagemBase64}" class="thumbnail">` : 
              ''}
          </td>
          <td>
            <button onclick="editQuestion('${doc.id}')">✏️</button>
            <button onclick="deleteQuestion('${doc.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });

  } catch (error) {
    alert("Erro ao carregar perguntas: " + error.message);
  }
}

const imageCache = {};

async function fetchQuestionImage(questionId) {
  try{
    if(imageCache[questionId]) return imageCache[questionId];
    const questionRef = doc(db,'questions',questionId);
    const questionDoc = await getDoc(questionRef);
    
    if(!questionDoc.exists()){
      throw new Error("Imagem não encontrada",error);
    }
    imageCache[questionId] = questionDoc.data().imagemBase64;
    return imageCache[questionId];
  } catch {
    console.log("Erro na busca da imagem",error)
    throw error;
  }
}


  window.viewImage = async (questionId) => {
  try {
    const imageUrl = await fetchQuestionImage(questionId);
    
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-content">
        <img src="${imageUrl}" alt="Imagem completa da pergunta">
        <button onclick="this.parentElement.parentElement.remove()" class="close-btn">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    alert("Erro ao carregar imagem: " + error.message);
  }
};
// ===================== GERENCIAMENTO DE USUÁRIOS =====================
window.deleteUser = async (userId) => {
  if (confirm("Tem certeza que deseja excluir este usuário?")) {
    try {
      await deleteDoc(doc(db, "users", userId));
      await loadUsers();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }
};

async function loadUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const tbody = document.getElementById('usersBody');
    tbody.innerHTML = '';

    querySnapshot.forEach(doc => {
      const user = doc.data();
      if (user.role === 'admin') return;
      
      tbody.innerHTML += `
        <tr>
          <td>${user.nome}</td>
          <td>${user.email}</td>
          <td>${AreaName[user.area] || user.area}</td>
          <td>${SubareaName[user.subarea] || user.subarea}</td>
          <td>
            <button onclick="deleteUser('${doc.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    alert("Erro ao carregar usuários: " + error.message);
  }
}

// ===================== GERENCIAMENTO DE RESULTADOS =====================
window.viewDetails = async (resultId) => {
  try {
    const docSnap = await getDoc(doc(db, "results", resultId));
    const result = docSnap.data();

    // Criar elementos
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'result-modal';

    // Conteúdo do modal
    let content = `<h2>Detalhes do Resultado</h2>`;
    
    // Seção de estatísticas
    content += `
      <div class="stats">
        <p><strong>Usuário:</strong> ${result.nome}</p>
        <p><strong>Pontuação:</strong> ${result.score}/10</p>
        <p><strong>Data:</strong> ${new Date(result.timestamp?.toDate()).toLocaleString()}</p>
      </div>
    `;

    // Detalhes das respostas
    content += `<h3>Respostas:</h3><ul>`;

    for (const [questionId, answerIndex] of Object.entries(result.answers)) {
      const questionDoc = await getDoc(doc(db, "questions", questionId));
      const question = questionDoc.data();
      
      content += `
        <li>
          <p><strong>Pergunta:</strong> ${question?.text || 'Pergunta não encontrada'}</p>
          ${question?.imagemBase64 ? `<img src="${question.imagemBase64}" alt="Imagem da pergunta">` : ''}
          <p><strong>Sua resposta:</strong> ${question?.options?.[answerIndex] || 'Resposta inválida'}</p>
          <p><strong>Resposta correta:</strong> ${question?.options?.[question.correctIndex]}</p>
        </li>
      `;
    }

    content += `</ul>`;

    // Botão de fechar
    content += `
      <button class="modal-close-btn">
        Fechar
      </button>
    `;

    modal.innerHTML = content;
    
    // Adicionar ao DOM
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn.onclick = () => {
      modal.remove();
      overlay.remove();
    };

    overlay.onclick = () => {
      modal.remove();
      overlay.remove();
    };

  } catch (error) {
    alert("Erro ao visualizar: " + error.message);
  }
};

async function loadResults() {
  try {
    const querySnapshot = await getDocs(collection(db, "results"));
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    querySnapshot.forEach(doc => {
      const result = doc.data();
      tbody.innerHTML += `
        <tr>
          <td>${result.nome}</td>
          <td>${result.email}</td>
          <td>${result.area}</td>
          <td>${result.subarea}</td>
          <td>${new Date(result.timestamp?.toDate()).toLocaleString()}</td>
          <td>${result.score}/10</td>
          <td>
            <button onclick="viewDetails('${doc.id}')">🔍</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    alert("Erro ao carregar resultados: " + error.message);
  }
}

// ===================== CONFIGURAÇÃO INICIAL =====================
function setupQuestionForm() {
  document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      // Coletar dados
      const options = [
        document.getElementById('optionA').value.trim(),
        document.getElementById('optionB').value.trim(),
        document.getElementById('optionC').value.trim(),
        document.getElementById('optionD').value.trim()
      ];
      
      const correctOption = document.querySelector('input[name="correctOption"]:checked');
      if (!correctOption) {
        alert("Selecione a opção correta!");
        return;
      }
  
      // Criar objeto de dados
      const questionData = {
        text: document.getElementById('questionText').value.trim(),
        area: document.getElementById('questionArea').value,
        subarea: document.getElementById('questionSubarea').value,
        options,
        correctIndex: parseInt(correctOption.value),
        imagemBase64: currentImageBase64 || null // Adiciona Base64
      };
  
      // Validação
      if (options.some(opt => opt === "")) {
        alert("Preencha todas as opções!");
        return;
      }
  
      // Salvar/Atualizar
      const questionId = document.getElementById('questionId').value;
      if (questionId) {
        await updateDoc(doc(db, "questions", questionId), questionData);
      } else {
        await addDoc(collection(db, "questions"), questionData);
      }
  
      // Resetar formulário
      e.target.reset();
      document.getElementById('questionId').value = '';
      document.getElementById('imagePreview').innerHTML = '';
      currentImageBase64 = '';
      document.getElementById('questionImage').value = '';
  
      await loadQuestions();
  
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  });
}

// ===================== VERIFICAÇÃO DE AUTENTICAÇÃO =====================
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      // Verificar se é admin
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        await auth.signOut();
        window.location.href = 'index.html';
        return;
      }

      // Carregar conteúdo
      await loadQuestions();
      await loadUsers();
      await loadResults();
      setupQuestionForm();
      window.showTab('questions');

    } catch (error) {
      console.error("Erro no painel admin:", error);
      window.location.href = 'index.html';
    }
    await initializeReports();
  });
});
