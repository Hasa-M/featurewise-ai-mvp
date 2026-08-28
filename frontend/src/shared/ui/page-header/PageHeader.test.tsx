import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('composes a page title with arbitrary actions inside a semantic header', () => {
    const { container } = render(
      <main>
        <PageHeader
          actions={
            <>
              <span>Draft</span>
              <button type="button">Start analysis</button>
            </>
          }
          breadcrumb={<h1>Authentication workflow</h1>}
          id="feature-page-header"
          subtitle="Review the available context before generating a spec."
        />
      </main>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Authentication workflow',
      }),
    ).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
    expect(
      screen.getByText(
        'Review the available context before generating a spec.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Start analysis' }),
    ).toBeVisible();
    expect(container.querySelector('header')).toHaveAttribute(
      'id',
      'feature-page-header',
    );
  });

  it('renders the breadcrumb when optional content is omitted', () => {
    render(
      <main>
        <PageHeader breadcrumb={<h1>Projects</h1>} />
      </main>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Projects' }),
    ).toBeVisible();
    expect(
      screen.queryByText(
        'Review the available context before generating a spec.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
