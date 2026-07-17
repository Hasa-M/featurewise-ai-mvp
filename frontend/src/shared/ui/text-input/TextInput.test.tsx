import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('accepts text through its visible label', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TextInput label="Feature name" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Feature name' });
    await user.type(input, 'Export generated spec');

    expect(input).toHaveValue('Export generated spec');
    expect(onChange).toHaveBeenCalled();
  });

  it.each([
    ['integer', 'Enter an integer', '1'],
    ['decimal', 'Enter a decimal value', 'any'],
    ['percentage', 'Enter a percentage', 'any'],
  ] as const)('configures the %s value type', (valueType, placeholder, step) => {
    render(<TextInput aria-label="Value" valueType={valueType} />);

    const input = screen.getByRole('spinbutton', { name: 'Value' });
    expect(input).toHaveAttribute('placeholder', placeholder);
    expect(input).toHaveAttribute('step', step);
  });

  it('accepts only whole digits for integer values', async () => {
    const user = userEvent.setup();

    render(<TextInput aria-label="Value" valueType="integer" />);
    const input = screen.getByRole('spinbutton', { name: 'Value' });
    await user.type(input, '12.3e+4abc');

    expect(input).toHaveValue(1234);
  });

  it('limits decimal and percentage values to 4 fractional digits by default', async () => {
    const user = userEvent.setup();

    render(
      <>
        <TextInput aria-label="Decimal" valueType="decimal" />
        <TextInput aria-label="Percentage" valueType="percentage" />
      </>,
    );
    const decimal = screen.getByRole('spinbutton', { name: 'Decimal' });
    const percentage = screen.getByRole('spinbutton', { name: 'Percentage' });

    await user.type(decimal, '12.34567abc');
    await user.type(percentage, '98.76543xyz');

    expect(decimal).toHaveValue(12.3456);
    expect(percentage).toHaveValue(98.7654);
  });

  it('supports a custom maximum number of fractional digits', async () => {
    const user = userEvent.setup();

    render(
      <TextInput
        aria-label="Estimate"
        maxFractionDigits={2}
        valueType="decimal"
      />,
    );
    const input = screen.getByRole('spinbutton', { name: 'Estimate' });
    await user.type(input, '1.2345');

    expect(input).toHaveValue(1.23);
  });

  it('rejects pasted numeric values that violate the value contract', async () => {
    const user = userEvent.setup();

    render(<TextInput aria-label="Value" valueType="integer" />);
    const input = screen.getByRole('spinbutton', { name: 'Value' });
    await user.click(input);
    await user.paste('12.5abc');

    expect(input).toHaveValue(null);
  });

  it('adds percentage constraints while allowing explicit overrides', () => {
    const { rerender } = render(
      <TextInput aria-label="Confidence" valueType="percentage" />,
    );
    const input = screen.getByRole('spinbutton', { name: 'Confidence' });

    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');

    rerender(
      <TextInput
        aria-label="Confidence"
        max={200}
        min={-100}
        valueType="percentage"
      />,
    );
    expect(input).toHaveAttribute('min', '-100');
    expect(input).toHaveAttribute('max', '200');
  });

  it('reveals and hides a password with an accessible toggle', async () => {
    const user = userEvent.setup();

    render(<TextInput label={'Password'} valueType={'password'} />);
    const input = screen.getByLabelText('Password');
    const showButton = screen.getByRole('button', { name: 'Show password' });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('placeholder', 'Enter your password');
    expect(showButton).toHaveAttribute('aria-controls', input.id);
    expect(showButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(showButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('disables the password visibility control with the input', () => {
    render(
      <TextInput
        aria-label={'Password'}
        disabled
        valueType={'password'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled();
  });

  it('exposes required, helper, and error states accessibly', () => {
    render(
      <TextInput
        errorMessage="Enter a whole number."
        helperText="Use the current estimate."
        label="Story points"
        required
        valueType="integer"
      />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Story points' });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription(
      'Use the current estimate. Enter a whole number.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number.');
  });

  it('supports an accessible input without a visible label', () => {
    render(<TextInput aria-label="Search features" />);

    expect(
      screen.getByRole('textbox', { name: 'Search features' }),
    ).toBeEnabled();
  });

  it('does not accept interaction when disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TextInput aria-label="Feature name" disabled onChange={onChange} />,
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Feature name' }),
      'Blocked',
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});
