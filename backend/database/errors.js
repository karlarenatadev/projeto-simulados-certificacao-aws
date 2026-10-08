/** A database connection is unavailable for executing application queries. */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database not initialized. Call initializeDatabase() first.");
    this.name = "DatabaseUnavailableError";
    this.code = "DATABASE_UNAVAILABLE";
    this.statusCode = 503;
  }
}
