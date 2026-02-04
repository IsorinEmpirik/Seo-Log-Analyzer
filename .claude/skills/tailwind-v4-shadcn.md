# Tailwind CSS v4 + shadcn/ui

## Four-Step Pattern

### Step 1: CSS Variables at Root
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Step 2: Theme Mapping
```css
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
}
```

### Step 3: Base Layer
```css
@layer base {
  body {
    background-color: var(--background);
    color: var(--foreground);
  }
}
```

### Step 4: Dark Mode
Automatic via ThemeProvider + HTML class.

## Critical Config

**vite.config.ts** : Use `@tailwindcss/vite` plugin
**components.json** : Empty `tailwind.config` value

## Key Dependencies
- `tailwindcss` + `@tailwindcss/vite`
- `tw-animate-css` (NOT tailwindcss-animate)
- shadcn/ui via CLI

## Common Errors
1. Use `tw-animate-css` not `tailwindcss-animate`
2. Require `@theme inline` for utilities
3. Don't create `tailwind.config.ts` in v4
4. `@apply` doesn't work with layer classes
