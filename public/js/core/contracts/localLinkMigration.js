// Shared, public contract. "completed" covers only these modules in version 1.
export const LOCAL_LINK_MIGRATION_VERSION = 1;
export const LOCAL_LINK_SCOPES = Object.freeze(
  ["diagnostic", "mistakes", "flashcards", "journey", "sprint"].flatMap(
    (module) =>
      ["clf-c02", "saa-c03", "dva-c02", "aif-c01"].map((certId) =>
        Object.freeze({ module, certId }),
      ),
  ),
);

export function isLocalIdentityId(value) {
  return (
    typeof value === "string" && /^local_[A-Za-z0-9_-]{1,120}$/.test(value)
  );
}
