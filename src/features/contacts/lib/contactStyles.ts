import type { ContactRoleType, VendorCategorySummary } from "~/definitions/contacts"

type Swatch = { avatar: string; badge: string; dot: string }

/** Tailwind needs literal class names, so every vendor color token is spelled out here. */
const COLOR_TOKEN_SWATCHES: Record<string, Swatch> = {
  teal: { avatar: "bg-teal-100 text-teal-800", badge: "bg-teal-50 text-teal-700", dot: "bg-teal-500" },
  amber: { avatar: "bg-amber-100 text-amber-800", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  violet: { avatar: "bg-violet-100 text-violet-800", badge: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  sky: { avatar: "bg-sky-100 text-sky-800", badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  stone: { avatar: "bg-stone-200 text-stone-800", badge: "bg-stone-100 text-stone-700", dot: "bg-stone-500" },
  indigo: { avatar: "bg-indigo-100 text-indigo-800", badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  rose: { avatar: "bg-rose-100 text-rose-800", badge: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  slate: { avatar: "bg-slate-200 text-slate-800", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
}

const ROLE_AVATAR_CLASSES: Record<ContactRoleType, string> = {
  client: "bg-blue-100 text-blue-900",
  coordinator: "bg-orange-100 text-orange-800",
  vendor: COLOR_TOKEN_SWATCHES.stone!.avatar,
}

export function getSwatch(colorToken: string): Swatch {
  return COLOR_TOKEN_SWATCHES[colorToken] ?? COLOR_TOKEN_SWATCHES.stone!
}

/** Vendors take their category color; clients and coordinators use a fixed role color. */
export function getAvatarClass(role: ContactRoleType, vendorCategory: VendorCategorySummary | null): string {
  if (role === "vendor" && vendorCategory) return getSwatch(vendorCategory.colorToken).avatar
  return ROLE_AVATAR_CLASSES[role]
}
