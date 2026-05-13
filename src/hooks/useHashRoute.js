import { useState, useEffect, useCallback } from 'react';

/**
 * Zero-dependency hash-based router.
 * Uses window.location.hash so it works without react-router-dom.
 *
 * @param {string} defaultRoute – fallback when hash is empty
 * @returns {[string, (path: string) => void]}
 */
export function useHashRoute(defaultRoute = '/dev') {
  const getHash = () => {
    const hash = window.location.hash.slice(1);
    return hash.startsWith('/') ? hash : defaultRoute;
  };

  const [route, setRoute] = useState(getHash);

  useEffect(() => {
    const handler = () => setRoute(getHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);

  return [route, navigate];
}
