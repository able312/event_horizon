import type { NewVendorCategory } from "../../definitions/contacts.js"

/** Keep in sync with the seed rows in migrations/drizzle/0019_contacts.sql. */
export const DEFAULT_VENDOR_CATEGORIES: ReadonlyArray<Required<NewVendorCategory>> = [
  { key: "catering", label: "Catering", colorToken: "teal", sortOrder: 10 },
  { key: "rentals", label: "Rentals", colorToken: "amber", sortOrder: 20 },
  { key: "music", label: "Music", colorToken: "violet", sortOrder: 30 },
  { key: "photography", label: "Photography", colorToken: "sky", sortOrder: 40 },
  { key: "venue", label: "Venue", colorToken: "stone", sortOrder: 50 },
  { key: "av_staging", label: "AV and staging", colorToken: "indigo", sortOrder: 60 },
  { key: "florals", label: "Florals", colorToken: "rose", sortOrder: 70 },
  { key: "other", label: "Other", colorToken: "slate", sortOrder: 80 },
]

