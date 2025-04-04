// reports.js
import { 
  db,
  collection,
  getDocs
} from './firebase-config.js';

// ========== CONFIGURAÇÃO DOS GRÁFICOS ==========
const chartConfig = {
  area: {
    type: 'bar',
    elementId: 'areaChart',
    label: 'Média de Acertos por Área',
    backgroundColor: ['#4e73df', '#1cc88a'],
    options: {
      scales: {
        y: { beginAtZero: true, max: 10 }
      }
    }
  },
  subarea: {
    type: 'pie',
    elementId: 'subareaChart',
    label: 'Distribuição por Subárea',
    backgroundColor: ['#4e73df', '#36b9cc', '#1cc88a', '#f6c23e']
  },
  questions: {
    type: 'horizontalBar',
    elementId: 'questionStatsChart',
    label: 'Taxa de Acerto por Pergunta (%)',
    backgroundColor: '#4e73df',
    options: {
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, max: 100 }
      }
    }
  },
  progress: {
    type: 'line',
    elementId: 'progressChart',
    label: 'Evolução Mensal de Desempenho',
    borderColor: '#4e73df',
    options: {
      scales: {
        y: { beginAtZero: true, max: 10 }
      }
    }
  }
};

// ========== FUNÇÕES PRINCIPAIS ==========
export async function initializeReports() {
  try {
    const [resultsSnapshot, usersSnapshot, questionsSnapshot] = await Promise.all([
      getDocs(collection(db, "results")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "questions"))
    ]);

    const results = resultsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const users = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const questions = questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const processedData = processReportData(results, users, questions);
    renderAllCharts(processedData);
    
  } catch (error) {
    showErrorMessage('reportsTab', error);
    console.error("Erro ao carregar relatórios:", error);
  }
}

// ========== PROCESSAMENTO DE DADOS ==========
function processReportData(results, users, questions) {
  const data = {
    areas: {},
    subareas: {},
    questions: {},
    progress: {}
  };

  // Mapeamento rápido de usuários
  const userMap = new Map();
  users.forEach(user => userMap.set(user.id, user));

  results.forEach(result => {
    // Processar dados por área/subárea
    const user = userMap.get(result.userId);
    if (user) {
      updateMetric(data.areas, user.area, result.score);
      updateMetric(data.subareas, user.subarea, result.score);
    }

    // Processar estatísticas por pergunta
    if (result.answers) {
      processQuestionsData(data.questions, questions, result.answers);
    }

    // Processar progresso temporal
    if (result.timestamp) {
      const date = result.timestamp.toDate();
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      updateMetric(data.progress, monthKey, result.score);
    }
  });

  return data;
}

// ========== FUNÇÕES AUXILIARES ==========
function updateMetric(metric, key, value) {
  if (!key || typeof value !== 'number') return;
  
  metric[key] = metric[key] || { total: 0, count: 0 };
  metric[key].total += value;
  metric[key].count++;
}

function processQuestionsData(metrics, questions, answers) {
  questions.forEach(question => {
    const answer = answers[question.id];
    if (typeof answer === 'undefined') return;

    metrics[question.id] = metrics[question.id] || {
      correct: 0,
      total: 0,
      text: question.text?.substring(0, 50) || 'Pergunta sem texto'
    };

    metrics[question.id].total++;
    if (answer === question.correctIndex) {
      metrics[question.id].correct++;
    }
  });
}

function renderAllCharts(data) {
  Object.entries(chartConfig).forEach(([key, config]) => {
    const chartData = data[key] || {};
    const validEntries = Object.entries(chartData)
      .filter(([_, value]) => value.count > 0);

    if (validEntries.length === 0) {
      showNoDataMessage(config.elementId);
      return;
    }

    renderChart({
      labels: validEntries.map(([label]) => label),
      values: validEntries.map(([_, value]) => calculateAverage(value)),
      config
    });
  });
}

function calculateAverage({ total, count }) {
  return count > 0 ? (total / count) : 0;
}

function renderChart({ labels, values, config }) {
  const ctx = document.getElementById(config.elementId);
  if (!ctx) return;

  // Destruir gráfico existente
  if (ctx.chart) ctx.chart.destroy();

  const isPercentage = config.elementId === 'questionStatsChart';
  const formattedValues = isPercentage ? values.map(v => v * 10) : values;

  ctx.chart = new Chart(ctx, {
    type: config.type,
    data: {
      labels: labels,
      datasets: [{
        label: config.label,
        data: formattedValues,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
        borderWidth: 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = isPercentage ? context.raw : context.raw.toFixed(1);
              return `${context.dataset.label}: ${value}${isPercentage ? '%' : ''}`;
            }
          }
        }
      },
      ...config.options
    }
  });
}

function showNoDataMessage(elementId) {
  const container = document.getElementById(elementId)?.parentElement;
  if (container) {
    container.innerHTML = `
      <div class="no-data-message">
        Nenhum dado disponível para esta visualização
      </div>
    `;
  }
}

function showErrorMessage(containerId, error) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <h3>⚠️ Erro ao carregar relatórios</h3>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Recarregar</button>
      </div>
    `;
  }
}