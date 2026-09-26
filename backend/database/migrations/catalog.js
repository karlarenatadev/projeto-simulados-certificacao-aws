import { createHash } from "node:crypto";

// Compare definitions, not just table names. OIDs, owners and data are excluded.
// All deparsers run with the same search_path, on PostgreSQL major version 16.
export async function inspectSchema(client) {
  const queries = {
    relations: `SELECT c.relname AS name, c.relkind AS kind,
      c.relpersistence AS persistence, c.relrowsecurity AS row_security,
      c.relforcerowsecurity AS force_row_security
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
      ORDER BY c.relname`,
    columns: `SELECT c.relname AS relation, a.attname AS name, a.attnum AS position,
      format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null,
      pg_get_expr(d.adbin,d.adrelid) AS default_expression,
      a.attidentity AS identity, a.attgenerated AS generated
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
        AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`,
    constraints: `SELECT c.relname AS relation, con.conname AS name,
      con.contype AS type, pg_get_constraintdef(con.oid,true) AS definition,
      con.convalidated AS validated, con.condeferrable AS deferrable,
      con.condeferred AS deferred
      FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' ORDER BY c.relname,con.conname`,
    indexes: `SELECT c.relname AS relation, i.relname AS name,
      pg_get_indexdef(x.indexrelid) AS definition,
      x.indisvalid AS valid, x.indisready AS ready
      FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid
      JOIN pg_class i ON i.oid=x.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' ORDER BY c.relname,i.relname`,
    enums: `SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      JOIN pg_enum e ON e.enumtypid=t.oid
      WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`,
    views: `SELECT c.relname AS name, pg_get_viewdef(c.oid,true) AS definition
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('v','m') ORDER BY c.relname`,
    functions: `SELECT p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
        AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname,arguments`,
    triggers: `SELECT c.relname AS relation, t.tgname AS name,
      pg_get_triggerdef(t.oid,true) AS definition, t.tgenabled AS enabled
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
    extensions: `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema
      FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
      WHERE e.extname <> 'plpgsql' ORDER BY e.extname`,
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    result[name] = (await client.query(sql)).rows;
  }
  return result;
}

export function schemaChecksum(schema) {
  return createHash("sha256").update(JSON.stringify(schema)).digest("hex");
}
