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
import type * as foodItems from "../foodItems.js";
import type * as lib_records from "../lib/records.js";
import type * as lib_validators from "../lib/validators.js";
import type * as menuOfChargeItems from "../menuOfChargeItems.js";
import type * as payments from "../payments.js";
import type * as timeblocks from "../timeblocks.js";
import type * as touchpoints from "../touchpoints.js";
import type * as tournamentDetails from "../tournamentDetails.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  beverageItems: typeof beverageItems;
  cartDetails: typeof cartDetails;
  foodItems: typeof foodItems;
  "lib/records": typeof lib_records;
  "lib/validators": typeof lib_validators;
  menuOfChargeItems: typeof menuOfChargeItems;
  payments: typeof payments;
  timeblocks: typeof timeblocks;
  touchpoints: typeof touchpoints;
  tournamentDetails: typeof tournamentDetails;
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
