import { QueryClient, type QueryClientConfig } from "@tanstack/react-query"
import { ConvexReactClient } from "convex/react"
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server"
import { ConvexError } from "convex/values"

import type { ContactsErrorCode, ContactsErrorPayload } from "~/definitions/contacts"
import { ContactsError } from "~/lib/contacts/contactsError"
import { resolveConvexUrl } from "./backendConfig"
import { connectLiveQueries, type LiveSource } from "./liveQueries"

// The Convex client and the call helpers every data module uses.
// Nothing outside src/lib/data imports Convex.

let convexClient: ConvexReactClient | null = null

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("No Convex deployment is configured for this build")
    this.name = "BackendNotConfiguredError"
  }
}

export function isBackendConfigured(): boolean {
  return resolveConvexUrl(import.meta.env) !== null
}

export function getConvexClient(): ConvexReactClient {
  if (convexClient) return convexClient
  const url = resolveConvexUrl(import.meta.env)
  if (!url) throw new BackendNotConfiguredError()
  convexClient = new ConvexReactClient(url)
  return convexClient
}

/**
 * The app's QueryClient. Cached reads that opt in stay subscribed to Convex while
 * cached, so other people's changes arrive without a refetch (see liveQueries.ts).
 * Without a configured deployment nothing connects and the session gate explains why.
 */
export function createAppQueryClient(config: QueryClientConfig = {}): QueryClient {
  const queryClient = new QueryClient(config)
  if (isBackendConfigured()) connectLiveQueries(queryClient, getConvexClient())
  return queryClient
}

// ============================================================================
// Calls
// ============================================================================

export type AuthErrorCode = "Unauthenticated" | "Forbidden"

/** The deployment refused the call because the user is signed out or not on the company domain. */
export class BackendAuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = "BackendAuthError"
    this.code = code
  }
}

export function isBackendAuthError(err: unknown): err is BackendAuthError {
  return err instanceof BackendAuthError
}

const CONTACTS_ERROR_CODES = new Set<ContactsErrorCode>([
  "NotFound",
  "EmailTaken",
  "InvalidRoleCategory",
  "ContactArchived",
  "DuplicateAssignment",
  "ContactInUse",
  "InvalidInput",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Turns a Convex structured error into the error type the UI already handles:
 * contact rule failures become ContactsError (as they were over IPC) and auth
 * refusals become BackendAuthError. Anything else passes through unchanged.
 */
export function translateBackendError(err: unknown): unknown {
  if (!(err instanceof ConvexError) || !isRecord(err.data)) return err
  const { code, message } = err.data
  if (typeof code !== "string" || typeof message !== "string") return err
  if (code === "Unauthenticated" || code === "Forbidden") return new BackendAuthError(code, message)
  if (CONTACTS_ERROR_CODES.has(code as ContactsErrorCode)) {
    const existingContactId = err.data.existingContactId
    const payload: ContactsErrorPayload = {
      code: code as ContactsErrorCode,
      message,
      ...(typeof existingContactId === "string" ? { existingContactId } : {}),
    }
    return ContactsError.fromPayload(payload)
  }
  return new Error(message)
}

export async function runQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
): Promise<FunctionReturnType<Query>> {
  try {
    return await getConvexClient().query(query, args)
  } catch (err) {
    throw translateBackendError(err)
  }
}

export async function runMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  args: FunctionArgs<Mutation>,
): Promise<FunctionReturnType<Mutation>> {
  try {
    return await getConvexClient().mutation(mutation, args)
  } catch (err) {
    throw translateBackendError(err)
  }
}

/** Copies only the listed fields that are set; Convex rejects fields its validators don't declare. */
export function pickFields<Source extends object, Key extends keyof Source>(
  source: Source,
  keys: readonly Key[],
): Pick<Source, Key> {
  const picked: Partial<Pick<Source, Key>> = {}
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key]
  }
  return picked as Pick<Source, Key>
}

/** pickFields for food/beverage items: the "Select..." dropdown's '' becomes null, which is what the schema accepts. */
export function pickItemFields<Source extends object, Key extends keyof Source>(
  source: Source,
  keys: readonly Key[],
): Pick<Source, Key> {
  const picked: Record<string, unknown> = pickFields(source, keys)
  if (picked.serviceStyle === "") picked.serviceStyle = null
  return picked as Pick<Source, Key>
}

/** Runs a live source once; cached reads use this so the fetch and the subscription share one call. */
export async function fetchSource<Result>(source: LiveSource<Result>): Promise<Result> {
  try {
    return (await getConvexClient().query(source.query, source.args)) as Result
  } catch (err) {
    throw translateBackendError(err)
  }
}
