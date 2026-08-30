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
              <span>FEAT-5831</span>
              <button type="button">Edit feature</button>
            </>
          }
          breadcrumb={<h1>Authentication workflow</h1>}
          id="feature-page-header"
          subtitle="Review the specification and supporting context."
        />
      </main>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Authentication workflow',
      }),
    ).toBeVisible();
    expect(screen.getByText('FEAT-5831')).toBeVisible();
    expect(
      screen.getByText(
        'Review the specification and supporting context.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Edit feature' }),
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
        'Review the specification and supporting context.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
