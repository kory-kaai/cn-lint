import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { twMerge } from 'tailwind-merge'

import { run } from '../src/cli.ts'
import plugin from '../src/eslint.ts'
import { lintSource } from '../src/lint.ts'

test('published tailwind-merge still drops the classes the readme shows', () => {
  assert.equal(twMerge('overflow-auto inline line-clamp-1'), 'line-clamp-1')
  assert.equal(twMerge('px-2 pt-1 p-4'), 'p-4')
  assert.equal(twMerge('p-4 px-2'), 'p-4 px-2')
})

test('checks each argument of cn()', () => {
  const diagnostics = lintSource(`cn('px-2', 'pt-1', 'p-4')`)
  assert.equal(diagnostics.length, 2)
  assert.deepEqual(lintSource(`cn('md:px-2 md:p-4')`).map((diagnostic) => diagnostic.name), ['md:px-2'])
})

test('reports a required class that a later class drops', () => {
  const diagnostics = lintSource(`cn('px-2 pt-1 p-4')\n`)
  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.message),
    ["Class 'px-2' is unused. 'p-4' overrides it.", "Class 'pt-1' is unused. 'p-4' overrides it."],
  )
  assert.equal(diagnostics[0]?.line, 1)
  assert.equal(diagnostics[0]?.column, 5)
})

test('keeps a later class that does not override an earlier one', () => {
  assert.deepEqual(lintSource(`cn('p-4 px-2')`), [])
  assert.deepEqual(lintSource(`cn('hover:p-4 p-2')`), [])
  assert.deepEqual(lintSource(`cn('p-4', 'md:p-2')`), [])
})

test('names the optional class that drops a required one', () => {
  const diagnostics = lintSource(`cn('overflow-auto inline', active && 'line-clamp-1')`)
  assert.deepEqual(
    diagnostics.map((diagnostic) => [diagnostic.column, diagnostic.message]),
    [
      [5, "Class 'overflow-auto' is unused when 'line-clamp-1' is applied. 'line-clamp-1' overrides it."],
      [19, "Class 'inline' is unused when 'line-clamp-1' is applied. 'line-clamp-1' overrides it."],
    ],
  )
})

test('does not combine two optional pieces', () => {
  assert.deepEqual(lintSource(`cn('m-1', flag ? 'px-2' : 'p-4')`), [])
  assert.deepEqual(lintSource(`cn(left && 'px-2', right && 'p-4')`), [])
})

test('treats an object key as required only when its value is always true', () => {
  const always = lintSource(`cn({ 'px-2': true, 'p-4': true })`)
  assert.equal(always.length, 1)
  assert.equal(always[0]?.message, "Class 'px-2' is unused. 'p-4' overrides it.")
  assert.deepEqual(lintSource(`cn({ 'px-2': false, 'p-4': true })`), [])
  assert.deepEqual(lintSource(`cn({ 'px-2': enabled, 'p-4': other })`), [])
})

test('inlines clsx and still checks twMerge', () => {
  const diagnostics = lintSource(`twMerge(clsx('overflow-auto', 'line-clamp-1'))`)
  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0]?.message ?? '', /overflow-auto/)
})

test('ignores a template that builds the class name', () => {
  assert.deepEqual(lintSource('cn(`p-${size} px-2`)'), [])
})

test('reports a duplicate class by position, not by name', () => {
  const diagnostics = lintSource(`cn('p-4 p-4')`)
  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0]?.column, 5)
})

test('the cli exits 1 and prints the file location', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cn-lint-'))
  const file = path.join(directory, 'button.tsx')
  await writeFile(file, `export const button = cn('overflow-auto inline line-clamp-1')\n`)

  const lines: string[] = []
  const write = process.stdout.write
  process.stdout.write = ((chunk: string | Uint8Array) => {
    lines.push(String(chunk))
    return true
  }) as typeof process.stdout.write

  try {
    const code = await run([file])
    assert.equal(code, 1)
  } finally {
    process.stdout.write = write
  }

  assert.match(lines.join(''), /button\.tsx:1:27  Class 'overflow-auto' is unused/)
  assert.match(lines.join(''), /Class 'inline' is unused/)
})

test('the eslint rule reports the same conflict', () => {
  const reports: string[] = []
  const source = `cn('px-2 p-4')`
  const rule = plugin.rules['no-conflicting-classes']
  const context = {
    filename: 'button.tsx',
    sourceCode: { getText: () => source },
    options: [] as [],
    report(descriptor: { message: string }) {
      reports.push(descriptor.message)
    },
  }
  rule.create(context).Program()
  assert.deepEqual(reports, ["Class 'px-2' is unused. 'p-4' overrides it."])
  assert.equal(plugin.configs.recommended.plugins['cn-lint'], plugin)
})
