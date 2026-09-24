import { type Config } from "drizzle-kit"

export default {
  schema: "./src/electron/db/schema.ts",   // where your schema is defined
  out: "./migrations/drizzle",               // migrations folder
  dialect: "sqlite",
  // CLI migrations require an explicit path. App startup migrates its selected DB.
  ...(process.env.EVENT_HORIZON_DB_PATH
    ? { dbCredentials: { url: process.env.EVENT_HORIZON_DB_PATH } }
    : {}),
} satisfies Config
