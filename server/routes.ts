import type { Express } from "express";

// Export function to register remaining routes (routes not yet extracted)
// NOTE: All major routes have been extracted to separate files:
// - Auth routes -> routes/auth.ts
// - User routes -> routes/users.ts
// - Filament routes -> routes/filaments.ts
// - Batch routes -> routes/batch.ts
// - Settings routes -> routes/settings.ts
// - Public routes -> routes/public.ts
// - Statistics routes -> routes/statistics.ts
// - Theme routes -> routes/theme.ts
//
// This function is kept for backward compatibility and any legacy routes
// that may still need to be registered.
export function registerRemainingRoutes(app: Express): void {
  // All routes have been extracted to separate files
  // HTTP server creation is handled by routes/index.ts
  // This function is intentionally empty as all routes are now in separate modules
}
