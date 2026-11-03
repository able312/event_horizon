import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** True when a note or other free text has something besides whitespace. */
export function hasText(value: string | null | undefined): value is string {
  return Boolean(value?.trim())
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
