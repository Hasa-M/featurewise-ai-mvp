import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui/button';

import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <p className="fw-overline">404</p>
        <h1>Page not found</h1>
        <p>The requested workspace view does not exist.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to workspace
        </Button>
      </div>
    </div>
  );
}
