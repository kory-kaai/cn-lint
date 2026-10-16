import { findConflicts, formatConflict } from './analyze.ts'
import { findCalls } from './extract.ts'
import { DEFAULT_FUNCTIONS, type Conflict } from './types.ts'

export type Diagnostic = Conflict & {
  line: number
  column: number
  message: string
}

export type LintOptions = {
  functions?: readonly string[]
}

export function lintSource(source: string, fileName = 'input.tsx', options: LintOptions = {}): Diagnostic[] {
  const functions = new Set(options.functions ?? DEFAULT_FUNCTIONS)
  const calls = findCalls(source, fileName, functions)
  const conflicts = calls.flatMap((call) => findConflicts(call.pieces))

  return conflicts
    .map((conflict) => ({
      ...conflict,
      ...position(source, conflict.start),
      message: formatConflict(conflict),
    }))
    .sort((left, right) => left.start - right.start)
}

export function formatDiagnostic(file: string, diagnostic: Diagnostic): string {
  return `${file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`
}

function position(source: string, start: number): { line: number; column: number } {
  let line = 1
  let column = 1
  const end = Math.min(start, source.length)

  for (let index = 0; index < end; index += 1) {
    if (source[index] === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }

  return { line, column }
}
