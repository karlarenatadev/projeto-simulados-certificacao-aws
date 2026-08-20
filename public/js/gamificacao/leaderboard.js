import { logger } from "../utils/logger.js";
import apiService from "../services/api.js";
import { storageManager } from "../storageManager.js";
import { AuthService } from "../services/authService.js";
import { getCurrentLanguage } from "../core/languageManager.js";

function createTextElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = String(value ?? "");
  return element;
}

function renderMessage(list, message) {
  const item = createTextElement(
    "li",
    "flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400",
    "",
  );
  item.appendChild(createTextElement("p", "", message));
  list.replaceChildren(item);
}

export function renderLeaderboardRows(
  list,
  top5,
  myUserId,
  myNickname,
  language,
) {
  const rows = top5.map((user, index) => {
    const isMe = user.userId === myUserId || user.name === myNickname;
    const backgroundClass = isMe
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

    const item = createTextElement(
      "li",
      `flex justify-between items-center p-3 rounded-lg transition-all duration-200 ${backgroundClass}`,
      "",
    );
    const nameWrapper = createTextElement(
      "span",
      `${nameClass} text-sm flex items-center gap-2`,
      "",
    );
    nameWrapper.appendChild(
      createTextElement(
        "span",
        `font-bold ${positionColor} w-5 inline-block text-center`,
        `#${index + 1}`,
      ),
    );
    nameWrapper.appendChild(document.createTextNode(` ${user.name}`));
    if (isMe) {
      nameWrapper.appendChild(
        createTextElement(
          "span",
          "text-[9px] uppercase tracking-wider bg-aws-orange text-white px-2 py-0.5 rounded-full ml-1",
          language === "en" ? "You" : "Você",
        ),
      );
    }
    item.appendChild(nameWrapper);
    item.appendChild(
      createTextElement(
        "span",
        "font-mono font-bold text-aws-orange",
        `${user.score}%`,
      ),
    );
    return item;
  });
  list.replaceChildren(...rows);
}

export async function renderGuildDashboard() {
  const list = document.getElementById("guild-leaderboard");
  if (!list) return;

  const currentLang = getCurrentLanguage();
  const currentUser = AuthService.getCurrentUser();
  const loading = createTextElement(
    "li",
    "flex items-center justify-center p-8",
    "",
  );
  const loadingIcon = document.createElement("i");
  loadingIcon.className = "fa-solid fa-spinner fa-spin text-aws-orange mr-2";
  loadingIcon.setAttribute("aria-hidden", "true");
  loading.appendChild(loadingIcon);
  loading.appendChild(
    createTextElement(
      "span",
      "text-gray-600 dark:text-gray-400",
      currentLang === "en" ? "Loading..." : "Carregando...",
    ),
  );
  list.replaceChildren(loading);

  const myUserId = currentUser?.id || null;
  const myNickname =
    currentUser?.name || currentUser?.email?.split("@")[0] || null;
  const gamificationData = storageManager.getGamification();
  const myBestScore = gamificationData?.bestScore || 0;
  let rankData = [];
  let fromAPI = false;

  try {
    const response = await apiService.getLeaderboard(100);
    if (response.success && response.data && response.data.length > 0) {
      rankData = response.data.map((entry) => ({
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

  if (rankData.length === 0) {
    if (myNickname && myUserId) {
      rankData = [{ name: myNickname, score: myBestScore, userId: myUserId }];
    } else {
      renderMessage(
        list,
        currentLang === "en"
          ? "Leaderboard unavailable offline."
          : "Leaderboard indisponível offline.",
      );
      return;
    }
  } else if (myUserId) {
    const userInList = rankData.some((entry) => entry.userId === myUserId);
    if (!userInList && myNickname) {
      rankData.push({ name: myNickname, score: myBestScore, userId: myUserId });
    }
  }

  rankData.sort((a, b) => b.score - a.score);
  const top5 = rankData.slice(0, 5);
  const totalQuestionsEl = document.getElementById("guild-total-questions");
  const weeklyAvgEl = document.getElementById("guild-weekly-avg");

  if (totalQuestionsEl) {
    const totalCount = fromAPI
      ? rankData.length * 15
      : (gamificationData?.totalQuizzes || 0) * 10;
    totalQuestionsEl.textContent = totalCount.toLocaleString("pt-BR");
  }

  if (weeklyAvgEl && top5.length > 0) {
    const currentAvg =
      top5.reduce((acc, entry) => acc + entry.score, 0) / top5.length;
    weeklyAvgEl.textContent = `${Math.round(currentAvg)}%`;
  }

  if (top5.length === 0) {
    renderMessage(
      list,
      currentLang === "en" ? "No users yet" : "Nenhum usuário ainda",
    );
    return;
  }

  renderLeaderboardRows(list, top5, myUserId, myNickname, currentLang);
}
