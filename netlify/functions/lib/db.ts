import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Netlify Database is not configured. Set NETLIFY_DB_URL in the Netlify site environment.");
    this.name = "StorageNotConfiguredError";
  }
}

export function getDb() {
  const connectionString = process.env.NETLIFY_DB_URL;
  if (!connectionString) throw new StorageNotConfiguredError();

  client ??= postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return client;
}
