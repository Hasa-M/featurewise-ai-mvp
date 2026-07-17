import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('accepts multiline text through its visible label', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TextArea label="Feature brief" onChange={onChange} />);
    const textArea = screen.getByRole('textbox', { name: 'Feature brief' });
    await user.type(textArea, 'User need{enter}Expected outcome');

    expect(textArea).toHaveValue('User need\nExpected outcome');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows the current and maximum character count', async () => {
    const user = userEvent.setup();

    render(
      <TextArea
        aria-label="Context"
        defaultValue="Ready"
        maxLength={10}
        showCharacterCount
      />,
    );
    const textArea = screen.getByRole('textbox', { name: 'Context' });

    expect(screen.getByText('5/10', { exact: false })).toBeInTheDocument();
    await user.type(textArea, ' spec beyond the limit');

    expect(textArea).toHaveValue('Ready spec');
    expect(screen.getByText('10/10', { exact: false })).toBeInTheDocument();
  });

  it('supports a controlled character count', () => {
    const { rerender } = render(
      <TextArea aria-label="Context" showCharacterCount value="Draft" />,
    );

    expect(screen.getByText('5', { exact: false })).toBeInTheDocument();
    rerender(
      <TextArea aria-label="Context" showCharacterCount value="Ready spec" />,
    );
    expect(screen.getByText('10', { exact: false })).toBeInTheDocument();
  });

  it('exposes required, helper, and error states accessibly', () => {
    render(
      <TextArea
        errorMessage="Add an expected outcome."
        helperText="Use the current product brief."
        label="Feature brief"
        required
      />,
    );

    const textArea = screen.getByRole('textbox', { name: 'Feature brief' });
    expect(textArea).toBeRequired();
    expect(textArea).toHaveAccessibleDescription(
      'Use the current product brief. Add an expected outcome.',
    );
    expect(textArea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Add an expected outcome.',
    );
  });

  it('supports an accessible field without a visible label', () => {
    render(<TextArea aria-label="Additional context" />);

    expect(
      screen.getByRole('textbox', { name: 'Additional context' }),
    ).toBeEnabled();
  });

  it('does not accept interaction when disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TextArea aria-label="Context" disabled onChange={onChange} />);
    await user.type(screen.getByRole('textbox', { name: 'Context' }), 'Blocked');

    expect(onChange).not.toHaveBeenCalled();
  });
});
