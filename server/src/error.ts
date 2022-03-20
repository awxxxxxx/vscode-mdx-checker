export interface MDXParseError {
  name: string;
  column: number;
  line: number;
  reason: string;
}

export function isMDXParseError(e: any): e is MDXParseError {
  if ("ruleId" in e && "position" in e) {
    return true;
  }
  return false;
}
