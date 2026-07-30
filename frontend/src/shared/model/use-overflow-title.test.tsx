import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOverflowTitle } from './use-overflow-title';

function OverflowTitleFixture() {
  const overflowTitle = useOverflowTitle<HTMLSpanElement>();

  return <span {...overflowTitle}>Complete truncated text</span>;
}

describe('useOverflowTitle', () => {
  it('adds a native title only while overflowing text is hovered', () => {
    render(<OverflowTitleFixture />);
    const text = screen.getByText('Complete truncated text');

    Object.defineProperties(text, {
      clientWidth: { configurable: true, value: 80 },
      scrollWidth: { configurable: true, value: 160 },
    });

    expect(text).not.toHaveAttribute('title');

    fireEvent.mouseEnter(text);
    expect(text).toHaveAttribute('title', 'Complete truncated text');

    fireEvent.mouseLeave(text);
    expect(text).not.toHaveAttribute('title');
  });

  it('does not add a title when the text fits', () => {
    render(<OverflowTitleFixture />);
    const text = screen.getByText('Complete truncated text');

    Object.defineProperties(text, {
      clientWidth: { configurable: true, value: 160 },
      scrollWidth: { configurable: true, value: 160 },
    });

    fireEvent.mouseEnter(text);
    expect(text).not.toHaveAttribute('title');
  });
});