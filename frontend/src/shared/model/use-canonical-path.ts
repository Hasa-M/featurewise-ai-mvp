import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useCanonicalPath(canonicalPathname: string | undefined): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canonicalPathname || location.pathname === canonicalPathname) return;

    void navigate(
      {
        hash: location.hash,
        pathname: canonicalPathname,
        search: location.search,
      },
      {
        replace: true,
        state: location.state,
      },
    );
  }, [
    canonicalPathname,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);
}
