/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as beverageItems from "../beverageItems.js";
import type * as cartDetails from "../cartDetails.js";
import type * as contactRoles from "../contactRoles.js";
import type * as contacts from "../contacts.js";
import type * as developmentSeed from "../developmentSeed.js";
import type * as eventContacts from "../eventContacts.js";
import type * as events from "../events.js";
import type * as foodItems from "../foodItems.js";
import type * as legacyImport from "../legacyImport.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_contactOperations from "../lib/contactOperations.js";
import type * as lib_contactValidators from "../lib/contactValidators.js";
import type * as lib_legacyImport from "../lib/legacyImport.js";
import type * as lib_records from "../lib/records.js";
import type * as lib_schemaCheck from "../lib/schemaCheck.js";
import type * as lib_testIdentity from "../lib/testIdentity.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_validators from "../lib/validators.js";
import type * as menuOfChargeItems from "../menuOfChargeItems.js";
import type * as payments from "../payments.js";
import type * as timeblocks from "../timeblocks.js";
import type * as touchpoints from "../touchpoints.js";
import type * as tournamentDetails from "../tournamentDetails.js";
import type * as users from "../users.js";
import type * as vendorCategories from "../vendorCategories.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  beverageItems: typeof beverageItems;
  cartDetails: typeof cartDetails;
  contactRoles: typeof contactRoles;
  contacts: typeof contacts;
  developmentSeed: typeof developmentSeed;
  eventContacts: typeof eventContacts;
  events: typeof events;
  foodItems: typeof foodItems;
  legacyImport: typeof legacyImport;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/contactOperations": typeof lib_contactOperations;
  "lib/contactValidators": typeof lib_contactValidators;
  "lib/legacyImport": typeof lib_legacyImport;
  "lib/records": typeof lib_records;
  "lib/schemaCheck": typeof lib_schemaCheck;
  "lib/testIdentity": typeof lib_testIdentity;
  "lib/users": typeof lib_users;
  "lib/validators": typeof lib_validators;
  menuOfChargeItems: typeof menuOfChargeItems;
  payments: typeof payments;
  timeblocks: typeof timeblocks;
  touchpoints: typeof touchpoints;
  tournamentDetails: typeof tournamentDetails;
  users: typeof users;
  vendorCategories: typeof vendorCategories;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
