<p align="center">
  <a href="https://github.com/kory-kaai/cn-lint/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/kory-kaai/cn-lint/ci.yml?branch=main&style=flat-square&label=tests&color=f97316&labelColor=0c0a09" /></a>
  <a href="https://github.com/kory-kaai/cn-lint/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/kory-kaai/cn-lint?style=flat-square&label=stars&color=f97316&labelColor=0c0a09" /></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-f97316?style=flat-square&labelColor=0c0a09" /></a>
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-%E2%89%A520-f97316?style=flat-square&labelColor=0c0a09&logo=nodedotjs&logoColor=white" />
  <img alt="Follows tailwind-merge" src="https://img.shields.io/badge/tailwind--merge-same%20rules-f97316?style=flat-square&labelColor=0c0a09&logo=tailwindcss&logoColor=white" />
</p>

<h1 align="center">cn-lint</h1>

<p align="center">
  <strong>The class that lost. The class that won.</strong><br />
  <code>cn()</code> and <code>twMerge()</code> delete Tailwind classes and leave no trace.<br />
  cn-lint runs that same merge and names both sides.
</p>

<p align="center">
  <img alt="overflow-auto is dropped" src="https://img.shields.io/badge/overflow--auto-dropped-9f1239?style=for-the-badge&labelColor=0c0a09" />
  <img alt="inline is dropped" src="https://img.shields.io/badge/inline-dropped-9f1239?style=for-the-badge&labelColor=0c0a09" />
  <img alt="line-clamp-1 is kept" src="https://img.shields.io/badge/line--clamp--1-kept-047857?style=for-the-badge&labelColor=0c0a09" />
</p>

<p align="center">
  <code>cn('overflow-auto inline', active && 'line-clamp-1')</code>
</p>

`line-clamp-1` sets `display` and `overflow`. The earlier classes never reach the DOM.

> `button.tsx:1:5` Class `overflow-auto` is unused when `line-clamp-1` is applied. `line-clamp-1` overrides it.
>
> `button.tsx:1:19` Class `inline` is unused when `line-clamp-1` is applied. `line-clamp-1` overrides it.

---

## Install

```bash
npm install -D github:kory-kaai/cn-lint
npx cn-lint src
```

The process exits `1` when a call drops a class, so the same command can fail CI.

### Command line

Walks the project, skips `node_modules`, `dist`, and `.git`, and prints `file:line:column`.

```bash
npx cn-lint
npx cn-lint src components
npx cn-lint --functions cn,twMerge,cx
```

`cn` and `twMerge` are checked by default. `cx` is not, because it is often `clsx` with no merge.

### ESLint

```js
import cnLint from 'cn-lint/eslint'

export default [cnLint.configs.recommended]
```

The rule is `cn-lint/no-conflicting-classes`. Another function name is an option:

```js
{
  rules: {
    'cn-lint/no-conflicting-classes': ['warn', { functions: ['cn', 'twMerge', 'cx'] }],
  },
}
```

---

## The report

| You wrote | What happens |
| --- | --- |
| `cn('px-2 pt-1 p-4')` | `px-2` and `pt-1` lose. `p-4` wins. |
| `cn('p-4 px-2')` | Both stay. A later `px` does not override `p`. |
| `cn('overflow-auto', active && 'line-clamp-1')` | Reported only for the case where `line-clamp-1` is applied. |
| `cn('m-1', flag ? 'px-2' : 'p-4')` | Quiet. The two branches never apply together. |
| `cn('hover:p-4', 'p-2')` | Quiet. A variant does not fight the unprefixed class. |
| `` cn(`p-${size} px-2`) `` | Skipped. The class name is built at runtime. |

`clsx()`, `classnames()`, and `twJoin()` are read through, so a conflict inside them is still caught:

```tsx
twMerge(clsx('overflow-auto', 'line-clamp-1'))
```

An object key is required when its value is `true`, and ignored when it is `false`. A variable makes that key optional, and two optional keys are not compared with each other.

---

<p align="center">
  <a href="https://github.com/kory-kaai/cn-lint/releases/tag/v0.1.0">v0.1.0</a>
  &nbsp;·&nbsp;
  <a href="./LICENSE">MIT</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/kory-kaai">Kory Kaai</a>
</p>
