import { SessionManager } from "../core/sessionManager.js";
import { UserMapper } from "../core/contracts/userMapper.js";
import {
  LOCAL_LINK_MIGRATION_VERSION,
  LOCAL_LINK_SCOPES,
  isLocalIdentityId,
} from "../core/contracts/localLinkMigration.js";

const POINTER_KEY = "pending_local_link_v1";

// Pointer is user-scoped convenience only. The server always decides ownership.
export function createGoogleLoginOrchestrator(storage, api, linking) {
  let loginInFlight = null;
  const resumes = new Map();
  let state = { migration: "none" };
  const notify = () =>
    globalThis.window?.dispatchEvent(new CustomEvent("auth-flow-state"));
  function publish(next) {
    state = next;
    notify();
    return state;
  }
  function sameOnline(id) {
    const session = SessionManager.restore();
    return (
      session?.user?.id === id &&
      session.authenticationMode === "online" &&
      !!session.accessToken
    );
  }
  function pointer() {
    try {
      const value = JSON.parse(storage.getUserData(POINTER_KEY));
      return isLocalIdentityId(value?.localIdentityId) &&
        value.migrationVersion === LOCAL_LINK_MIGRATION_VERSION
        ? value
        : null;
    } catch {
      return null;
    }
  }
  function resume() {
    const id = SessionManager.restore()?.user?.id;
    const pending = pointer();
    if (!id || !sameOnline(id) || !pending)
      return Promise.resolve({ migration: "none" });
    if (resumes.has(id)) return resumes.get(id);
    const operation = (async () => {
      publish({ migration: "syncing" });
      try {
        const status = await api.getLocalIdentityLink(pending.localIdentityId);
        if (!sameOnline(id)) return { migration: "pending" };
        if (!status?.success) return publish({ migration: "pending" });
        // Unclaimed is possible after a crash between storing the pointer and claim.
        const result =
          status.data?.status === "completed"
            ? status.data
            : await linking.migrateSource(pending.localIdentityId);
        if (!sameOnline(id)) return { migration: "pending" };
        if (result?.status === "completed") {
          storage.removeUserData(POINTER_KEY);
          return publish({ migration: "completed" });
        }
        return publish({ migration: "pending" });
      } catch (error) {
        if (!sameOnline(id)) return { migration: "pending" };
        const conflict =
          error?.statusCode === 409 &&
          (error.message === "local_identity_already_linked" ||
            error.details?.error === "local_identity_already_linked");
        if (conflict) storage.removeUserData(POINTER_KEY); // Only the pointer; source is never erased.
        return publish({ migration: conflict ? "conflict" : "pending" });
      }
    })().finally(() => resumes.delete(id));
    resumes.set(id, operation);
    return operation;
  }
  function login(credential) {
    if (loginInFlight) return loginInFlight;
    loginInFlight = (async () => {
      const previous = SessionManager.restore();
      let source = linking.captureSource(); // Must precede POST and session replacement.
      publish({ migration: "none", phase: "authenticating" });
      const response = await api.loginWithGoogle(credential);
      if (
        !response?.success ||
        !response.data?.id ||
        !response.data.access_token ||
        !(Number(response.data.expires_in) > 0)
      )
        throw new Error("invalid_auth_response");
      // Do not apply a delayed login to a session changed in another tab.
      if (SessionManager.restore()?.user?.id !== previous?.user?.id)
        throw new Error("auth_context_changed");
      // Include study performed while Google authentication was pending, still
      // in the original namespace and before replacing the session.
      source = linking.captureSource() || source;
      const user = UserMapper.fromDTO(response.data);
      SessionManager.persist({
        user,
        accessToken: response.data.access_token,
        tokenExpiresIn: response.data.expires_in,
        authenticationMode: "online",
        provider: "google",
      });
      publish({ migration: "none" });
      try {
        if (source) {
          storage.setUserData(
            POINTER_KEY,
            JSON.stringify({
              localIdentityId: source.localIdentityId,
              migrationVersion: LOCAL_LINK_MIGRATION_VERSION,
            }),
          );
        }
        if (pointer()) await resume();
        else if (previous?.user?.id === user.id) {
          // Same-account reauth, not first-link. Reuse D1; no origin import.
          for (const { module, certId } of LOCAL_LINK_SCOPES) {
            if (!sameOnline(user.id)) break;
            await storage.syncAccountModuleState(module, certId, {
              confirmRemote: true,
              expectedUserId: user.id,
            });
          }
        } else if (previous?.user && previous.provider !== "local") {
          publish({ migration: "none", accountChanged: true });
        }
      } catch {
        publish({ migration: "pending" }); // Auth already succeeded; never roll it back.
      }
      return user;
    })().finally(() => {
      loginInFlight = null;
      if (state.phase) publish({ ...state, phase: null });
    });
    return loginInFlight;
  }
  return {
    login,
    resume,
    getState: () => state,
    hasPending: () => !!pointer(),
  };
}
