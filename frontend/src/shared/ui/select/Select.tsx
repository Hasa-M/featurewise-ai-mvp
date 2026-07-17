import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { Search } from '../search';
import { Tag } from '../tag';
import styles from './Select.module.css';

export type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SelectBaseProps = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  id?: string;
  /** Optional visible title. Provide aria-label or aria-labelledby when omitted. */
  label?: ReactNode;
  name?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  searchPlaceholder?: string;
};

export type SingleSelectProps = SelectBaseProps & {
  mode?: 'single';
  onChange: (value: string) => void;
  value?: string;
};

export type MultipleSelectProps = SelectBaseProps & {
  mode: 'multiple';
  onChange: (value: string[]) => void;
  value: string[];
};

export type SelectProps = SingleSelectProps | MultipleSelectProps;

const SEARCH_THRESHOLD = 12;

export function Select(props: SelectProps) {
  const {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    className,
    disabled = false,
    emptyMessage = 'No options found',
    errorMessage,
    helperText,
    id,
    label,
    name,
    options,
    placeholder = 'Select an option',
    required = false,
    searchPlaceholder = 'Search options',
  } = props;
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlId = id ?? generatedId;
  const labelId = label ? `${controlId}-label` : undefined;
  const listboxId = `${controlId}-listbox`;
  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = errorMessage ? `${controlId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ');
  const isMultiple = props.mode === 'multiple';
  const selectedValues = useMemo(
    () => (isMultiple ? props.value : props.value ? [props.value] : []),
    [isMultiple, props.value],
  );
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const isSearchable = options.length > SEARCH_THRESHOLD;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedQuery
        ? options.filter((option) =>
            option.label.toLocaleLowerCase().includes(normalizedQuery),
          )
        : options,
    [normalizedQuery, options],
  );
  const selectedOptions = selectedValues
    .map((value) => options.find((option) => option.value === value))
    .filter((option): option is SelectOption => Boolean(option));
  const selectedOption = !isMultiple ? selectedOptions[0] : undefined;
  const triggerLabelledBy = [ariaLabelledBy, labelId].filter(Boolean).join(' ');

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function closeMenu() {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function openMenu() {
    if (disabled) return;
    const selectedIndex = filteredOptions.findIndex(
      (option) => selectedSet.has(option.value) && !option.disabled,
    );
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) return;

    if (props.mode === 'multiple') {
      const nextValue = selectedSet.has(option.value)
        ? props.value.filter((value) => value !== option.value)
        : [...props.value, option.value];
      props.onChange(nextValue);
      return;
    }

    props.onChange(option.value);
    closeMenu();
  }

  function removeValue(valueToRemove: string) {
    if (props.mode === 'multiple') {
      props.onChange(props.value.filter((value) => value !== valueToRemove));
    }
  }

  function moveActive(direction: 1 | -1) {
    if (filteredOptions.length === 0) return;

    let nextIndex = activeIndex;
    for (let count = 0; count < filteredOptions.length; count += 1) {
      nextIndex =
        (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  }

  function handleControlKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openMenu();
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) openMenu();
      else if (activeIndex >= 0) {
        const activeOption = filteredOptions[activeIndex];
        if (activeOption) selectOption(activeOption);
      }
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeMenu();
    }
  }

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')} ref={rootRef}>
      {label ? (
        <div className={styles.labelRow}>
          <span className={styles.label} id={labelId}>
            {label}
          </span>
          {required ? <span className={styles.required}>Required</span> : null}
        </div>
      ) : null}

      <div className={styles.anchor}>
        <div
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${controlId}-option-${activeIndex}`
              : undefined
          }
          aria-controls={listboxId}
          aria-describedby={describedBy || undefined}
          aria-disabled={disabled || undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={errorMessage ? true : undefined}
          aria-label={label || ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={triggerLabelledBy || undefined}
          aria-required={required || undefined}
          className={styles.control}
          data-error={errorMessage ? 'true' : undefined}
          data-open={isOpen ? 'true' : undefined}
          id={controlId}
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          onKeyDown={handleControlKeyDown}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
        >
          <div className={styles.value}>
            {isMultiple && selectedOptions.length > 0 ? (
              <div className={styles.tags}>
                {selectedOptions.map((option) => (
                  <Tag
                    disabled={disabled}
                    key={option.value}
                    onRemove={() => removeValue(option.value)}
                    removeLabel={`Remove ${option.label}`}
                  >
                    {option.label}
                  </Tag>
                ))}
              </div>
            ) : selectedOption ? (
              <span className={styles.selectedText}>{selectedOption.label}</span>
            ) : (
              <span className={styles.placeholder}>{placeholder}</span>
            )}
          </div>
          <ChevronDown
            aria-hidden="true"
            className={styles.chevron}
            size={17}
            strokeWidth={1.75}
          />
        </div>

        {isOpen ? (
          <div className={styles.menu}>
            {isSearchable ? (
              <div className={styles.searchArea} onKeyDown={(event) => {
                if (event.key === 'Escape') closeMenu();
              }}>
                <Search
                  aria-label={`Search ${label ?? 'options'}`}
                  autoFocus
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                    setActiveIndex(-1);
                  }}
                  onClear={() => {
                    setQuery('');
                    setActiveIndex(-1);
                  }}
                  placeholder={searchPlaceholder}
                  value={query}
                />
              </div>
            ) : null}
            <div aria-multiselectable={isMultiple || undefined} className={styles.options} id={listboxId} role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedSet.has(option.value);
                  return (
                    <button
                      aria-disabled={option.disabled || undefined}
                      aria-selected={isSelected}
                      className={styles.option}
                      data-active={index === activeIndex ? 'true' : undefined}
                      disabled={option.disabled}
                      id={`${controlId}-option-${index}`}
                      key={option.value}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectOption(option);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      role="option"
                      type="button"
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <Check aria-hidden="true" size={16} strokeWidth={1.75} />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className={styles.empty} role="status">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {name
        ? selectedValues.map((value) => (
            <input key={value || 'empty'} name={name} type="hidden" value={value} />
          ))
        : null}
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
