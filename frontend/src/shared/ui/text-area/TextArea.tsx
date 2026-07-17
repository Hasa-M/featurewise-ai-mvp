import { useId, useState } from 'react';
import type {
  ChangeEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

import styles from './TextArea.module.css';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  /** Visible label. When omitted, provide aria-label or aria-labelledby. */
  label?: ReactNode;
  showCharacterCount?: boolean;
};

function getValueLength(value: TextAreaProps['value']) {
  if (value === undefined || value === null) {
    return 0;
  }

  return String(value).length;
}

export function TextArea({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  defaultValue,
  disabled,
  errorMessage,
  helperText,
  id,
  label,
  maxLength,
  onChange,
  placeholder = 'Enter text',
  required,
  rows = 4,
  showCharacterCount = false,
  value,
  ...props
}: TextAreaProps) {
  const generatedId = useId();
  const [uncontrolledLength, setUncontrolledLength] = useState(() =>
    getValueLength(defaultValue),
  );
  const textAreaId = id ?? generatedId;
  const helperId = helperText ? `${textAreaId}-helper` : undefined;
  const errorId = errorMessage ? `${textAreaId}-error` : undefined;
  const describedBy = [ariaDescribedBy, helperId, errorId]
    .filter(Boolean)
    .join(' ');
  const characterCount =
    value === undefined ? uncontrolledLength : getValueLength(value);
  const classes = [styles.textArea, className].filter(Boolean).join(' ');

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (value === undefined) {
      setUncontrolledLength(event.currentTarget.value.length);
    }

    onChange?.(event);
  }

  return (
    <div className={styles.field}>
      {label ? (
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={textAreaId}>
            {label}
          </label>
          {required ? <span className={styles.required}>Required</span> : null}
        </div>
      ) : null}

      <textarea
        {...props}
        aria-describedby={describedBy || undefined}
        aria-invalid={errorMessage ? true : ariaInvalid}
        className={classes}
        defaultValue={defaultValue}
        disabled={disabled}
        id={textAreaId}
        maxLength={maxLength}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        value={value}
      />

      {helperText || showCharacterCount ? (
        <div className={styles.supportRow}>
          {helperText ? (
            <div className={styles.helperText} id={helperId}>
              {helperText}
            </div>
          ) : (
            <span />
          )}
          {showCharacterCount ? (
            <output className={styles.characterCount} htmlFor={textAreaId}>
              {characterCount}
              {maxLength === undefined ? null : `/${maxLength}`}
              <span className={styles.srOnly}> characters</span>
            </output>
          ) : null}
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
