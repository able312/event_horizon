// Compile-time check that the SQLite schema matches the shared record types in
// src/definitions. If a schema change breaks this file, update the matching type
// (and the UI that uses it) in the same change.
import type { InferInsertModel, InferSelectModel } from "drizzle-orm"
import type {
  BeverageItem,
  BeverageItemTimeblock,
  CartDetails,
  Event,
  FoodItem,
  MenuOfChargeItem,
  NewBeverageItem,
  NewBeverageItemTimeblock,
  NewEvent,
  NewFoodItem,
  NewMenuOfChargeItem,
  NewPayment,
  NewTimeblock,
  NewTouchpoint,
  Payment,
  Timeblock,
  Touchpoint,
  TournamentDetails,
} from "../../definitions/database.js"
import type { Contact, ContactRole, EventContact, VendorCategory } from "../../definitions/contacts.js"
import type * as schema from "./schema.js"

/** Resolves to true only when A and B accept exactly the same values. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Expect<T extends true> = T

export type SchemaConformance = [
  Expect<Same<InferSelectModel<typeof schema.events>, Event>>,
  Expect<Same<InferInsertModel<typeof schema.events>, NewEvent>>,
  Expect<Same<InferSelectModel<typeof schema.tournamentDetails>, TournamentDetails>>,
  Expect<Same<InferSelectModel<typeof schema.cartDetails>, CartDetails>>,
  Expect<Same<InferSelectModel<typeof schema.payments>, Payment>>,
  Expect<Same<InferInsertModel<typeof schema.payments>, NewPayment>>,
  Expect<Same<InferSelectModel<typeof schema.touchpoints>, Touchpoint>>,
  Expect<Same<InferInsertModel<typeof schema.touchpoints>, NewTouchpoint>>,
  Expect<Same<InferSelectModel<typeof schema.menuOfChargeItems>, MenuOfChargeItem>>,
  Expect<Same<InferInsertModel<typeof schema.menuOfChargeItems>, NewMenuOfChargeItem>>,
  Expect<Same<InferSelectModel<typeof schema.timeblocks>, Timeblock>>,
  Expect<Same<InferInsertModel<typeof schema.timeblocks>, NewTimeblock>>,
  Expect<Same<InferSelectModel<typeof schema.foodItems>, FoodItem>>,
  Expect<Same<InferInsertModel<typeof schema.foodItems>, NewFoodItem>>,
  Expect<Same<InferSelectModel<typeof schema.beverageItems>, BeverageItem>>,
  Expect<Same<InferInsertModel<typeof schema.beverageItems>, NewBeverageItem>>,
  Expect<Same<InferSelectModel<typeof schema.beverageItemTimeblocks>, BeverageItemTimeblock>>,
  Expect<Same<InferInsertModel<typeof schema.beverageItemTimeblocks>, NewBeverageItemTimeblock>>,
  Expect<Same<InferSelectModel<typeof schema.contacts>, Contact>>,
  Expect<Same<InferSelectModel<typeof schema.contactRoles>, ContactRole>>,
  Expect<Same<InferSelectModel<typeof schema.vendorCategories>, VendorCategory>>,
  Expect<Same<InferSelectModel<typeof schema.eventContacts>, EventContact>>,
]
