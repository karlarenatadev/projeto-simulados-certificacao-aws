import { SessionManager } from "../core/sessionManager.js";
import { reconcileModuleState } from "../progressSync.js";
import {
  isLocalIdentityId,
  LOCAL_LINK_MIGRATION_VERSION,
  LOCAL_LINK_SCOPES,
} from "../core/contracts/localLinkMigration.js";

// Only compatible v1 entities count; metadata alone must not claim a local identity.
export function hasMeaningfulLocalProgress(snapshot) {
  return (
    snapshot?.modules?.some(({ module, state }) => {
      const field = {
        diagnostic: "history",
        mistakes: "mistakes",
        flashcards: "deck",
        journey: "completedStages",
        sprint: "completedStages",
      }[module];
      return field && Array.isArray(state?.[field]) && state[field].length > 0;
    }) === true
  );
}

export function createOfflineLinkingService(storage, api) {
  const inFlight = new Map();

  function snapshotState(snapshot, module, certId) {
    const entry = (modules) => {
      const matches = modules?.filter(
        (item) => item.module === module && item.certId === certId,
      );
      if (matches?.length !== 1 || !matches[0].state)
        throw new Error("source_snapshot_incomplete");
      return matches[0].state;
    };
    const base = entry(snapshot.modules);
    return snapshot.pendingModules
      ? reconcileModuleState(module, base, entry(snapshot.pendingModules)).state
      : base;
  }

  function captureSource() {
    const session = SessionManager.restore();
    if (
      session?.provider !== "local" ||
      session.authenticationMode !== "offline" ||
      !isLocalIdentityId(session.user?.id)
    )
      return null;
    const snapshot = {
      localIdentityId: session.user.id,
      migrationVersion: LOCAL_LINK_MIGRATION_VERSION,
      modules: LOCAL_LINK_SCOPES.map(({ module, certId }) => ({
        module,
        certId,
        state: storage.getLocalModuleState(module, certId),
      })),
    };
    const existing = storage.getLocalLinkSnapshot(snapshot.localIdentityId);
    if (existing) {
      if (existing.migrationVersion !== LOCAL_LINK_MIGRATION_VERSION)
        throw new Error("unsupported_migration_version");
      snapshot.modules = snapshot.modules.map(({ module, certId, state }) => ({
        module,
        certId,
        state: reconcileModuleState(
          module,
          snapshotState(existing, module, certId),
          state,
        ).state,
      }));
    }
    if (!hasMeaningfulLocalProgress(snapshot)) return null;
    if (!storage.saveLocalLinkSnapshot(snapshot))
      throw new Error("local_snapshot_not_saved");
    return { localIdentityId: snapshot.localIdentityId };
  }

  async function migrateSource(localIdentityId) {
    if (!isLocalIdentityId(localIdentityId))
      throw new Error("invalid_local_identity_id");
    const initial = SessionManager.restore();
    const userId = initial?.user?.id;
    const validSession = () => {
      const current = SessionManager.restore();
      return (
        current?.authenticationMode === "online" &&
        current.accessToken &&
        current.user?.id === userId
      );
    };
    if (!userId || !validSession())
      return { status: "pending", authRequired: true };
    // Key includes identity so another user can never join A's in-flight result.
    const key = `${userId}:${localIdentityId}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const operation = (async () => {
      try {
        const claimed = await api.claimLocalIdentity(localIdentityId);
        if (!validSession()) return { status: "pending", authRequired: true };
        const link = claimed?.data;
        if (
          !claimed?.success ||
          !link?.ownedByCurrentUser ||
          link.migrationVersion !== LOCAL_LINK_MIGRATION_VERSION
        )
          return { status: "pending" };
        if (link.status === "completed") return link;
        if (link.status !== "pending") return { status: "pending" };
        // Claim must succeed before reading/importing the source into this user.
        const snapshot = storage.getLocalLinkSnapshot(localIdentityId);
        if (
          !snapshot ||
          snapshot.localIdentityId !== localIdentityId ||
          snapshot.migrationVersion !== LOCAL_LINK_MIGRATION_VERSION ||
          !Array.isArray(snapshot.modules)
        )
          return { status: "pending", reason: "source_snapshot_unavailable" };
        const receipts = [];
        for (const { module, certId } of LOCAL_LINK_SCOPES) {
          if (!validSession()) return { status: "pending", authRequired: true };
          // The claim above confirmed pending + ownership. Consume additive
          // captures without replacing the base or resetting remote versions.
          const sourceState = snapshotState(snapshot, module, certId);
          const current = storage.getLocalModuleState(module, certId);
          const merged = reconcileModuleState(module, sourceState, current);
          if (!storage.setLocalModuleState(module, certId, merged.state))
            return { status: "pending", reason: "local_write_failed" };
          const result = await storage.syncAccountModuleState(module, certId, {
            confirmRemote: true,
            expectedUserId: userId,
          });
          if (!validSession()) return { status: "pending", authRequired: true };
          if (!result?.remoteConfirmed || result.syncPending)
            return { status: "pending", reason: "remote_sync_pending" };
          receipts.push({ module, certId, version: result.version });
        }
        const confirmed = await api.completeLocalIdentityLink(
          localIdentityId,
          receipts,
        );
        if (!validSession()) return { status: "pending", authRequired: true };
        return confirmed?.success && confirmed.data?.status === "completed"
          ? confirmed.data
          : { status: "pending" };
      } catch (error) {
        if (error?.statusCode === 409) throw error;
        return { status: "pending", reason: "request_failed" };
      }
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, operation);
    return operation;
  }
  return { captureSource, migrateSource };
}
