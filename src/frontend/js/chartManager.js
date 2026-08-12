import { certificationPaths } from "./data.js";
import { storageManager } from "./storageManager.js";

const A3_CHART_COLORS = {
  deepSea: "#001863",
  techBlue: "#0033FF",
  pinkNic: "#F53199",
  skyFrost: "#39D0FF",
  surface: "#FFFFFF",
  textOnLight: "#00083D",
  textOnDark: "#F5F7FF",
};

function getA3ChartColors(isDark) {
  return {
    text: isDark ? A3_CHART_COLORS.textOnDark : A3_CHART_COLORS.textOnLight,
    grid: isDark ? "rgba(245, 247, 255, 0.16)" : "rgba(0, 8, 61, 0.12)",
    fill: isDark ? "rgba(0, 51, 255, 0.18)" : "rgba(0, 51, 255, 0.1)",
    line: A3_CHART_COLORS.techBlue,
    point: A3_CHART_COLORS.pinkNic,
    pointBorder: isDark ? A3_CHART_COLORS.deepSea : A3_CHART_COLORS.surface,
    tooltipBg: isDark ? "#101B4A" : A3_CHART_COLORS.textOnLight,
  };
}

// ============================================================================
// GRÁFICO DE RADAR - TELA DE RESULTADOS
// ============================================================================
export async function renderRadarChart(results, currentCertInfo) {
  let canvas = document.getElementById("radarChart");

  // Recuperação de segurança do canvas
  if (!canvas) {
    // Find the container by looking for the parent of the canvas
    const container = document.querySelector(
      "#screen-results .relative.w-full",
    );
    if (container && container.querySelector("canvas")) {
      canvas = container.querySelector("canvas");
    } else if (container) {
      container.innerHTML = '<canvas id="radarChart"></canvas>';
      canvas = document.getElementById("radarChart");
    } else return;
  }

  if (!results?.domainScores) return;
  if (!currentCertInfo?.domains)
    currentCertInfo = certificationPaths?.[results.certId];

  if (typeof Chart === "undefined") {
    if (window.chartJsLoaded) await window.chartJsLoaded;
    else return;
  }

  if (window.radarChartInstance) {
    window.radarChartInstance.destroy();
    window.radarChartInstance = null;
  }

  const labels = [];
  const data = [];
  let totalQuestionsAnswered = 0;

  // CORREÇÃO: Iterar sobre os resultados reais que o QuizEngine computou
  Object.entries(results.domainScores).forEach(([domainId, scoreData]) => {
    if (scoreData && scoreData.total > 0) {
      totalQuestionsAnswered += scoreData.total;
      data.push(
        parseFloat(((scoreData.correct / scoreData.total) * 100).toFixed(1)),
      );

      // Tenta achar o nome bonito no config (fazendo match flexível)
      const domainInfo = currentCertInfo?.domains?.find(
        (d) =>
          String(d.id) === String(domainId) ||
          parseFloat(d.id) === parseFloat(domainId),
      );

      const name = domainInfo ? domainInfo.name : `Domínio ${domainId}`;
      labels.push(name.replace(/^Domínio \d+:\s*/, ""));
    }
  });

  const hasData = totalQuestionsAnswered > 0;
  const container = canvas.parentElement;

  if (!hasData) {
    canvas.style.display = "none";
    if (container && !container.querySelector(".radar-error-msg")) {
      const errorMsg = document.createElement("div");
      errorMsg.className =
        "radar-error-msg flex flex-col items-center justify-center h-full text-center p-4 gap-3 absolute inset-0 bg-white dark:bg-slate-800 z-10";
      errorMsg.innerHTML = `
                <i class="fa-solid fa-circle-exclamation text-3xl text-orange-400"></i>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Sem dados computados.</p>
            `;
      container.appendChild(errorMsg);
    }
    return;
  }

  canvas.style.display = "block";
  const oldError = container?.querySelector(".radar-error-msg");
  if (oldError) oldError.remove();

  const isDark = document.documentElement.classList.contains("dark");
  const chartColors = getA3ChartColors(isDark);

  const ctx = canvas.getContext("2d");
  window.radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Desempenho (%)",
          data,
          backgroundColor: chartColors.fill,
          borderColor: chartColors.line,
          borderWidth: 2,
          pointBackgroundColor: chartColors.point,
          pointBorderColor: chartColors.pointBorder,
          pointHoverBackgroundColor: chartColors.pointBorder,
          pointHoverBorderColor: chartColors.point,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 40, right: 40, top: 20, bottom: 20 } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: chartColors.text,
            backdropColor: "transparent",
            callback: (v) => v + "%",
            font: { size: 10 },
          },
          grid: { color: chartColors.grid },
          angleLines: { color: chartColors.grid },
          pointLabels: {
            color: chartColors.text,
            font: { size: 10, weight: "600" },
            callback(label) {
              const words = label.split(" ");
              const lines = [];
              let cur = "";
              words.forEach((w) => {
                if ((cur + w).length > 15) {
                  if (cur) lines.push(cur.trim());
                  cur = w + " ";
                } else cur += w + " ";
              });
              if (cur) lines.push(cur.trim());
              return lines;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: chartColors.text,
            font: { size: 12, weight: "bold" },
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          titleColor: A3_CHART_COLORS.textOnDark,
          bodyColor: A3_CHART_COLORS.textOnDark,
          borderColor: chartColors.line,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}%`,
          },
        },
      },
    },
  });
}

// ============================================================================
// DASHBOARD GLOBAL
// ============================================================================
export function calculateGlobalDomainStats(targetCertId) {
  let rawHistory = storageManager.getHistory();
  if (!Array.isArray(rawHistory)) {
    rawHistory = [];
    storageManager.clearHistory();
  }
  if (rawHistory.length === 0) return null;

  const domainAccumulator = {};
  let totalQuizzes = 0,
    totalQuestionsAnswered = 0,
    totalCorrect = 0;

  const history = rawHistory.filter(
    (q) => q && q.certId && q.domainScores && q.certId === targetCertId,
  );

  history.forEach((quiz) => {
    totalQuizzes++;
    totalQuestionsAnswered += quiz.total || 0;
    totalCorrect += quiz.score || 0;
    if (quiz.domainScores && typeof quiz.domainScores === "object") {
      Object.entries(quiz.domainScores).forEach(([domainId, scoreData]) => {
        if (!scoreData || typeof scoreData !== "object") return;
        if (!domainAccumulator[domainId])
          domainAccumulator[domainId] = { total: 0, correct: 0 };
        domainAccumulator[domainId].total += scoreData.total || 0;
        domainAccumulator[domainId].correct += scoreData.correct || 0;
      });
    }
  });

  const domainStats = {};
  const labels = [];
  const percentages = [];

  Object.entries(domainAccumulator).forEach(([domainId, data]) => {
    if (!data || data.total <= 0) return;
    const percentage = (data.correct / data.total) * 100;
    let domainName = domainId;
    if (certificationPaths) {
      for (const certPath of Object.values(certificationPaths)) {
        if (!certPath || !Array.isArray(certPath.domains)) continue;
        const domain = certPath.domains.find((d) => d?.id === domainId);
        if (domain?.name) {
          domainName = domain.name;
          break;
        }
      }
    }
    const cleanName = domainName.replace(/^Domínio \d+:\s*/, "");
    let formattedLabel = cleanName;
    if (cleanName.length > 20) {
      const words = cleanName.split(" ");
      const lines = [];
      let cur = "";
      words.forEach((w) => {
        if ((cur + w).length > 20) {
          if (cur) lines.push(cur.trim());
          cur = w + " ";
        } else cur += w + " ";
      });
      if (cur) lines.push(cur.trim());
      formattedLabel = lines;
    }
    domainStats[domainId] = {
      name: cleanName,
      percentage: percentage.toFixed(1),
      total: data.total,
      correct: data.correct,
    };
    labels.push(formattedLabel);
    percentages.push(percentage.toFixed(1));
  });

  if (labels.length === 0) return null;
  const avgScore =
    totalQuestionsAnswered > 0
      ? ((totalCorrect / totalQuestionsAnswered) * 100).toFixed(1)
      : 0;
  return {
    domainStats,
    summary: { totalQuizzes, totalQuestionsAnswered, totalCorrect, avgScore },
    labels,
    percentages,
  };
}

export async function renderGlobalRadarChart() {
  const canvas = document.getElementById("globalRadarChart");
  const emptyState = document.getElementById("global-chart-empty");
  const chartContainer = document.getElementById("global-chart-container");
  const statsContainer = document.getElementById("global-stats-summary");
  if (!canvas) return;

  const certSelect = document.getElementById("certification-select");
  const currentCertId = certSelect ? certSelect.value : "clf-c02";
  const stats = calculateGlobalDomainStats(currentCertId);

  if (!stats || stats.labels.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (chartContainer) chartContainer.classList.add("hidden");
    if (statsContainer) statsContainer.classList.add("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (chartContainer) chartContainer.classList.remove("hidden");
  if (statsContainer) statsContainer.classList.remove("hidden");

  const totalQuizzesEl = document.getElementById("total-quizzes");
  const avgScoreEl = document.getElementById("avg-score");
  const totalQuestionsEl = document.getElementById("total-questions");
  if (totalQuizzesEl) totalQuizzesEl.textContent = stats.summary.totalQuizzes;
  if (avgScoreEl) avgScoreEl.textContent = stats.summary.avgScore + "%";
  if (totalQuestionsEl)
    totalQuestionsEl.textContent = stats.summary.totalQuestionsAnswered;

  if (typeof Chart === "undefined") {
    if (window.chartJsLoaded) {
      await window.chartJsLoaded;
    } else return;
  }

  if (window.globalRadarChartInstance) {
    window.globalRadarChartInstance.destroy();
    window.globalRadarChartInstance = null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains("dark");
  const chartColors = getA3ChartColors(isDark);

  window.globalRadarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: stats.labels,
      datasets: [
        {
          label: "Desempenho Médio (%)",
          data: stats.percentages,
          backgroundColor: chartColors.fill,
          borderColor: chartColors.line,
          borderWidth: 2,
          pointBackgroundColor: chartColors.point,
          pointBorderColor: chartColors.pointBorder,
          pointHoverBackgroundColor: chartColors.pointBorder,
          pointHoverBorderColor: chartColors.point,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 40, right: 40, top: 20, bottom: 20 } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: chartColors.text,
            backdropColor: "transparent",
            callback: (v) => v + "%",
            font: { size: 10 },
          },
          grid: { color: chartColors.grid },
          angleLines: { color: chartColors.grid },
          pointLabels: {
            color: chartColors.text,
            font: { size: 10, weight: "600" },
            callback(label) {
              const words = (
                Array.isArray(label) ? label.join(" ") : label
              ).split(" ");
              const lines = [];
              let cur = "";
              words.forEach((w) => {
                if ((cur + w).length > 15) {
                  if (cur) lines.push(cur.trim());
                  cur = w + " ";
                } else cur += w + " ";
              });
              if (cur) lines.push(cur.trim());
              return lines;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: chartColors.text,
            font: { size: 12, weight: "bold" },
            padding: 10,
          },
        },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          titleColor: A3_CHART_COLORS.textOnDark,
          bodyColor: A3_CHART_COLORS.textOnDark,
          borderColor: chartColors.line,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label(context) {
              const domainId = Object.keys(stats.domainStats)[
                context.dataIndex
              ];
              const d = stats.domainStats[domainId];
              return [
                `${context.dataset.label}: ${context.parsed.r}%`,
                `${d.correct} de ${d.total} questões`,
              ];
            },
          },
        },
      },
    },
  });
}


export function renderPerformanceLineChart(history, domainFilter = 'geral') {
  const canvas = document.getElementById("performanceLineChart");
  if (!canvas) {
    console.error("Canvas element 'performanceLineChart' not found.");
    return;
  }

  if (!history || history.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#9CA3AF" : "#6B7280";
    ctx.textAlign = "center";
    ctx.fillText("Nenhum simulado finalizado ainda.", canvas.width / 2, canvas.height / 2);
    if (window.performanceLineChartInstance) {
      window.performanceLineChartInstance.destroy();
      window.performanceLineChartInstance = null;
    }
    return;
  }

  if (window.performanceLineChartInstance) {
    window.performanceLineChartInstance.destroy();
    window.performanceLineChartInstance = null;
  }

  const isDark = document.documentElement.classList.contains("dark");
  const chartColors = getA3ChartColors(isDark);
  const ctx = canvas.getContext("2d");

  const labels = history.map((_, index) => `Simulado ${index + 1}`);
  let dataPoints = [];

  if (domainFilter === 'geral') {
    dataPoints = history.map(h => h.percentage || 0);
  } else {
    dataPoints = history.map(h => {
      if (!h.domainScores || !h.domainScores[domainFilter]) return 0;
      return h.domainScores[domainFilter].percentage || 0;
    });
  }

  let gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, chartColors.fill);
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  window.performanceLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: domainFilter === 'geral' ? 'Nota Geral (%)' : `Nota: ${domainFilter} (%)`,
        data: dataPoints,
        borderColor: chartColors.line,
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: chartColors.point,
        pointBorderColor: chartColors.pointBorder,
        pointHoverBackgroundColor: chartColors.pointBorder,
        pointHoverBorderColor: chartColors.point,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: chartColors.grid, drawBorder: false },
          ticks: { color: chartColors.text, padding: 10 }
        },
        x: {
          grid: { display: false },
          ticks: { color: chartColors.text, padding: 10 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          titleColor: A3_CHART_COLORS.textOnDark,
          bodyColor: A3_CHART_COLORS.textOnDark,
          borderColor: chartColors.line,
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Nota: ${context.parsed.y}%`;
            }
          }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      }
    }
  });
}

