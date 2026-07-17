import {
  createContext,
  useContext,
  useId,
  useState,
} from 'react';
import type {
  ChangeEvent,
  FieldsetHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

import styles from './RadioGroup.module.css';

type RadioGroupContextValue = {
  disabled: boolean;
  name: string;
  selectValue: (value: string) => void;
  value: string | null;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupOrientation = 'horizontal' | 'vertical';

export type RadioGroupProps = Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'children' | 'onChange'
> & {
  children: ReactNode;
  clearable?: boolean;
  defaultValue?: string;
  description?: ReactNode;
  label: ReactNode;
  name?: string;
  onValueChange?: (value: string | null) => void;
  orientation?: RadioGroupOrientation;
  value?: string | null;
};

export function RadioGroup({
  'aria-describedby': ariaDescribedBy,
  children,
  className,
  clearable = false,
  defaultValue,
  description,
  disabled = false,
  label,
  name,
  onValueChange,
  orientation = 'vertical',
  value,
  ...props
}: RadioGroupProps) {
  const generatedId = useId();
  const generatedName = useId();
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId]
    .filter(Boolean)
    .join(' ');
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue ?? null,
  );
  const selectedValue = isControlled ? value : internalValue;

  const setValue = (nextValue: string | null) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  };

  const contextValue: RadioGroupContextValue = {
    disabled,
    name: name ?? generatedName,
    selectValue: setValue,
    value: selectedValue,
  };
  const classes = [styles.group, className].filter(Boolean).join(' ');

  return (
    <fieldset
      {...props}
      aria-describedby={describedBy || undefined}
      className={classes}
      disabled={disabled}
    >
      <legend className={styles.legend}>{label}</legend>
      {description ? (
        <div className={styles.groupDescription} id={descriptionId}>
          {description}
        </div>
      ) : null}
      <RadioGroupContext.Provider value={contextValue}>
        <div className={styles.options} data-orientation={orientation}>
          {children}
        </div>
        {clearable && selectedValue !== null ? (
          <button
            className={styles.clearButton}
            disabled={disabled}
            onClick={() => setValue(null)}
            type="button"
          >
            Clear selection
          </button>
        ) : null}
      </RadioGroupContext.Provider>
    </fieldset>
  );
}

type RadioInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'size' | 'type'
> & {
  label: ReactNode;
  value: string;
};

export type RadioProps = RadioInputProps;

export function Radio({
  'aria-describedby': ariaDescribedBy,
  checked,
  className,
  disabled,
  id,
  label,
  name,
  onChange,
  value,
  ...props
}: RadioProps) {
  const group = useContext(RadioGroupContext);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const isDisabled = disabled || group?.disabled;
  const isChecked = group ? group.value === value : checked;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (!event.defaultPrevented) {
      group?.selectValue(value);
    }
  };

  return (
    <label
      className={[styles.radio, className].filter(Boolean).join(' ')}
      data-disabled={isDisabled || undefined}
    >
      <input
        {...props}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={labelId}
        checked={isChecked}
        className={styles.input}
        disabled={isDisabled}
        id={inputId}
        name={group?.name ?? name}
        onChange={handleChange}
        type="radio"
        value={value}
      />
      <span className={styles.circle} aria-hidden="true">
        <span className={styles.dot} />
      </span>
      <span className={styles.radioLabel} id={labelId}>
        {label}
      </span>
    </label>
  );
}

export type RadioCardProps = RadioInputProps & {
  description?: ReactNode;
};

export function RadioCard({
  'aria-describedby': ariaDescribedBy,
  checked,
  className,
  description,
  disabled,
  id,
  label,
  name,
  onChange,
  value,
  ...props
}: RadioCardProps) {
  const group = useContext(RadioGroupContext);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId]
    .filter(Boolean)
    .join(' ');
  const isDisabled = disabled || group?.disabled;
  const isChecked = group ? group.value === value : checked;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (!event.defaultPrevented) {
      group?.selectValue(value);
    }
  };

  return (
    <label
      className={[styles.card, className].filter(Boolean).join(' ')}
      data-disabled={isDisabled || undefined}
      data-selected={isChecked || undefined}
    >
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        aria-labelledby={labelId}
        checked={isChecked}
        className={styles.input}
        disabled={isDisabled}
        id={inputId}
        name={group?.name ?? name}
        onChange={handleChange}
        type="radio"
        value={value}
      />
      <span className={styles.circle} aria-hidden="true">
        <span className={styles.dot} />
      </span>
      <span className={styles.cardContent}>
        <span className={styles.cardLabel} id={labelId}>
          {label}
        </span>
        {description ? (
          <span className={styles.cardDescription} id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
