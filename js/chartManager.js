/**
 * chartManager.js - Gerenciador de Gráficos (Chart.js)
 */

import { certificationPaths } from './data.js';
import { storageManager } from './storageManager.js';

// ============================================================================
// GRÁFICO DE RADAR (CHART.JS) - TELA DE RESULTADOS
// ============================================================================
export async function renderRadarChart(results, currentCertInfo) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
        if (window.chartJsLoaded) await window.chartJsLoaded;
        else return;
    }

    if (window.radarChartInstance) window.radarChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    const labels = [];
    const data = [];

    if (!currentCertInfo || !currentCertInfo.domains) return;

    currentCertInfo.domains.forEach(domain => {
        const scoreData = results.domainScores[domain.id];
        if (scoreData && scoreData.total > 0) {
            labels.push(domain.name);
            const percentage = (scoreData.correct / scoreData.total) * 100;
            data.push(percentage.toFixed(1));
        }
    });

    if (labels.length === 0) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';

    window.radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Desempenho (%)',
                data: data,
                backgroundColor: 'rgba(255, 153, 0, 0.2)',
                borderColor: '#ff9900',
                borderWidth: 2,
                pointBackgroundColor: '#ff9900',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff9900',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 40, right: 40, top: 20, bottom: 20 }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: textColor,
                        backdropColor: 'transparent',
                        callback: function(value) { return value + '%'; },
                        font: { size: 10 }
                    },
                    grid: { color: gridColor },
                    angleLines: { color: gridColor },
                    pointLabels: {
                        color: textColor,
                        font: { size: 10, weight: '600' },
                        callback: function(label) {
                            let cleanLabel = Array.isArray(label) ? label.join(' ') : label;
                            cleanLabel = cleanLabel.replace(/^Domínio \d+: /, '');
                            const words = cleanLabel.split(' ');
                            const lines = [];
                            let currentLine = '';
                            words.forEach(word => {
                                if ((currentLine + word).length > 15) {
                                    if (currentLine) lines.push(currentLine.trim());
                                    currentLine = word + ' ';
                                } else {
                                    currentLine += word + ' ';
                                }
                            });
                            if (currentLine) lines.push(currentLine.trim());
                            return lines; 
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, position: 'top',
                    labels: { color: textColor, font: { size: 12, weight: 'bold' }, padding: 15 }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff', bodyColor: '#fff', borderColor: '#ff9900', borderWidth: 1, padding: 12, displayColors: true,
                    callbacks: { label: function(context) { return context.dataset.label + ': ' + context.parsed.r + '%'; } }
                }
            }
        }
    });
}

// ============================================================================
// DASHBOARD DE DESEMPENHO GLOBAL
// ============================================================================

export function calculateGlobalDomainStats(targetCertId) {
    const rawHistory = storageManager.getHistory();
    
    if (!rawHistory || rawHistory.length === 0) return null;

    const domainAccumulator = {};
    let totalQuizzes = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;

    const history = rawHistory.filter(quiz => 
        quiz && quiz.certId && quiz.domainScores && quiz.certId === targetCertId
    );

    history.forEach(quiz => {
        totalQuizzes++;
        totalQuestionsAnswered += quiz.total || 0;
        totalCorrect += quiz.score || 0;

        Object.entries(quiz.domainScores).forEach(([domainId, scoreData]) => {
            if (!domainAccumulator[domainId]) {
                domainAccumulator[domainId] = { total: 0, correct: 0, name: null };
            }
            domainAccumulator[domainId].total += scoreData.total || 0;
            domainAccumulator[domainId].correct += scoreData.correct || 0;
        });
    });

    const domainStats = {};
    const labels = [];
    const percentages = [];

    Object.entries(domainAccumulator).forEach(([domainId, data]) => {
        if (data.total > 0) {
            const percentage = (data.correct / data.total) * 100;
            
            let domainName = domainId;
            for (const certPath of Object.values(certificationPaths)) {
                const domain = certPath.domains.find(d => d.id === domainId);
                if (domain) {
                    domainName = domain.name;
                    break;
                }
            }
            
            let cleanName = domainName.replace(/^Domínio \d+: /, '');
            
            let formattedLabel = cleanName;
            if (cleanName.length > 20) {
                const words = cleanName.split(' ');
                const lines = [];
                let currentLine = '';

                words.forEach(word => {
                    if ((currentLine + word).length > 20) {
                        if (currentLine) lines.push(currentLine.trim());
                        currentLine = word + ' ';
                    } else {
                        currentLine += word + ' ';
                    }
                });
                if (currentLine) lines.push(currentLine.trim());
                formattedLabel = lines; 
            }
            
            domainStats[domainId] = {
                name: cleanName,
                percentage: percentage.toFixed(1),
                total: data.total,
                correct: data.correct
            };
            
            labels.push(formattedLabel);
            percentages.push(percentage.toFixed(1));
        }
    });

    const avgScore = totalQuestionsAnswered > 0 
        ? ((totalCorrect / totalQuestionsAnswered) * 100).toFixed(1)
        : 0;

    const summary = { totalQuizzes, totalQuestionsAnswered, totalCorrect, avgScore };

    return { domainStats, summary, labels, percentages };
}

