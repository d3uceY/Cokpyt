import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('/img/logo.png');
  const heroUrl = useBaseUrl('/img/hero.png');
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <div className={styles.heroLockup}>
            <img src={logoUrl} alt="Cokpyt" className={styles.heroLogo} />
            <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          </div>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className={styles.ctaButton} to="/docs/intro">
              Get Started →
            </Link>
            <Link className={styles.ctaButtonOutline} to="/docs/features/dashboard">
              See Features
            </Link>
          </div>
        </div>
        <div className={styles.heroImageWrap}>
          <img src={heroUrl} alt="Cokpyt app screenshot" className={styles.heroImage} />
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — pip GUI`}
      description="Cokpyt is a fast, lightweight desktop GUI for pip. Browse installed packages, search PyPI, upgrade, uninstall, run health checks, and more — all without touching the terminal.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
