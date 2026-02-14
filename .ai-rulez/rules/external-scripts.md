## External Scripts & SPA Navigation

**Priority:** high

Scripts loaded via `<svelte:head>` do NOT re-execute on SPA (client-side) navigation. This breaks third-party widgets like Turnstile, reCAPTCHA, hCaptcha, analytics, etc.

## The Problem

```svelte
<!-- WRONG - Script won't reload on SPA navigation -->
<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="cf-turnstile" data-sitekey={siteKey}></div>
```

When navigating to this page via an internal link (SPA), the script tag is ignored because:
1. The script may already be in the document
2. `<svelte:head>` doesn't re-execute scripts on client-side navigation
3. Auto-rendering widgets won't find their containers

## The Solution

Use `onMount` with dynamic script loading and explicit rendering:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let widgetContainer: HTMLDivElement;
  let widgetId: string | null = $state(null);

  onMount(() => {
    const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !widgetContainer) return;

    function renderWidget() {
      const turnstile = (window as any).turnstile;
      if (!turnstile || !widgetContainer) return;

      widgetContainer.innerHTML = '';
      widgetId = turnstile.render(widgetContainer, {
        sitekey: siteKey,
        theme: 'auto'
      });
    }

    function loadScriptAndRender() {
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

      if ((window as any).turnstile) {
        // Already loaded, render immediately
        renderWidget();
      } else if (existingScript) {
        // Script exists but not ready, poll until ready
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 50);
        setTimeout(() => clearInterval(interval), 10000);
      } else {
        // Load script dynamically with explicit render mode
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => setTimeout(renderWidget, 100);
        document.head.appendChild(script);
      }
    }

    loadScriptAndRender();

    // Cleanup on unmount
    return () => {
      const turnstile = (window as any).turnstile;
      if (widgetId && turnstile) {
        try {
          turnstile.remove(widgetId);
        } catch {
          // Widget may already be removed
        }
      }
    };
  });
</script>

<div bind:this={widgetContainer}></div>
```

## Key Points

1. **Use `onMount`** - Runs on every mount, including SPA navigation
2. **Use `?render=explicit`** - Prevents auto-rendering, gives you control
3. **Handle 3 states**:
   - Widget API already loaded → render immediately
   - Script tag exists but API not ready → poll until ready
   - No script → load dynamically
4. **Cleanup on unmount** - Remove widget to prevent memory leaks
5. **Clear container** - Always clear `innerHTML` before rendering to avoid duplicates

## Applies To

- Cloudflare Turnstile
- Google reCAPTCHA
- hCaptcha
- Analytics scripts (Google Analytics, Plausible, etc.)
- Any third-party widget that renders into a container
