import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Helper component to handle custom navigation events
 * This bridges the gap between custom events and React Router navigation
 */
export default function NavigationHelper() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCustomNavigation = (event: CustomEvent) => {
      const destination = event.detail;
      
      // Map custom navigation events to proper routes
      const routeMap: { [key: string]: string } = {
        'dashboard': '/dashboard',
        'home': '/dashboard',
        'transfer': '/transfer',
        'history': '/history',
        'audit': '/audit',
        'login': '/login',
        'register': '/register'
      };

      const route = routeMap[destination];
      if (route) {
        navigate(route);
      }
    };

    // Listen for custom navigation events
    window.addEventListener('navigate', handleCustomNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigate', handleCustomNavigation as EventListener);
    };
  }, [navigate]);

  return null; // This component doesn't render anything
}