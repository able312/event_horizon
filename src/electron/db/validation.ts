/**
 * Database Validation Schemas
 * 
 * Uses drizzle-zod to generate Zod schemas from Drizzle ORM schemas
 * for runtime validation.
 * 
 * Currently empty - will add schemas as needed.
 */

import { events } from "./schema.js"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"

// Event Schemas
export const selectEventSchema = createSelectSchema(events);
export const insertEventSchema = createInsertSchema(events);
