import { executeQuery, getDatabase } from "./db.js";
import {
  isLocalIdentityId,
  LOCAL_LINK_MIGRATION_VERSION,
  LOCAL_LINK_SCOPES,
} from "../../src/frontend/js/core/contracts/localLinkMigration.js";

export async function migrateLocalLinks(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS local_identity_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      local_identity_id VARCHAR(126) NOT NULL UNIQUE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
      migration_version INTEGER NOT NULL DEFAULT 1 CHECK (migration_version > 0),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      CHECK ((status = 'completed') = (completed_at IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_local_links_user ON local_identity_links(user_id);
    ALTER TABLE user_module_state DROP CONSTRAINT IF EXISTS chk_user_module_state_module;
    ALTER TABLE user_module_state ADD CONSTRAINT chk_user_module_state_module
      CHECK (module IN ('journey','sprint','flashcards','labs','diagnostic','preferences','gamification','mistakes'));
  `);
}

function fail(message, statusCode = 409) {
  throw Object.assign(new Error(message), { statusCode });
}

function validateId(id) {
  if (!isLocalIdentityId(id)) fail("invalid_local_identity_id", 400);
}

function owned(link, userId) {
  if (link && link.user_id !== userId) fail("local_identity_already_linked");
  return link;
}

function publicLink(link) {
  if (!link)
    return {
      status: "unclaimed",
      migrationVersion: LOCAL_LINK_MIGRATION_VERSION,
    };
  return {
    id: link.id,
    localIdentityId: link.local_identity_id,
    status: link.status,
    migrationVersion: link.migration_version,
    ownedByCurrentUser: true,
    createdAt: link.created_at,
    completedAt: link.completed_at,
  };
}

export async function getLocalLink(userId, id) {
  validateId(id);
  const rows = await executeQuery(
    "SELECT * FROM local_identity_links WHERE local_identity_id = $1",
    [id],
  );
  return publicLink(owned(rows[0], userId));
}

export async function claimLocalLink(userId, id) {
  validateId(id);
  // Unique constraint selects the winner; a losing caller can only read its own link.
  await executeQuery(
    `INSERT INTO local_identity_links(local_identity_id,user_id,migration_version)
    VALUES ($1,$2,$3) ON CONFLICT (local_identity_id) DO NOTHING`,
    [id, userId, LOCAL_LINK_MIGRATION_VERSION],
  );
  return getLocalLink(userId, id);
}

export async function completeLocalLink(userId, id, receipts) {
  validateId(id);
  return getDatabase().transaction(async (tx) => {
    const { rows } = await tx.query(
      "SELECT * FROM local_identity_links WHERE local_identity_id=$1 FOR UPDATE",
      [id],
    );
    const link = owned(rows[0], userId);
    if (!link) fail("local_identity_unclaimed");
    if (link.status === "completed") return publicLink(link);
    if (link.migration_version !== LOCAL_LINK_MIGRATION_VERSION)
      fail("unsupported_migration_version");
    if (
      !Array.isArray(receipts) ||
      receipts.length !== LOCAL_LINK_SCOPES.length
    )
      fail("migration_incomplete");
    for (const scope of LOCAL_LINK_SCOPES) {
      const matches = receipts.filter(
        (r) => r?.module === scope.module && r?.certId === scope.certId,
      );
      const receipt = matches[0];
      if (
        matches.length !== 1 ||
        !Number.isSafeInteger(receipt.version) ||
        receipt.version < 1
      )
        fail("migration_incomplete");
      const result = await tx.query(
        `SELECT version FROM user_module_state
        WHERE user_id=$1 AND module=$2 AND certification_id=$3 FOR SHARE`,
        [userId, scope.module, scope.certId.toUpperCase()],
      );
      if (!result.rows[0] || Number(result.rows[0].version) < receipt.version)
        fail("migration_incomplete");
    }
    const result = await tx.query(
      `UPDATE local_identity_links SET status='completed',
      completed_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,
      [link.id],
    );
    return publicLink(result.rows[0]);
  });
}
