import { 
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onAuthStateChanged
} from './firebase-config.js';

let questions = [];
let currentQuestionIndex = 0;
const userAnswers = {};

// ========== FUNÇÕES GLOBAIS ==========
window.renderQuestions = () => {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  const q = questions[currentQuestionIndex];
  
  const questionHTML = `
    <div class="question-card">
      <div class="progress">Questão ${currentQuestionIndex + 1} de ${questions.length}</div>
      <h3>${q.text}</h3>
      ${q.options.map((opt, i) => `
        <label>
          <input 
            type="radio" 
            name="${q.id}" 
            value="${i}"
            ${userAnswers[q.id] === i ? 'checked' : ''}
          >
          ${String.fromCharCode(65 + i)}) ${opt}
        </label><br>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = questionHTML;
  window.updateNavigationControls();
};

window.updateNavigationControls = () => {
  const navHTML = `
    <div class="navigation">
      <button 
        onclick="window.previousQuestion()" 
        ${currentQuestionIndex === 0 ? 'disabled' : ''}
      >
        ← Anterior
      </button>
      
      ${currentQuestionIndex === questions.length - 1 
        ? '<button onclick="window.submitQuiz()" class="submit-btn">Enviar Quiz</button>' 
        : '<button onclick="window.nextQuestion()">Próxima →</button>'}
    </div>
  `;
  
  document.getElementById('navigation').innerHTML = navHTML;
};

window.previousQuestion = () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    window.saveAnswer();
    window.renderQuestions();
  }
};

window.nextQuestion = () => {
  if (currentQuestionIndex < questions.length - 1) {
    window.saveAnswer();
    currentQuestionIndex++;
    window.renderQuestions();
  }
};

window.saveAnswer = () => {
  const q = questions[currentQuestionIndex];
  const selected = document.querySelector(`input[name="${q.id}"]:checked`);
  if (selected) {
    userAnswers[q.id] = parseInt(selected.value);
  }
};

// ========== CARREGAR PERGUNTAS ==========
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    const generalSubarea = userData.area === 'mecanico' ? 'geralMec' : 'geralElet';

    // Buscar perguntas
    const specificQuery = query(
      collection(db, "questions"),
      where("subarea", "==", userData.subarea)
    );
    const generalQuery = query(
      collection(db, "questions"),
      where("subarea", "==", generalSubarea)
    );

    const [specificSnapshot, generalSnapshot] = await Promise.all([
      getDocs(specificQuery),
      getDocs(generalQuery)
    ]);

    // Selecionar aleatoriamente
    const allSpecific = specificSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const allGeneral = generalSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    questions = [
      ...allSpecific.sort(() => Math.random() - 0.5).slice(0, 4),
      ...allGeneral.sort(() => Math.random() - 0.5).slice(0, 6)
    ].sort(() => Math.random() - 0.5);

    window.renderQuestions();

  } catch (error) {
    alert(error.message);
    window.location.href = 'index.html';
  }
});

// ========== ENVIAR QUIZ ==========
window.submitQuiz = async () => {
  try {
    // Salvar última resposta e esconder elementos
    window.saveAnswer();
    document.getElementById('questionsContainer').classList.add('hidden');
    document.querySelector('.navigation').classList.add('hidden');

    // Obter dados do usuário
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userDoc.data();

    // Calcular pontuação ANTES de usar
    const correctCount = calculateScore(userAnswers);

    // Criar resultado visual
    let resultHTML = `<h2 class="score-header">Você acertou ${correctCount}/10 questões!</h2>`;

    questions.forEach((q, index) => {
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.correctIndex;
      
      resultHTML += `
        <div class="result-item ${isCorrect ? 'correct' : 'wrong'}">
          <h3>Pergunta ${index + 1}: ${q.text}</h3>
          <p>Sua resposta: ${userAnswer !== undefined 
            ? `${String.fromCharCode(65 + userAnswer)}) ${q.options[userAnswer]}` 
            : 'Não respondida'}</p>
          ${!isCorrect ? `
            <p class="correct-answer">
              Resposta correta: ${String.fromCharCode(65 + q.correctIndex)}) ${q.options[q.correctIndex]}
            </p>` : ''}
        </div>
      `;
    });

    // Exibir resultados
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = resultHTML;
    resultDiv.style.display = 'block';

    // Salvar no Firestore (APENAS UMA VEZ)
    await addDoc(collection(db, "results"), {
      nome: userData.nome, // Usar dados do Firestore
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      score: correctCount,
      timestamp: new Date()
    });

  } catch (error) {
    alert("Erro ao enviar: " + error.message);
  }
};

// ========== CALCULAR PONTUAÇÃO ==========
const calculateScore = (answers) => {
  return questions.reduce((acc, q) => {
    return acc + (answers[q.id] === q.correctIndex ? 1 : 0);
  }, 0);
};