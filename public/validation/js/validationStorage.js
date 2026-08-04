// js/validation/validationStorage.js
// Gerencia apenas os contadores diários de validação — o validador é o usuário autenticado.
window.ValidationStorage = {
  KEYS: {
    STATS: "validation_stats",
  },

  getTodayStats() {
    const today = new Date().toISOString().split("T")[0];
    let stats = JSON.parse(
      localStorage.getItem(this.KEYS.STATS) || "{}",
    );

    if (stats.date !== today) {
      stats = { date: today, approved: 0, rejected: 0 };
      this.saveStats(stats);
    }
    return stats;
  },

  saveStats(stats) {
    localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  },

  incrementApproved() {
    const stats = this.getTodayStats();
    stats.approved++;
    this.saveStats(stats);
  },

  incrementRejected() {
    const stats = this.getTodayStats();
    stats.rejected++;
    this.saveStats(stats);
  },
};
