import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RichText } from './RichText';

describe('RichText', () => {
  it('renders the field contract', () => {
    render(<RichText aria-label={'Context'} />);
    expect(screen.getByRole('group', { name: 'Context' })).toBeInTheDocument();
  });
});
