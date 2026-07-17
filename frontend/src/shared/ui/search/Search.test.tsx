import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Search } from './Search';

describe('Search', () => {
  it('accepts search text through its accessible name', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Search aria-label="Search context" onChange={onChange} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search context' }), 'API');
    expect(onChange).toHaveBeenCalled();
  });

  it('clears a controlled value', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<Search onClear={onClear} value="design" readOnly />);

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('disables input and clear control together', () => {
    render(<Search disabled onClear={() => undefined} value="spec" readOnly />);

    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeDisabled();
  });
});
