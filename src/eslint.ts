import { lintSource } from './lint.ts'
import { DEFAULT_FUNCTIONS } from './types.ts'

type ReportLocation = {
  start: { line: number; column: number }
  end: { line: number; column: number }
}

type RuleContext = {
  filename?: string
  getFilename?: () => string
  sourceCode?: { getText: () => string }
  getSourceCode?: () => { getText: () => string }
  options: [{ functions?: string[] }?]
  report: (descriptor: { loc: ReportLocation; message: string }) => void
}

const rule = {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'Disallow Tailwind classes that cn() or twMerge() will drop.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          functions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: RuleContext) {
    return {
      Program() {
        const source = context.sourceCode?.getText() ?? context.getSourceCode?.().getText() ?? ''
        const filename = context.filename ?? context.getFilename?.() ?? 'input.tsx'
        const functions = context.options[0]?.functions ?? DEFAULT_FUNCTIONS

        for (const diagnostic of lintSource(source, filename, { functions })) {
          const column = diagnostic.column - 1
          context.report({
            loc: {
              start: { line: diagnostic.line, column },
              end: { line: diagnostic.line, column: column + diagnostic.name.length },
            },
            message: diagnostic.message,
          })
        }
      },
    }
  },
}

const plugin = {
  meta: { name: 'cn-lint', version: '0.1.0' },
  rules: {
    'no-conflicting-classes': rule,
  },
  configs: {
    recommended: {
      plugins: {} as Record<string, unknown>,
      rules: {
        'cn-lint/no-conflicting-classes': 'warn',
      },
    },
  },
}

plugin.configs.recommended.plugins['cn-lint'] = plugin

const recommended = plugin.configs.recommended

export default plugin
export { plugin, recommended }
