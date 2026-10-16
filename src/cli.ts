#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { formatDiagnostic, lintSource, type LintOptions } from './lint.ts'

const SOURCE = /\.(?:[cm]?[jt]sx?)$/

export async function run(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    return 0
  }

  const { files, options } = parseArgs(argv)
  const targets = files.length === 0 ? ['.'] : files
  const collected = await Promise.all(targets.map((target) => collect(target)))
  if (collected.some((entry) => entry === null)) return 1
  const paths = collected.flatMap((entry) => entry ?? [])
  let count = 0

  for (const file of paths) {
    const source = await readFile(file, 'utf8')
    for (const diagnostic of lintSource(source, file, options)) {
      process.stdout.write(`${formatDiagnostic(file, diagnostic)}\n`)
      count += 1
    }
  }

  return count === 0 ? 0 : 1
}

function parseArgs(argv: readonly string[]): { files: string[]; options: LintOptions } {
  const files: string[] = []
  let functions: string[] | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    if (arg === '--functions') {
      functions = (argv[index + 1] ?? '').split(',').map((name) => name.trim()).filter((name) => name.length > 0)
      index += 1
      continue
    }
    if (arg === '--help' || arg === '-h') continue
    files.push(arg)
  }

  return { files, options: functions === undefined ? {} : { functions } }
}

function printHelp(): void {
  process.stdout.write(`cn-lint [files or directories]

Report Tailwind classes that cn() and twMerge() silently drop.

  --functions cn,twMerge   Function names to check
`)
}

async function collect(target: string): Promise<string[] | null> {
  const info = await stat(target).catch(() => null)
  if (info === null) {
    process.stderr.write(`cn-lint: cannot read ${target}\n`)
    return null
  }
  if (info.isFile()) return SOURCE.test(target) ? [target] : []
  if (!info.isDirectory()) return []

  const entries = await readdir(target, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git')
      .map((entry) => collect(path.join(target, entry.name))),
  )
  if (nested.some((entry) => entry === null)) return null
  return nested.flatMap((entry) => entry ?? [])
}

const entry = process.argv[1]
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`cn-lint: ${message}\n`)
      process.exitCode = 1
    })
}
