import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Row = {
  name: string;
  href: string;
  description: string;
};

const ROWS: Row[] = [
  {
    name: 'Overview',
    href: '/docs/features/dashboard',
    description: 'Environments, package counts, pending updates, recent activity',
  },
  {
    name: 'Environments',
    href: '/docs/features/environments',
    description: 'Every interpreter, venv, and conda environment on the machine',
  },
  {
    name: 'Packages',
    href: '/docs/features/installed-packages',
    description: 'Install, upgrade, pin a version, uninstall',
  },
  {
    name: 'Search PyPI',
    href: '/docs/features/search',
    description: 'Find any published project and install it',
  },
  {
    name: 'Updates',
    href: '/docs/features/updates',
    description: 'Everything outdated, sorted by how big the bump is',
  },
  {
    name: 'Cleanup',
    href: '/docs/features/cleanup',
    description: 'pip cache, .egg-info directories, __pycache__ folders',
  },
  {
    name: 'History',
    href: '/docs/features/history',
    description: 'What ran, when, and whether it worked',
  },
  {
    name: 'Doctor',
    href: '/docs/features/doctor',
    description: 'Interpreter, pip, and PyPI reachability',
  },
  {
    name: 'Settings',
    href: '/docs/features/settings',
    description: 'Theme, updates, active environment, stored files',
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Pages</span>
            <Link className={styles.panelAction} to="/docs/intro">
              Get started
            </Link>
          </div>

          <ul className={styles.rows}>
            {ROWS.map((row, index) => (
              <li
                key={row.name}
                className={styles.row}
                style={{animationDelay: `${140 + index * 28}ms`}}
              >
                <Link className={styles.rowLink} to={row.href}>
                  <span className={styles.rowName}>{row.name}</span>
                  <span className={styles.rowDesc}>{row.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.note}>
          <p className={styles.noteText}>
            Runs on the Python interpreters already on your machine. Nothing
            about your packages leaves it.
          </p>
          <a
            className={styles.noteLink}
            href="https://github.com/d3uceY/Cokpyt"
            target="_blank"
            rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
