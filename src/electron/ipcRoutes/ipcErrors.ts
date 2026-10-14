export function toError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) {
    return err
  }

  return new Error(fallbackMessage)
}

export function logAndThrow(context: string, err: unknown): never {
  const error = toError(err, context)
  console.error(context, error)
  throw error
}
