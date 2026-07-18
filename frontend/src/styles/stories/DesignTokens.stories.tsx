import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleHelp,
  FileText,
  FolderKanban,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';

import styles from './DesignTokens.module.css';

const meta = {
  title: 'Foundations/Design Tokens',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const colorGroups = {
  Brand: [
    '--brand',
    '--brand-hover',
    '--brand-active',
    '--brand-subtle',
    '--brand-border',
    '--brand-text',
  ],
  Accent: [
    '--accent',
    '--accent-strong',
    '--accent-subtle',
    '--accent-border',
    '--accent-text',
  ],
  Status: [
    '--status-ready-solid',
    '--status-attention-solid',
    '--status-blocked-solid',
    '--status-blocked-hover',
    '--on-danger',
    '--status-info-solid',
    '--status-draft-solid',
  ],
  Surfaces: [
    '--surface-page',
    '--surface-canvas',
    '--surface-card',
    '--surface-sunken',
    '--surface-brand-strong',
    '--surface-inverse',
  ],
} as const;

function FoundationPage({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className="fw-overline">Featurewise foundations</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </main>
  );
}

export const Colors: Story = {
  render: () => (
    <FoundationPage
      title="Color system"
      description="Product UI should consume semantic aliases rather than raw scales."
    >
      {Object.entries(colorGroups).map(([group, tokens]) => (
        <section className={styles.section} key={group}>
          <h2>{group}</h2>
          <div className={styles.grid}>
            {tokens.map((token) => (
              <div className={styles.swatch} key={token}>
                <div
                  className={styles.swatchColor}
                  style={{ background: `var(${token})` }}
                />
                <div className={styles.tokenName}>{token}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </FoundationPage>
  ),
};

const typeTokens = [
  ['--type-display-size', 'Display'],
  ['--type-h1-size', 'Heading one'],
  ['--type-h2-size', 'Heading two'],
  ['--type-h3-size', 'Heading three'],
  ['--type-prose-size', 'Readable specification prose'],
  ['--type-body-size', 'Default interface body'],
  ['--type-caption-size', 'Caption and metadata'],
] as const;

export const Typography: Story = {
  render: () => (
    <FoundationPage
      title="Typography"
      description="Geist and Geist Mono are bundled locally for deterministic rendering."
    >
      <section className={styles.typeList}>
        {typeTokens.map(([token, label]) => (
          <div className={styles.typeRow} key={token}>
            <span className={styles.tokenName}>{token}</span>
            <span style={{ fontSize: `var(${token})` }}>{label}</span>
          </div>
        ))}
      </section>
    </FoundationPage>
  ),
};

const spacingTokens = [
  '--space-px',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-6',
  '--space-8',
  '--space-12',
  '--space-16',
] as const;

export const Spacing: Story = {
  render: () => (
    <FoundationPage
      title="Spacing"
      description="A four-pixel base grid supports compact product interfaces."
    >
      <section className={styles.scaleList}>
        {spacingTokens.map((token) => (
          <div className={styles.scaleRow} key={token}>
            <span className={styles.tokenName}>{token}</span>
            <span
              className={styles.scaleBar}
              style={{ '--token-width': `var(${token})` } as CSSProperties}
            />
          </div>
        ))}
      </section>
    </FoundationPage>
  ),
};

const shadowTokens = [
  '--shadow-xs',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
] as const;

export const Elevation: Story = {
  render: () => (
    <FoundationPage
      title="Elevation"
      description="Layered shadows distinguish raised work surfaces."
    >
      <section className={styles.shadowList}>
        {shadowTokens.map((token) => (
          <div
            className={styles.shadowRow}
            key={token}
            style={{ '--token-shadow': `var(${token})` } as CSSProperties}
          >
            <span className={styles.tokenName}>{token}</span>
            <span>Raised surface</span>
          </div>
        ))}
      </section>
    </FoundationPage>
  ),
};

const icons = [
  ['Sparkles', Sparkles],
  ['FolderKanban', FolderKanban],
  ['FileText', FileText],
  ['Search', Search],
  ['Plus', Plus],
  ['ArrowRight', ArrowRight],
  ['Check', Check],
  ['AlertTriangle', AlertTriangle],
  ['CircleHelp', CircleHelp],
  ['Settings', Settings],
  ['Trash2', Trash2],
] as const;

export const Iconography: Story = {
  render: () => (
    <FoundationPage
      title="Iconography"
      description="Lucide icons use named imports and inherit color from their context."
    >
      <section className={styles.iconGrid}>
        {icons.map(([name, Icon]) => (
          <div className={styles.iconItem} key={name}>
            <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
            <span>{name}</span>
          </div>
        ))}
      </section>
    </FoundationPage>
  ),
};
