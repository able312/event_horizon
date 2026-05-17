import { type Config } from "drizzle-kit"

export default {
  schema: "./src/electron/db/schema.ts",   // where your schema is defined
  out: "./migrations/drizzle",               // migrations folder
  dialect: "sqlite",
  dbCredentials: {
    url: "./app.sqlite",          // path to your local db
  },
} satisfies Config