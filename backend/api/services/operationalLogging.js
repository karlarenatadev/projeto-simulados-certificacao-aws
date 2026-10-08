// Error messages/stacks from SQL and third-party clients may contain credentials
// or personal data. Staging and production retain a stable category/code only.
export function safeError(error) {
  if (!['staging', 'production'].includes(process.env.NODE_ENV)) return error;
  const code = String(error?.code || '');
  return {
    category: 'internal_error',
    ...(/^[0-9A-Z]{5}$/.test(code) ? { databaseCode: code } : {}),
  };
}

export function writeRequestLog(entry, sink = console.log) {
  sink(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}
