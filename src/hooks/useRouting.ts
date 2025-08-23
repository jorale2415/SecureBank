import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook for enhanced routing functionality
 */
export function useRouting() {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate with optional state and replace option
  const navigateTo = useCallback((
    path: string, 
    options?: { 
      replace?: boolean; 
      state?: any;
    }
  ) => {
    navigate(path, {
      replace: options?.replace || false,
      state: options?.state
    });
  }, [navigate]);

  // Navigate back in history
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Navigate forward in history
  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // Check if current route matches a pattern
  const isCurrentRoute = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Get current route information
  const getCurrentRoute = useCallback(() => {
    return {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    };
  }, [location]);

  // Navigate with query parameters
  const navigateWithQuery = useCallback((
    path: string, 
    queryParams: Record<string, string>
  ) => {
    const searchParams = new URLSearchParams(queryParams);
    navigate(`${path}?${searchParams.toString()}`);
  }, [navigate]);

  return {
    navigateTo,
    goBack,
    goForward,
    isCurrentRoute,
    getCurrentRoute,
    navigateWithQuery,
    location,
    navigate
  };
}

export default useRouting;