import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import type {
  ChangeEvent,
  ClipboardEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react';

import styles from './TextInput.module.css';

export type TextInputValueType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'percentage'
  | 'password';

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  /** Visible label. When omitted, provide aria-label or aria-labelledby. */
  label?: ReactNode;
  /** Maximum fractional digits for decimal and percentage values. */
  maxFractionDigits?: number;
  valueType?: TextInputValueType;
};

const placeholderByValueType: Record<TextInputValueType, string> = {
  text: 'Enter text',
  integer: 'Enter an integer',
  decimal: 'Enter a decimal value',
  percentage: 'Enter a percentage',
  password: 'Enter your password',
};

const navigationKeys = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function normalizeFractionDigits(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 4;
}

function isValidNumericText(
  value: string,
  allowNegative: boolean,
  fractionDigits: number,
) {
  const sign = allowNegative ? '-?' : '';
  const fraction =
    fractionDigits > 0 ? `(?:[.][0-9]{0,${fractionDigits}})?` : '';

  return new RegExp(`^${sign}[0-9]*${fraction}$`).test(value);
}

function limitNumericFraction(value: string, fractionDigits: number) {
  if (fractionDigits === 0) {
    return value.split('.')[0] ?? '';
  }

  const [whole, fraction] = value.split('.');
  if (fraction === undefined) {
    return value;
  }

  return `${whole}.${fraction.slice(0, fractionDigits)}`;
}

export function TextInput({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  disabled,
  errorMessage,
  helperText,
  id,
  inputMode,
  label,
  max,
  maxFractionDigits = 4,
  min,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  required,
  step,
  valueType = 'text',
  ...props
}: TextInputProps) {
  const generatedId = useId();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, helperId, errorId]
    .filter(Boolean)
    .join(' ');
  const isPassword = valueType === 'password';
  const isNumeric =
    valueType === 'integer' ||
    valueType === 'decimal' ||
    valueType === 'percentage';
  const isPercentage = valueType === 'percentage';
  const fractionDigits =
    valueType === 'integer' ? 0 : normalizeFractionDigits(maxFractionDigits);
  const numericMin = isPercentage ? (min ?? 0) : min;
  const allowNegative =
    numericMin === undefined || Number(numericMin) < 0;
  const classes = [
    styles.input,
    isPercentage && styles.withSuffix,
    isPassword && styles.withAction,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const defaultInputMode =
    valueType === 'integer' ? 'numeric' : isNumeric ? 'decimal' : 'text';
  const defaultStep = valueType === 'integer' ? 1 : isNumeric ? 'any' : undefined;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);

    if (
      event.defaultPrevented ||
      !isNumeric ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      navigationKeys.has(event.key)
    ) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      return;
    }

    if (
      event.key === '.' &&
      fractionDigits > 0 &&
      !event.currentTarget.value.includes('.')
    ) {
      return;
    }

    if (
      event.key === '-' &&
      allowNegative &&
      event.currentTarget.value.length === 0
    ) {
      return;
    }

    event.preventDefault();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (isNumeric) {
      event.currentTarget.value = limitNumericFraction(
        event.currentTarget.value,
        fractionDigits,
      );
    }

    onChange?.(event);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);

    if (
      event.defaultPrevented ||
      !isNumeric ||
      isValidNumericText(
        event.clipboardData.getData('text'),
        allowNegative,
        fractionDigits,
      )
    ) {
      return;
    }

    event.preventDefault();
  }

  return (
    <div className={styles.field}>
      {label ? (
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
          {required ? <span className={styles.required}>Required</span> : null}
        </div>
      ) : null}

      <div className={styles.control} data-error={errorMessage ? 'true' : undefined}>
        <input
          {...props}
          aria-describedby={describedBy || undefined}
          aria-invalid={errorMessage ? true : ariaInvalid}
          className={classes}
          disabled={disabled}
          id={inputId}
          inputMode={inputMode ?? defaultInputMode}
          max={isPercentage ? (max ?? 100) : max}
          min={numericMin}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder ?? placeholderByValueType[valueType]}
          required={required}
          step={step ?? defaultStep}
          type={
            isPassword
              ? passwordVisible
                ? 'text'
                : 'password'
              : isNumeric
                ? 'number'
                : 'text'
          }
        />
        {isPercentage ? (
          <span className={styles.suffix} aria-hidden="true">
            %
          </span>
        ) : null}
        {isPassword ? (
          <button
            aria-controls={inputId}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            className={styles.passwordToggle}
            disabled={disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
            title={passwordVisible ? 'Hide password' : 'Show password'}
            type={'button'}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden={true} size={17} strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden={true} size={17} strokeWidth={1.75} />
            )}
          </button>
        ) : null}
      </div>

      {helperText ? (
        <div className={styles.helperText} id={helperId}>
          {helperText}
        </div>
      ) : null}
      {errorMessage ? (
        <div className={styles.errorMessage} id={errorId} role="alert">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
