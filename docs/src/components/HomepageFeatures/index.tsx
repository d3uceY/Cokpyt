import type {ReactNode} from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Full pip Control — No Terminal Required',
    description: (
      <>
        Install, upgrade, and uninstall packages from a clean table view. Filter
        by name, bulk-select for mass removal, and watch live pip output stream
        right inside the app — all with a click.
      </>
    ),
  },
  {
    title: 'Instant PyPI Search & Health Checks',
    description: (
      <>
        Query the entire PyPI index in real time and install any result
        directly. Run the built-in <strong>Doctor</strong> to verify Python,
        pip, and PyPI connectivity, and get plain-English fix hints when
        something is wrong.
      </>
    ),
  },
  {
    title: 'History, Logs & Cleanup — Built In',
    description: (
      <>
        Every action is logged with a timestamp and exit status so you always
        know what changed and when. Reclaim disk space by clearing pip caches,{' '}
        <code>.egg-info</code> dirs, and <code>__pycache__</code> folders in
        one click.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureBody}>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDesc}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        {FeatureList.map((props, idx) => (
          <Feature key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
