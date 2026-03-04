/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authCheck from "../authCheck.js";
import type * as clearAuth from "../clearAuth.js";
import type * as clearData from "../clearData.js";
import type * as equipmentRecognition from "../equipmentRecognition.js";
import type * as equipments from "../equipments.js";
import type * as exercises from "../exercises.js";
import type * as http from "../http.js";
import type * as import_ from "../import.js";
import type * as onboarding from "../onboarding.js";
import type * as programs from "../programs.js";
import type * as svelteAuth from "../svelteAuth.js";
import type * as userProfiles from "../userProfiles.js";
import type * as warmup from "../warmup.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authCheck: typeof authCheck;
  clearAuth: typeof clearAuth;
  clearData: typeof clearData;
  equipmentRecognition: typeof equipmentRecognition;
  equipments: typeof equipments;
  exercises: typeof exercises;
  http: typeof http;
  import: typeof import_;
  onboarding: typeof onboarding;
  programs: typeof programs;
  svelteAuth: typeof svelteAuth;
  userProfiles: typeof userProfiles;
  warmup: typeof warmup;
  workouts: typeof workouts;
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
