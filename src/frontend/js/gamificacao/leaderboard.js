import { logger } from "../utils/logger.js";
import apiService from "../services/api.js";
import { storageManager } from "../storageManager.js";

export async function renderGuildDashboard() {
  const list = document.getElementById("guild-leaderboard");
  if (!list) return;

  const currentLang = localStorage.getItem("aws_sim_lang") || "pt";

  // Loading state
  list.innerHTML = `
        <li class="flex items-center justify-center p-8">
            <i class="fa-solid fa-spinner fa-spin text-aws-orange mr-2"></i>
            <span class="text-gray-600 dark:text-gray-400">${currentLang === "en" ? "Loading..." : "Carregando..."}</span>
        </li>
    `;

  // Identidade do usuário atual — lê da chave unificada cloudacademy_user
  let myUserId = null;
  let myNickname = null;
  try {
    const sessionRaw = localStorage.getItem("cloudacademy_user");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      myUserId = session.id || null;
      myNickname = session.nickname || session.email?.split("@")[0] || null;
    }
  } catch {
    // Sessão corrompida — ignora
  }

  const gamificationData = storageManager.getGamification();
  const myBestScore = gamificationData?.bestScore || 0;

  // Carrega leaderboard da API
  let rankData = [];
  let fromAPI = false;

  try {
    const response = await apiService.getLeaderboard(100);
    if (response.success && response.data && response.data.length > 0) {
      rankData = response.data.map((entry) => ({
        // API retorna display_name (nickname com fallback para anonymous_name legado)
        name:
          entry.display_name ||
          entry.nickname ||
          entry.anonymous_name ||
          "Usuário",
        score: Math.round((entry.best_score || 0) * 100) / 100,
        userId: entry.user_id || entry.id || null,
      }));
      fromAPI = true;
      logger.info(
        `✓ Leaderboard carregado da API: ${rankData.length} entradas`,
      );
    }
  } catch (error) {
    logger.warn("Falha ao carregar leaderboard da API:", error);
  }

  // Fallback offline — usa apenas os dados locais do usuário atual
  if (rankData.length === 0) {
    if (myNickname && myUserId) {
      rankData = [{ name: myNickname, score: myBestScore, userId: myUserId }];
    } else {
      list.innerHTML = `
            <li class="flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
                <p>${currentLang === "en" ? "Leaderboard unavailable offline." : "Leaderboard indisponível offline."}</p>
            </li>
        `;
      return;
    }
  } else if (myUserId) {
    // Garante que o usuário atual aparece na lista se não veio da API
    const userInList = rankData.some((e) => e.userId === myUserId);
    if (!userInList && myNickname) {
      rankData.push({ name: myNickname, score: myBestScore, userId: myUserId });
    }
  }

  rankData.sort((a, b) => b.score - a.score);
  const top5 = rankData.slice(0, 5);

  // Métricas globais
  const totalQuestionsEl = document.getElementById("guild-total-questions");
  const weeklyAvgEl = document.getElementById("guild-weekly-avg");

  if (totalQuestionsEl) {
    const totalCount = fromAPI
      ? rankData.length * 15
      : (gamificationData?.totalQuizzes || 0) * 10;
    totalQuestionsEl.textContent = totalCount.toLocaleString("pt-BR");
  }

  if (weeklyAvgEl && top5.length > 0) {
    const currentAvg = top5.reduce((acc, c) => acc + c.score, 0) / top5.length;
    weeklyAvgEl.textContent = `${Math.round(currentAvg)}%`;
  }

  // Renderização
  if (top5.length === 0) {
    list.innerHTML = `
            <li class="flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
                <p>${currentLang === "en" ? "No users yet" : "Nenhum usuário ainda"}</p>
            </li>
        `;
    return;
  }

  list.innerHTML = top5
    .map((user, index) => {
      const isMe = user.userId === myUserId || user.name === myNickname;

      const bgClass = isMe
        ? "bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 shadow-sm"
        : "border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/50";

      const nameClass = isMe
        ? "font-bold aws-text-dark dark:text-white"
        : "font-medium text-gray-600 dark:text-gray-300";

      const positionColor =
        index === 0
          ? "text-yellow-500"
          : index === 1
            ? "text-gray-400"
            : index === 2
              ? "text-orange-400"
              : "text-gray-500";

      const badgeText = currentLang === "en" ? "You" : "Você";
      const youBadge = isMe
        ? `<span class="text-[9px] uppercase tracking-wider bg-aws-orange text-white px-2 py-0.5 rounded-full ml-1">${badgeText}</span>`
        : "";

      return `
            <li class="flex justify-between items-center p-3 rounded-lg transition-all duration-200 ${bgClass}">
                <span class="${nameClass} text-sm flex items-center gap-2">
                    <span class="font-bold ${positionColor} w-5 inline-block text-center">#${index + 1}</span>
                    ${user.name}
                    ${youBadge}
                </span>
                <span class="font-mono font-bold text-aws-orange">${user.score}%</span>
            </li>
        `;
    })
    .join("");
}
