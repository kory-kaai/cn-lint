import ts from 'typescript'

import { CONCAT_FUNCTIONS, type ClassRef, type Piece } from './types.ts'

export type CallSite = {
  name: string
  pieces: Piece[]
}

export function findCalls(source: string, fileName: string, functions: ReadonlySet<string>): CallSite[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const calls: CallSite[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression)
      if (name !== null && functions.has(name)) {
        calls.push({ name, pieces: piecesFromArgs(node.arguments) })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return calls
}

function calleeName(expression: ts.Expression): string | null {
  const unwrapped = unwrap(expression)
  if (ts.isIdentifier(unwrapped)) return unwrapped.text
  if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text
  return null
}

function piecesFromArgs(args: ts.NodeArray<ts.Expression>): Piece[] {
  return args.flatMap((argument) => piecesFrom(argument, false))
}

function piecesFrom(expression: ts.Expression, optional: boolean): Piece[] {
  const node = unwrap(expression)

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [literalPiece(node, optional)]
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return [...piecesFrom(node.left, true), ...piecesFrom(node.right, true)]
  }

  if (ts.isConditionalExpression(node)) {
    return [...piecesFrom(node.whenTrue, true), ...piecesFrom(node.whenFalse, true)]
  }

  if (ts.isObjectLiteralExpression(node)) {
    return piecesFromObject(node, optional)
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap((element) =>
      ts.isSpreadElement(element) ? [] : piecesFrom(element, optional),
    )
  }

  if (ts.isCallExpression(node)) {
    const name = calleeName(node.expression)
    if (name !== null && CONCAT_FUNCTIONS.has(name)) {
      return node.arguments.flatMap((argument) => piecesFrom(argument, optional))
    }
  }

  return []
}

function piecesFromObject(object: ts.ObjectLiteralExpression, optional: boolean): Piece[] {
  const pieces: Piece[] = []

  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) continue

    if (ts.isShorthandPropertyAssignment(property)) {
      pieces.push({
        optional: true,
        classes: [{ name: property.name.text, start: property.name.getStart() }],
      })
      continue
    }

    if (!ts.isPropertyAssignment(property)) continue

    const classes = classesFromPropertyName(property.name)
    if (classes.length === 0) continue

    const value = unwrap(property.initializer)
    if (isAbsent(value)) continue

    const always = value.kind === ts.SyntaxKind.TrueKeyword || ts.isStringLiteral(value)
    pieces.push({ optional: optional || !always, classes })
  }

  return pieces
}

function classesFromPropertyName(name: ts.PropertyName): ClassRef[] {
  if (ts.isIdentifier(name)) {
    return [{ name: name.text, start: name.getStart() }]
  }
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return classesFromText(name.text, name.getStart() + 1)
  }
  return []
}

function literalPiece(node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral, optional: boolean): Piece {
  return {
    optional,
    classes: classesFromText(node.text, node.getStart() + 1),
  }
}

function classesFromText(text: string, contentStart: number): ClassRef[] {
  const refs: ClassRef[] = []
  for (const match of text.matchAll(/\S+/g)) {
    const name = match[0]
    if (name === undefined || match.index === undefined) continue
    refs.push({ name, start: contentStart + match.index })
  }
  return refs
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression
  }
  return current
}

function isAbsent(value: ts.Expression): boolean {
  return (
    value.kind === ts.SyntaxKind.FalseKeyword ||
    value.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(value) && value.text === 'undefined')
  )
}
