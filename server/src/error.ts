export interface MDXParseError {
  name: string
  column: number | null
  line: number | null
  reason: string
  ruleId: string
  source: string
}

interface Position {
  line: number
  character: number
}

interface MDXErrorPosition {
  reason: string
  start: Position
  end: Position
  replaceable?: boolean
}

export function isMDXParseError(e: any): e is MDXParseError {
  if ('ruleId' in e && 'position' in e) {
    return true
  }
  return false
}

const tagReg = /\((.*?)\)$/

export function parseMDXError(e: MDXParseError): MDXErrorPosition {
  const m = tagReg.exec(e.reason)
  if (m) {
    const ps = m[1].split('-')
    const start = getPosition(ps[0])
    const end = getPosition(ps[1])
    return {
      reason: e.reason.replace(tagReg, ''),
      start: {
        line: start[0],
        character: start[1],
      },
      end: {
        line: end[0],
        character: end[1],
      },
      replaceable: true,
    }
  }
  if (e.column !== null && e.line !== null) {
    return {
      reason: e.reason,
      start: {
        line: e.line - 1,
        character: e.column - 1,
      },
      end: {
        line: e.line - 1,
        character: e.column,
      },
    }
  }
  return {
    reason: e.reason,
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 },
  }
}

export function getPosition(s: string): [number, number] {
  const nums = s.split(':') as [string, string]
  return [Number.parseInt(nums[0], 10) - 1, Number.parseInt(nums[1], 10) - 1]
}
