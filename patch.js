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
