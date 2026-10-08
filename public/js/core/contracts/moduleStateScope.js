/** Only these snapshot modules allow an absent certification. */
export const GLOBAL_STATE_MODULES = Object.freeze([
  "preferences",
  "gamification",
]);

export function assertGamificationScope(module, certification) {
  if (
    module === "gamification" &&
    certification != null &&
    certification !== ""
  ) {
    throw Object.assign(
      new Error("gamification is global; certification must be null"),
      {
        statusCode: 400,
        code: "GAMIFICATION_GLOBAL_SCOPE_REQUIRED",
      },
    );
  }
}
