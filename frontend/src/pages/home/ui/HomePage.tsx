import { FolderKanban, LogOut, Sparkles } from 'lucide-react';

import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/button';

import styles from './HomePage.module.css';

export function HomePage() {
  const { signOut, user } = useAuth();

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <span>Featurewise</span>
        </div>
        <div className={styles.actions}>
          <span className={styles.environment}>
            {user ? `Signed in as ${user.username}` : 'Local workspace'}
          </span>
          <Button
            leadingIcon={<LogOut size={15} strokeWidth={1.8} />}
            onClick={signOut}
            size={'small'}
            variant={'secondary'}
          >
            Log out
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.emptyState} aria-labelledby="workspace-title">
          <span className={styles.emptyIcon} aria-hidden="true">
            <FolderKanban size={24} strokeWidth={1.8} />
          </span>
          <div className={styles.copy}>
            <p className="fw-overline">Workspace</p>
            <h1 id="workspace-title">No project selected</h1>
            <p>Project workflows will appear here.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
