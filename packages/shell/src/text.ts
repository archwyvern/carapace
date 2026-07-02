/** camelCase identifier -> spaced lowercase label ("slopeWidth" -> "slope width"). The shared
 *  key-to-label rule for inspectors/forms that derive display labels from data keys. */
export function humanizeLabel(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}
