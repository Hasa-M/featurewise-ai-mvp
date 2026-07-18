import { LoginForm } from '@/features/auth';
import { Logo } from '@/shared/ui/logo';

import styles from './LoginPage.module.css';

export function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby={'login-title'}>
        <Logo className={styles.logo}/>
        <div className={styles.intro}>
          <h1 id={'login-title'}>Sign in</h1>
          <p>Product-intent readiness for your team.</p>
        </div>
        <div className={styles.form}>
          <LoginForm />
        </div>
        <p className={styles.footer}>
          Phase 1 prototype · single-user, local-first.
        </p>
      </section>
    </main>
  );
}
