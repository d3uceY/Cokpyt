import type {ReactNode} from 'react';
import {useState, useEffect} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const heroUrl = useBaseUrl('/img/hero.png');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/d3uceY/Cokpyt/releases/latest', {
      headers: {Accept: 'application/vnd.github+json'},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.tag_name) setLatestVersion(data.tag_name);
      })
      .catch(() => {});
  }, []);

  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>
            Every Python environment.
            <br />
            One window.
          </h1>

          <p className={styles.subtitle}>
            A desktop GUI for pip. Browse, install, upgrade, and remove packages
            without the terminal.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primary} to="/docs/installation">
              Download
            </Link>
            <Link className={styles.secondary} to="/docs/intro">
              Read the docs
            </Link>
          </div>

          <div className={styles.meta}>
            {latestVersion && (
              <span className={styles.version}>{latestVersion}</span>
            )}
            <span className={styles.metaItem}>Windows · macOS · Linux</span>
            <span className={styles.metaItem}>Runs locally</span>
          </div>
        </div>

        <figure className={styles.figure}>
          <img
            src={heroUrl}
            alt="The Cokpyt overview page, showing environments, package counts, and recent activity"
            className={styles.image}
          />
        </figure>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Cokpyt — pip, without the terminal"
      description="Cokpyt is a desktop GUI for pip. Every Python environment on your machine in one window: install, upgrade, and uninstall packages, search PyPI, check pip's health, and reclaim disk space.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
