/** Shown in place of a document whose data failed to load, so a partial document is never exported. */
export function PreviewDataError() {
  return (
    <div className="p-8 text-sm" role="alert">
      <p>Some event details could not be loaded.</p>
      <button className="mt-2 underline" onClick={() => window.location.reload()}>Reload preview</button>
    </div>
  )
}
