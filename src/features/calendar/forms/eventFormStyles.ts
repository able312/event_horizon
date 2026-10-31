/** Shared input styling for the dark calendar sidebar forms. */
export const formFieldClasses =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-stone-100 placeholder:text-stone-400 [color-scheme:dark] focus:border-white/30 focus:outline-none"

/**
 * Native <option> popups ignore the select's translucent background, so
 * without an explicit fill Windows draws light text on a white list.
 */
export const formOptionClasses = "bg-stone-900 text-stone-100 checked:bg-stone-700"

/** Text input of the shared DatePicker inside the dark sidebar forms. */
export const formDateFieldClasses =
  "border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-400 focus-visible:border-white/30"

export const formLabelClasses = "mb-1 block text-sm font-medium text-stone-100"