export async function renderGlobalRadarChart() {
    const canvas = document.getElementById('globalRadarChart');
    const emptyState = document.getElementById('global-chart-empty');
    const chartContainer = document.getElementById('global-chart-container');
    const statsContainer = document.getElementById('global-stats-summary');
    
    const certSelect = document.getElementById('certification-select');
    const currentCertId = certSelect ? certSelect.value : 'clf-c02';

    if (!canvas) return;

    const stats = calculateGlobalDomainStats(currentCertId);

    if (!stats || stats.labels.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (chartContainer) chartContainer.classList.add('hidden');
        if (statsContainer) statsContainer.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (statsContainer) statsContainer.classList.remove('hidden');

    const totalQuizzesEl = document.getElementById('total-quizzes');
    const avgScoreEl = document.getElementById('avg-score');
    const totalQuestionsEl = document.getElementById('total-questions');
    
    if (totalQuizzesEl) totalQuizzesEl.textContent = stats.summary.totalQuizzes;
    if (avgScoreEl) avgScoreEl.textContent = stats.summary.avgScore + '%';
    if (totalQuestionsEl) totalQuestionsEl.textContent = stats.summary.totalQuestionsAnswered;

    if (typeof Chart === 'undefined') {
        if (window.chartJsLoaded) await window.chartJsLoaded;
        else return;
    }

    if (window.globalRadarChartInstance) window.globalRadarChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';

    window.globalRadarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: stats.labels,
            datasets: [{
                label: 'Desempenho Médio (%)',
                data: stats.percentages,
                backgroundColor: 'rgba(255, 153, 0, 0.2)',
                borderColor: '#ff9900',
                borderWidth: 2,
                pointBackgroundColor: '#ff9900',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff9900',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 40, right: 40, top: 20, bottom: 20 } 
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: textColor,
                        backdropColor: 'transparent',
                        callback: function(value) { return value + '%'; },
                        font: { size: 10 }
                    },
                    grid: { color: gridColor },
                    angleLines: { color: gridColor },
                    pointLabels: {
                        color: textColor,
                        font: { size: 10, weight: '600' },
                        callback: function(label) {
                            let cleanLabel = Array.isArray(label) ? label.join(' ') : label;
                            cleanLabel = cleanLabel.replace(/^Domínio \d+: /, '');
                            const words = cleanLabel.split(' ');
                            const lines = [];
                            let currentLine = '';
                            words.forEach(word => {
                                if ((currentLine + word).length > 15) {
                                    if (currentLine) lines.push(currentLine.trim());
                                    currentLine = word + ' ';
                                } else {
                                    currentLine += word + ' ';
                                }
                            });
                            if (currentLine) lines.push(currentLine.trim());
                            return lines; 
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, position: 'top',
                    labels: { color: textColor, font: { size: 12, weight: 'bold' }, padding: 10 }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff', bodyColor: '#fff', borderColor: '#ff9900', borderWidth: 1, padding: 12, displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const domainId = Object.keys(stats.domainStats)[context.dataIndex];
                            const domainData = stats.domainStats[domainId];
                            return [
                                context.dataset.label + ': ' + context.parsed.r + '%',
                                `${domainData.correct} de ${domainData.total} questões`
                            ];
                        }
                    }
                }
            }
        }
    });
}