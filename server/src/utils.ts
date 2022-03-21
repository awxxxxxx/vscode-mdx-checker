export function replaceAt(s: string, index: number, replacement: string) {
  return (
    s.substring(0, index) +
    replacement +
    s.substring(index + replacement.length)
  )
}
