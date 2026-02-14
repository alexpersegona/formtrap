---
priority: high
---
# Svelte 5 Patterns

Svelte 5 introduces runes - a new way to declare reactive state and logic. **Always use runes** instead of legacy Svelte syntax.

## Never Use `<svelte:component>` in Svelte 5 Runes Mode

**ALWAYS avoid `<svelte:component>` in Svelte 5. Components are dynamic by default. Use `{@const}` to assign components to variables, then render directly.**

### WRONG - Using `<svelte:component>` (deprecated):
```svelte
<svelte:component this={getSortIcon(columnId)} class="h-4 w-4" />
```

### CORRECT - Assign with `{@const}`, render directly:
```svelte
{@const SortIcon = getSortIcon(columnId)}
<SortIcon class="h-4 w-4" />
```

**For dynamic components from a map:**
```svelte
<script lang="ts">
  const iconMap = {
    home: HomeIcon,
    settings: SettingsIcon,
    user: UserIcon
  } as const;

  let iconType = $state<keyof typeof iconMap>('home');
</script>

{@const Icon = iconMap[iconType]}
<Icon />
```

## State Management

**$state** - Declare reactive state
```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'John', age: 30 });

  function increment() {
    count++;
  }

  function updateUser() {
    user.age++; // Mutations are reactive
  }
</script>
```

**$state.frozen** - Immutable state (performance optimization). Must replace entire object to update.

## Derived Values

**$derived** - Computed values that update automatically
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  let message = $derived(`Count is ${count}`);

  let items = $state([1, 2, 3, 4, 5]);
  let evenItems = $derived(items.filter(n => n % 2 === 0));
  let total = $derived(items.reduce((sum, n) => sum + n, 0));
</script>
```

**$derived.by** - For complex derivations requiring multiple statements
```svelte
<script lang="ts">
  let users = $state([...]);

  let statistics = $derived.by(() => {
    const active = users.filter(u => u.active);
    const inactive = users.filter(u => !u.active);
    return {
      activeCount: active.length,
      inactiveCount: inactive.length,
      totalCount: users.length
    };
  });
</script>
```

## Side Effects

**$effect** - Run side effects when dependencies change
```svelte
<script lang="ts">
  let count = $state(0);

  $effect(() => {
    console.log(`Count is now ${count}`);
    document.title = `Count: ${count}`;
  });

  // Cleanup function
  $effect(() => {
    const interval = setInterval(() => {
      console.log(count);
    }, 1000);

    return () => clearInterval(interval);
  });
</script>
```

**$effect.pre** - Runs before DOM updates
**$effect.root** - Create an effect root for manual cleanup

## Component Props

**$props** - Declare component props
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onUpdate?: (value: number) => void;
  }

  let { title, count = 0, onUpdate }: Props = $props();

  let doubled = $derived(count * 2);
</script>

<h1>{title}</h1>
<p>Count: {count}, Doubled: {doubled}</p>
```

**$bindable** - Create two-way bindable props
```svelte
<!-- Child.svelte -->
<script lang="ts">
  interface Props {
    value: string;
  }

  let { value = $bindable('') }: Props = $props();
</script>

<input bind:value />
```

## Snippets (Replace Slots)

Snippets replace slots for better type safety and flexibility.

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: Snippet;
    content: Snippet;
    footer?: Snippet;
  }

  let { title, content, footer }: Props = $props();
</script>

<div class="card">
  {#if title}
    <div class="card-header">
      {@render title()}
    </div>
  {/if}

  <div class="card-body">
    {@render content()}
  </div>

  {#if footer}
    <div class="card-footer">
      {@render footer()}
    </div>
  {/if}
</div>
```

**Snippets with Parameters:**
```svelte
<!-- List.svelte -->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    renderItem: Snippet<[T, number]>;
  }

  let { items, renderItem }: Props = $props();
</script>

{#each items as item, index}
  {@render renderItem(item, index)}
{/each}
```

## Best Practices

1. **Use $state for all reactive variables** - No more `let` without $state for reactive values
2. **Use $derived instead of $:** - Derived values are more explicit and composable
3. **Use $effect sparingly** - Prefer derived values when possible
4. **Avoid $effect for derived state** - Use $derived instead
5. **Clean up effects** - Return cleanup functions from $effect
6. **Type your props** - Always use TypeScript interfaces for props
7. **Use $state.frozen for large immutable objects** - Better performance
