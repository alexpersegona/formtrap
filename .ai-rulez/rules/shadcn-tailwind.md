---
priority: high
---
# shadcn-svelte & Tailwind CSS

## UI Components

**IMPORTANT**: Always use shadcn-svelte components when they exist instead of native HTML elements.

Examples:
- Use `<Checkbox>` instead of `<input type="checkbox">`
- Use `<Input>` instead of `<input>`
- Use `<Button>` instead of `<button>`

Available components are in `src/lib/components/ui/`

If a component doesn't exist, install it with:
```bash
npx shadcn-svelte@latest add [component-name]
```

## Tech Stack
- **Tailwind CSS v4** - Utility-first CSS with JIT compilation
- **shadcn-svelte** - High-quality, accessible UI component library
- **Lucide Svelte** - Icon library
- **Design System**: Stone color scheme (baseColor in components.json)

## Tailwind Plugins
- `@tailwindcss/forms` - Form styling
- `@tailwindcss/typography` - Rich text styling
- `tw-animate-css` - Animation utilities

## Dot Notation Syntax

When working with ShadCN components in SvelteKit, use the **dot notation (compound component)** syntax:

```svelte
<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
```

## Styling Utilities

The project uses `clsx` and `tailwind-merge` via the `cn()` utility:

```typescript
import { cn } from '$lib/utils';

<div class={cn('base-class', conditionalClass && 'conditional', className)} />
```

## Button Variants

Available variants: default, secondary, destructive, outline, ghost, link

```svelte
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Menu Item</Button>
```

## Tailwind v4 Transition with Translate

**IMPORTANT**: In Tailwind CSS v4, the `translate-y-*` and `translate-x-*` utilities use the modern CSS `translate` property, NOT `transform: translateY()`.

When animating translate on hover, you must use `translate` as the transition property:

```svelte
<!-- WRONG - won't animate because transform isn't being changed -->
<div class="transition-[transform] hover:-translate-y-2">...</div>

<!-- CORRECT - animates the translate property -->
<div class="transition-[translate] hover:-translate-y-2">...</div>

<!-- For multiple properties -->
<div class="transition-[translate,box-shadow,border-color] duration-500 hover:-translate-y-2 hover:shadow-lg">...</div>
```
