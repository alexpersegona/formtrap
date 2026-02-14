---
priority: critical
---
# Critical Patterns - ALWAYS Follow

## Before Implementing ANY New Feature

**ALWAYS check the codebase first to see if similar functionality already exists!**

1. **Search for existing implementations** using Grep/Glob tools
2. **Check relevant directories** (e.g., `src/lib/server/` for server utilities, `emails/` for email templates)
3. **Look for patterns** in similar features already built
4. **Reuse existing utilities and patterns** instead of creating new ones
5. **Ask the user if unsure** whether something already exists

**Examples of what to check:**
- Email functionality? Check `src/lib/server/email.ts` and `emails/` directory
- Authentication? Check `src/lib/server/auth.ts`
- Database queries? Check existing route files for patterns
- UI components? Check `src/lib/components/ui/`

## Form Actions Must Use `use:enhance` Pattern

**NEVER use `fetch` to call SvelteKit form actions. ALWAYS use the `use:enhance` pattern with HTML forms.**

### WRONG - Using fetch (causes "Failed" errors even when it works):
```typescript
async function handleAction() {
    const response = await fetch('?/actionName', { method: 'POST', body: formData });
    const result = await response.json(); // This fails or returns wrong format
}
```

### CORRECT - Using hidden form with use:enhance:
```svelte
<script lang="ts">
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';

    let formRef: HTMLFormElement;
    let loading = $state(false);

    const handleSubmit: SubmitFunction = () => {
        loading = true;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                toast.success('Action completed successfully');
                await update();
            } else if (result.type === 'failure') {
                toast.error('Action failed');
            }
            loading = false;
        };
    };

    function triggerAction() {
        formRef.requestSubmit();
    }
</script>

<form bind:this={formRef} method="POST" action="?/actionName" use:enhance={handleSubmit} class="hidden">
    <input type="hidden" name="data" value={someValue} />
</form>

<Button onclick={triggerAction}>Trigger Action</Button>
```

**Why this matters:**
- `fetch` to `?/actionName` returns SvelteKit's wrapped response format, not pure JSON
- Frontend shows errors even when backend succeeds
- `use:enhance` properly handles SvelteKit's response types (success, failure, redirect)
- Toast notifications work correctly
- State updates (invalidateAll) work properly

**Reference:** See working examples in `src/routes/(protected)/spaces/[id]/forms/[formId]/edit/+page.svelte`

## Svelte 5 - Never Mix `let:` Directives with Snippet-Based Components

**ERROR: "invalid_default_snippet" - Cannot use `{@render children(...)}` if parent uses `let:` directives**

### WRONG - Using `let:` with default children:
```svelte
<Popover.Trigger asChild let:builder>
  <Button builders={[builder]}>Click me</Button>
</Popover.Trigger>
```

### CORRECT - Use named snippet:
```svelte
<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <Button {...props} builders={[builder]}>Click me</Button>
  {/snippet}
</Popover.Trigger>
```

### ALTERNATIVE - Remove asChild if builder not needed:
```svelte
<Popover.Trigger>
  <Button>Click me</Button>
</Popover.Trigger>
```

**Why this matters:**
- `let:` directives are from Svelte 4's slot system
- `{@render children()}` is Svelte 5's snippet system
- They are incompatible and cannot be mixed
- Modern shadcn-svelte components use snippets internally

**When implementing ANY component with `asChild let:builder`, ALWAYS use the named snippet pattern above.**
