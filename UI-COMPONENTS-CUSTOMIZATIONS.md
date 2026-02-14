# UI Components Customizations

**Backup Created:** $(date +%Y-%m-%d %H:%M:%S)
**Full Backup Location:** `ui-components-backup-YYYYMMDD-HHMMSS/`

## ⚠️ CRITICAL: Heavily Customized Components

These components have significant custom code and should **NOT** be overwritten without careful review:

### Button Component (`src/lib/components/ui/button/button.svelte`)

**Custom Variants Added:**
- `primary_outline` - Primary colored outline button
- `fancy` - Gradient with glow shadow effect
- `glass` - Glassmorphism with animated conic gradient border
- `glass2` - Glassmorphism with sliding gradient border

**Custom Features:**
1. **Ripple Effect** - Click ripple animation with variant-specific colors
2. **Mouse Tracking** - `tracking` prop enables radial gradient that follows mouse
3. **Glass Borders** - Custom animated border effects with conic/sliding gradients
4. **OKLCH Color System** - Advanced color manipulation using CSS relative colors
5. **Separate Light/Dark Mode Tracking** - Different gradient colors for light/dark themes

**Key Custom Styles:**
```css
.glass-border - Rotating conic gradient border
.glass-border-slide - Sliding linear gradient border
.ripple-effect - Click ripple animation
```

**Custom Props:**
- `tracking?: boolean` - Enables mouse-tracking gradient effect

**DO NOT OVERWRITE** - This component has 430+ lines of custom code!

---

### Custom Components (User Created)

These are completely custom and should be preserved:

1. **`emerald-button/`** - Custom emerald-themed button variant
2. **`glow-card/`** - Custom card with glow effects

---

## Standard Components (Safe to Update)

These appear to be standard shadcn components with minimal customization:

- accordion
- alert
- alert-dialog
- avatar
- badge
- breadcrumb
- card
- checkbox
- data-table
- dialog
- dropdown-menu
- input
- input-otp
- item
- label
- navigation-menu
- **popover** ← Just installed, likely safe to update
- progress
- select
- separator
- slider
- sonner
- switch
- table
- tabs
- textarea
- tooltip

---

## Before Updating Any Component:

1. Check this file for customizations
2. Review the component code for custom variants/features
3. Create a backup if uncertain
4. Test thoroughly after updating

---

## Restoration Instructions

If you accidentally overwrite a customized component:

```bash
# Restore from backup
cp -r ui-components-backup-YYYYMMDD-HHMMSS/button src/lib/components/ui/

# Or restore specific file
cp ui-components-backup-YYYYMMDD-HHMMSS/button/button.svelte src/lib/components/ui/button/
```

---

## Custom Button Variants Reference

### Usage Examples:

```svelte
<!-- Primary outline -->
<Button variant="primary_outline">Click me</Button>

<!-- Fancy with glow -->
<Button variant="fancy">Special Action</Button>

<!-- Glass with rotating border -->
<Button variant="glass">Glass Effect</Button>

<!-- Glass with sliding border -->
<Button variant="glass2">Glass Slide</Button>

<!-- With mouse tracking -->
<Button variant="default" tracking>Track Mouse</Button>
```

### Color System:
All custom variants use OKLCH color space with CSS relative color syntax for dynamic theming:
- Automatically adapts to theme colors
- Separate light/dark mode calculations
- Maintains consistent visual hierarchy
