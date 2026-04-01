/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as generateBlog from "../generateBlog.js";
import type * as generateHealthQA from "../generateHealthQA.js";
import type * as posts from "../posts.js";
import type * as prompts_dental from "../prompts/dental.js";
import type * as seed from "../seed.js";
import type * as unsplashActions from "../unsplashActions.js";
import type * as users from "../users.js";
import type * as utils_unsplashApi from "../utils/unsplashApi.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  coupons: typeof coupons;
  crons: typeof crons;
  generateBlog: typeof generateBlog;
  generateHealthQA: typeof generateHealthQA;
  posts: typeof posts;
  "prompts/dental": typeof prompts_dental;
  seed: typeof seed;
  unsplashActions: typeof unsplashActions;
  users: typeof users;
  "utils/unsplashApi": typeof utils_unsplashApi;
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
