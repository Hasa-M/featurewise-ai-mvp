import { FolderKanban } from 'lucide-react';

import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.page}>
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
