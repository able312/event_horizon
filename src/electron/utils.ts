export function isDev (): boolean {
    return process.env.NODE_ENV === "development"
}

export function isDate(dateString: string | undefined): boolean {
  if (!dateString) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}