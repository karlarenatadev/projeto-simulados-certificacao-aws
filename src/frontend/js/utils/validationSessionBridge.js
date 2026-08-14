/*
 * Compatibility bridge for the legacy Validation artifact.
 *
 * The official session is cloudacademy_session.user. The Validation page is
 * still preserved under public/validation and expects a flat legacy object.
 * This file creates a derived, temporary snapshot for that artifact; it does
 * not grant permissions and the API remains the authority.
 */
(function installValidationSessionBridge(global) {
  const OFFICIAL_SESSION_KEY = "cloudacademy_session";
  const LEGACY_SESSION_KEY = "cloudacademy_user";

  function parse(storage, key) {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function readOfficialUser(storage = global.localStorage) {
    const session = parse(storage, OFFICIAL_SESSION_KEY);
    const user = session?.user;
    if (!user?.id || !user?.role) return null;

    return {
      id: String(user.id),
      email: user.email || "",
      nickname: user.nickname || user.name || "",
      full_name: user.full_name || user.name || "",
      role: String(user.role).trim().toUpperCase(),
    };
  }

  function sync(storage = global.localStorage) {
    const officialUser = readOfficialUser(storage);
    if (officialUser) {
      // Derived compatibility data only. Backend authorization still loads
      // the role from the database using X-User-Id.
      storage.setItem(LEGACY_SESSION_KEY, JSON.stringify(officialUser));
      return officialUser;
    }

    // Temporary migration fallback for users that have not opened the main
    // app since the official session was introduced.
    return parse(storage, LEGACY_SESSION_KEY);
  }

  global.CloudAcademyValidationSession = {
    readOfficialUser,
    sync,
  };

  sync();
})(typeof window !== "undefined" ? window : globalThis);
