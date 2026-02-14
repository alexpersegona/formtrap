# Svelte 4 to 5 Transition Guide

## Understanding `let:` Directives and Builders

This document explains the patterns used in shadcn-svelte components and why they feel boilerplate-heavy during the Svelte 4 → 5 transition.

---

## What Are `let:` Directives?

`let:` directives expose data **from a child component to its parent**. It's how a child component can "send" values up to the parent.

**Example:**
```svelte
<!-- Child.svelte -->
<script>
  let data = { name: "John", age: 30 };
</script>

<slot person={data}></slot>
```

```svelte
<!-- Parent.svelte -->
<Child let:person>
  <p>Name: {person.name}, Age: {person.age}</p>
</Child>
```

In shadcn-svelte, components use this to expose **builder objects** (from melt-ui/bits-ui, the headless UI library):

```svelte
<Popover.Trigger asChild let:builder>
  <!-- 'builder' is exposed from Popover.Trigger -->
  <!-- It contains methods and props needed for accessibility -->
</Popover.Trigger>
```

---

## What Is `builders={[builder]}`?

The `builder` object contains **accessibility attributes and event handlers** that make the component work properly (ARIA attributes, keyboard navigation, focus management, etc.).

**What does `builders={[builder]}` do?**
It spreads those attributes onto the underlying HTML element.

**Under the hood (simplified):**
```typescript
// builder might look like:
builder = {
  role: 'button',
  'aria-expanded': true,
  'aria-haspopup': 'dialog',
  tabindex: 0,
  onClick: handleClick,
  onKeydown: handleKeydown
}

// builders={[builder]} essentially does:
<button {...builder}>Click me</button>

// Which becomes:
<button
  role="button"
  aria-expanded="true"
  aria-haspopup="dialog"
  tabindex="0"
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  Click me
</button>
```

---

## Why the Array `[builder]`?

