/**
 * Regras de apresentação do fluxo simplificado do simulado.
 *
 * A correção da resposta continua pertencendo ao QuizEngine. Este módulo
 * apenas decide quando a seleção está completa e qual é a única ação
 * primária disponível para a posição atual.
 */

export function isQuizSelectionComplete(
  selection,
  isMultiple,
  requiredSelections = 1,
) {
  if (!isMultiple) return Number.isInteger(selection);
  return (
    Array.isArray(selection) && selection.length === Number(requiredSelections)
  );
}

export function isLastQuestionInFlow({
  currentIndex,
  totalQuestions,
  reviewQueuePosition = null,
  reviewQueueLength = null,
}) {
  if (
    Number.isInteger(reviewQueuePosition) &&
    Number.isInteger(reviewQueueLength)
  ) {
    return (
      reviewQueueLength > 0 && reviewQueuePosition === reviewQueueLength - 1
    );
  }

  return totalQuestions > 0 && currentIndex === totalQuestions - 1;
}

export function getStreamlinedQuizActionState({
  isLastQuestion,
  isAnswered,
  isFinishing = false,
  hasFinished = false,
}) {
  const actionDisabled = !isAnswered || isFinishing || hasFinished;

  return {
    showNext: !isLastQuestion,
    nextDisabled: isLastQuestion || actionDisabled,
    showFinish: isLastQuestion,
    finishDisabled: !isLastQuestion || actionDisabled,
  };
}

export function shouldAutoSubmitQuizAnswer({
  isStreamlined,
  isAnswered,
  isSubmitting,
  selection,
  isMultiple,
  requiredSelections,
}) {
  if (!isStreamlined || isAnswered || isSubmitting) return false;
  return isQuizSelectionComplete(selection, isMultiple, requiredSelections);
}
