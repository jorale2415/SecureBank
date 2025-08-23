/**
 * Route utility functions for consistent routing behavior
 */

// Define all application routes
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  HOME: '/dashboard', // Alias for dashboard
  TRANSFER: '/transfer',
  HISTORY: '/history',
  AUDIT: '/audit'
} as const;

// Route validation
export function isValidRoute(path: string): boolean {
  return Object.values(ROUTES).includes(path as any);
}

// Get route name from path
export function getRouteName(path: string): string {
  const routeEntry = Object.entries(ROUTES).find(([, value]) => value === path);
  return routeEntry ? routeEntry[0].toLowerCase() : 'unknown';
}

// Build route with parameters
export function buildRoute(basePath: string, params?: Record<string, string>): string {
  let route = basePath;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    route += `?${searchParams.toString()}`;
  }
  
  return route;
}

// Extract query parameters from current location
export function getQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

// Check if route requires authentication
export function isProtectedRoute(path: string): boolean {
  const publicRoutes = [ROUTES.LOGIN, ROUTES.REGISTER];
  return !publicRoutes.includes(path as any);
}

// Get default route for authenticated/unauthenticated users
export function getDefaultRoute(isAuthenticated: boolean): string {
  return isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN;
}