import { twMerge } from 'tailwind-merge'

import type { ClassRef, Conflict, Piece } from './types.ts'

export function findConflicts(pieces: Piece[]): Conflict[] {
  const required = pieces.filter((piece) => !piece.optional)
  const conflicts: Conflict[] = []
  const seen = new Set<string>()

  const baseline = new Set(droppedKeys(required))

  collect(required, undefined, baseline, conflicts, seen, false)

  for (const piece of pieces) {
    if (!piece.optional) continue
    const selected = pieces.filter((candidate) => !candidate.optional || candidate === piece)
    collect(selected, piece, baseline, conflicts, seen, true)
  }

  return conflicts
}

function collect(
  pieces: Piece[],
  optional: Piece | undefined,
  baseline: Set<string>,
  conflicts: Conflict[],
  seen: Set<string>,
  skipBaseline: boolean,
): void {
  const refs = pieces.flatMap((piece) => piece.classes)
  const names = refs.map((ref) => ref.name)
  const optionalStarts = new Set(optional?.classes.map((ref) => ref.start) ?? [])

  for (const index of droppedIndexes(names)) {
    const ref = refs[index]
    if (ref === undefined) continue
    const key = `${ref.start}:${ref.name}`
    if (skipBaseline && baseline.has(key)) continue

    const by = culpritIndex(names, index)
    if (by === null) continue
    const winner = refs[by]
    if (winner === undefined) continue

    const causedByOptional = optional !== undefined && optionalStarts.has(winner.start) && !optionalStarts.has(ref.start)
    const when = causedByOptional ? optional.classes.map((item) => item.name).join(' ') : undefined
    const signature = `${key}:${winner.name}:${when ?? ''}`
    if (seen.has(signature)) continue
    seen.add(signature)

    conflicts.push({
      start: ref.start,
      name: ref.name,
      overriddenBy: winner.name,
      ...(when === undefined ? {} : { when }),
    })
  }
}

function droppedKeys(pieces: Piece[]): string[] {
  const refs = pieces.flatMap((piece) => piece.classes)
  return droppedIndexes(refs.map((ref) => ref.name))
    .map((index) => refs[index])
    .filter((ref): ref is ClassRef => ref !== undefined)
    .map((ref) => `${ref.start}:${ref.name}`)
}

function droppedIndexes(names: string[]): number[] {
  const merged = twMerge(names.join(' ')).split(/\s+/).filter((name) => name.length > 0)
  const dropped: number[] = []
  let mergedIndex = merged.length - 1

  for (let index = names.length - 1; index >= 0; index -= 1) {
    if (mergedIndex >= 0 && names[index] === merged[mergedIndex]) {
      mergedIndex -= 1
    } else {
      dropped.push(index)
    }
  }

  return dropped
}

function culpritIndex(names: string[], victim: number): number | null {
  for (let index = names.length - 1; index > victim; index -= 1) {
    const without = names.filter((_, candidate) => candidate !== index)
    if (!droppedIndexes(without).includes(victim)) return index
  }
  return null
}

export function formatConflict(conflict: Conflict): string {
  const when = conflict.when === undefined ? '' : ` when '${conflict.when}' is applied`
  return `Class '${conflict.name}' is unused${when}. '${conflict.overriddenBy}' overrides it.`
}
