# React Best Practices (Vercel)

## Rule Categories (Priority Order)

1. **Eliminating Waterfalls** (CRITICAL) - `async-` prefix
2. **Bundle Size Optimization** (CRITICAL) - `bundle-` prefix
3. **Server-Side Performance** (HIGH) - `server-` prefix
4. **Client-Side Data Fetching** (MEDIUM-HIGH) - `client-` prefix
5. **Re-render Optimization** (MEDIUM) - `rerender-` prefix
6. **Rendering Performance** (MEDIUM) - `rendering-` prefix
7. **JavaScript Performance** (LOW-MEDIUM) - `js-` prefix
8. **Advanced Patterns** (LOW) - `advanced-` prefix

## Key Rules

### Eliminating Waterfalls
- Fetch data in parallel, not sequentially
- Use Promise.all for independent requests
- Preload critical data

### Bundle Size
- Use dynamic imports for heavy components
- Tree-shake unused code
- Lazy load routes

### Re-render Optimization
- Use React.memo for expensive components
- useMemo for expensive calculations
- useCallback for stable function references
