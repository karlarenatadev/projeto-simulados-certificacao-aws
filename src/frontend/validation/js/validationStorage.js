window.ValidationStorage = {
  KEYS: { STATS: 'cloudacademy_validation_stats' },
  getTodayStats() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.STATS) || '{}');
    } catch {
      return {};
    }
  },
  incrementApproved() { this._increment('approved'); },
  incrementRejected() { this._increment('rejected'); },
  _increment(key) {
    const stats = this.getTodayStats();
    stats[key] = Number(stats[key] || 0) + 1;
    localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  },
};
