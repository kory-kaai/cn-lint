# cn-lint

`cn('overflow-auto inline line-clamp-1')` renders as `line-clamp-1`. The other two classes are deleted, and nothing in the browser tells you.

```tsx
cn('overflow-auto inline', active && 'line-clamp-1')
```

```text
button.tsx:1:5  Class 'overflow-auto' is unused when 'line-clamp-1' is applied. 'line-clamp-1' overrides it.
button.tsx:1:19  Class 'inline' is unused when 'line-clamp-1' is applied. 'line-clamp-1' overrides it.
```

`line-clamp-1` sets `display` and `overflow`, so `tailwind-merge` drops the earlier classes. `cn-lint` runs the same merge and reports the class that lost, with the class that won.

```bash
npx cn-lint
```

## Install

```bash
npm install -D cn-lint
```

Check a project from the command line, or fail CI:

```bash
npx cn-lint src
```

The process exits `1` when a call drops a class.

## ESLint

```js
import cnLint from 'cn-lint/eslint'

export default [cnLint.configs.recommended]
```

The rule is `cn-lint/no-conflicting-classes`. It checks `cn()` and `twMerge()`. Pass `functions` when a project uses another name:

```js
{
  rules: {
    'cn-lint/no-conflicting-classes': ['warn', { functions: ['cn', 'twMerge', 'cx'] }],
  },
}
```

## What it reports

A class is reported when it is always present and a later class removes it:

```tsx
cn('px-2 pt-1 p-4')
// px-2 and pt-1 are unused. p-4 overrides them.
```

It is also reported when one optional class is what removes it:

```tsx
cn('overflow-auto', active && 'line-clamp-1')
```

Two optional classes are not compared with each other. `flag ? 'px-2' : 'p-4'` is two separate cases, so those branches are not a conflict. `hover:` and `md:` stay independent of the unprefixed class, because that is how `tailwind-merge` works.

Arguments to `clsx()`, `classnames()`, and `twJoin()` are read through. A template that builds a class, such as `` `p-${size}` ``, is skipped.

## License

MIT