Some components need **multiple builders** (e.g., a button that's both a tooltip trigger AND a popover trigger):

```svelte
<Tooltip.Trigger asChild let:builder={tooltipBuilder}>
  <Popover.Trigger asChild let:builder={popoverBuilder}>
    {#snippet children(props)}
      <Button {...props} builders={[tooltipBuilder, popoverBuilder]}>
        Click me
      </Button>
    {/snippet}
  </Popover.Trigger>
</Tooltip.Trigger>
```

The Button component merges all builders into one object.

---

## The `asChild` Pattern

`asChild` means "don't render your own element, let the child control the element":

**Without `asChild` (default):**
```svelte
<Popover.Trigger>
  Click me
</Popover.Trigger>

<!-- Renders: -->
<button role="button" aria-expanded="true">Click me</button>
```

**With `asChild` (custom element):**
```svelte
<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <a href="/link" {...props} builders={[builder]}>Click me</a>
  {/snippet}
</Popover.Trigger>

<!-- Renders: -->
<a href="/link" role="button" aria-expanded="true">Click me</a>
```

---

## Complete Example Breakdown

```svelte
<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <Button {...props} builders={[builder]} variant="outline">
      Open Popover
    </Button>
  {/snippet}
</Popover.Trigger>
```

**What's happening:**
1. `asChild` - "Don't render default button, use child's element"
2. `let:builder` - Popover.Trigger exposes accessibility props
3. `{#snippet children(props)}` - Named snippet (required in Svelte 5)
4. `{...props}` - Spreads additional props from Popover.Trigger
5. `builders={[builder]}` - Merges accessibility attributes onto Button
6. Button internally spreads builders onto its `<button>` element

**Final rendered HTML:**
```html
<button
  class="[button classes] [outline variant]"
  role="button"
  aria-expanded="false"
  aria-haspopup="dialog"
  data-state="closed"
  onclick="[popover click handler]"
>
  Open Popover
</button>
```

---

## When Do You Need This?

**Use `asChild let:builder` when:**
- You want to use a custom element (like shadcn Button instead of default button)
- You need custom styling or functionality
- You're composing multiple components together

**Don't use it when:**
- The default element is fine
- You don't need custom styling
- Simpler is better:
  ```svelte
  <Popover.Trigger>Open Popover</Popover.Trigger>
  ```

---

## How Other Frameworks Handle This

### React (Radix UI / shadcn/ui)
**Same pattern, same boilerplate:**
```jsx
<Popover.Trigger asChild>
  <Button variant="outline">Open Popover</Button>
</Popover.Trigger>
```

React's version is actually **cleaner** because it doesn't have the Svelte 4 → 5 transition issues. No `let:builder` needed - the `asChild` prop uses React's `cloneElement` to merge props automatically.

### Vue (Radix Vue / shadcn-vue)
**Similar, uses scoped slots:**
```vue
<PopoverTrigger as-child>
  <template #default="{ props }">
    <Button v-bind="props">Open Popover</Button>
  </template>
</PopoverTrigger>
```

Also boilerplate-heavy!

### Solid (Kobalte)
**Very similar:**
```jsx
<Popover.Trigger asChild>
  <As component={Button}>Open Popover</As>
</Popover.Trigger>
```

---

## The Trade-Off

This pattern exists because of **headless UI libraries** (Radix, Melt UI, Headless UI, bits-ui):

**Pros:**
- Full control over styling
- Accessibility built-in (ARIA, keyboard nav, focus management)
- Composable and flexible
- Framework-agnostic approach

**Cons:**
- Boilerplate heavy
- Learning curve
- Easy to get wrong (like the `let:` + snippets issue)
- Verbose for simple cases

---

## Alternatives That Are Simpler

### Material UI (React), Vuetify (Vue), etc.
**No boilerplate, but opinionated styling:**
```jsx
<Button onClick={handleClick}>Click me</Button>
```

**Problem:** Hard to customize deeply, you're stuck with their design system.

### Other Svelte Options
- Svelte Material UI
- Carbon Components Svelte
- Smelte

**Trade-off:** Simpler API, but less styling flexibility.

---

## The Migration: `asChild` → `child` Snippet

According to the bits-ui migration guide, they **changed from `asChild` to `child` snippet**:

### Old Way (deprecated, what shadcn-svelte currently uses):
```svelte
<Popover.Trigger asChild let:builder>
  <Button builders={[builder]}>Open</Button>
</Popover.Trigger>
```

### New Way (current bits-ui, cleaner):
```svelte
<Popover.Trigger>
  {#snippet child({ props })}
    <Button {...props}>Open</Button>
  {/snippet}
</Popover.Trigger>
```

**Key differences:**
- No `asChild` prop needed
- No `let:builder` directive
- Direct `child` snippet instead of `children`
- Just spread `{...props}` instead of `builders={[builder]}`

---

## Why Your Code Uses The Old Pattern

shadcn-svelte is still using the **old bits-ui API** with `asChild let:builder`. The newer bits-ui version uses `child` snippets, which is **cleaner** and **more Svelte 5-native**.

**This explains the boilerplate!** You're using a transitional version that mixes:
- Svelte 4 patterns (`let:` directives)
- Svelte 5 requirements (named snippets for `{@render children()}`)

This creates the awkward pattern you've been experiencing:
```svelte
<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <Button {...props} builders={[builder]}>Open</Button>
  {/snippet}
</Popover.Trigger>
```

---

## Documentation Resources

### shadcn-svelte
- **Website:** https://www.shadcn-svelte.com/
- **Components:** Shows basic usage, but doesn't emphasize composition patterns
- **Note:** Most examples show the simplest usage without `asChild`

### bits-ui (underlying library)
- **Website:** https://www.bits-ui.com/
- **Child Snippet Docs:** https://www.bits-ui.com/docs/child-snippet
- **Migration Guide:** https://bits-ui.com/docs/migration-guide

The bits-ui docs thoroughly explain:
- The `child` snippet pattern
- Examples with custom elements
- Floating components (Popover, Tooltip, Dialog)

---

## Reducing Boilerplate in Your Project

### 1. Create Wrapper Components
Hide the boilerplate behind reusable components:

```svelte
<!-- PopoverButton.svelte -->
<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import { Button } from '$lib/components/ui/button';

  let { variant = 'outline', children } = $props();
</script>

<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <Button {...props} builders={[builder]} {variant}>
      {@render children()}
    </Button>
  {/snippet}
</Popover.Trigger>
```

**Usage:**
```svelte
<PopoverButton variant="outline">Open Popover</PopoverButton>
```

### 2. Skip `asChild` When You Don't Need Custom Styling
```svelte
<!-- Just use the default button -->
<Popover.Trigger>Open Popover</Popover.Trigger>
```

### 3. Wait for shadcn-svelte to Migrate
Once shadcn-svelte updates to the new bits-ui API, the pattern will be simpler:
```svelte
<Popover.Trigger>
  {#snippet child({ props })}
    <Button {...props}>Open</Button>
  {/snippet}
</Popover.Trigger>
```

---

## Bottom Line

**You're experiencing the current reality of modern component libraries:**
- **Flexibility = Boilerplate**
- **Simplicity = Less control**

The `asChild` + builders pattern is industry-standard for headless UI libraries across all frameworks. It's verbose, but it's the price of having full styling control + built-in accessibility.

**For 80% of cases**, you can hide this behind wrapper components or just use the defaults without `asChild`.

The pattern is especially awkward right now because you're caught in the **Svelte 4 → 5 transition period**. Once shadcn-svelte migrates to the new bits-ui API, it will be cleaner.
