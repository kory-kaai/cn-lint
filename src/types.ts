export type ClassRef = {
  name: string
  start: number
}

export type Piece = {
  classes: ClassRef[]
  optional: boolean
}

export type Conflict = {
  start: number
  name: string
  overriddenBy: string
  when?: string
}

export const DEFAULT_FUNCTIONS = ['cn', 'twMerge']

export const CONCAT_FUNCTIONS = new Set(['clsx', 'classnames', 'twJoin'])
