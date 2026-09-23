// Error messages/stacks from SQL and third-party clients may contain credentials
// or personal data. Production logs retain a stable category/code only.
export function safeError(error) {
  if (process.env.NODE_ENV !== 'production') return error;
  const code = String(error?.code || '');
  return {
    category: 'internal_error',
    ...(/^[0-9A-Z]{5}$/.test(code) ? { databaseCode: code } : {}),
  };
}
