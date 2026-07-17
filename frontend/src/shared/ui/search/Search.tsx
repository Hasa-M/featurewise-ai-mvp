import { Search as SearchIcon, X } from 'lucide-react';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import styles from './Search.module.css';

export type SearchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Shows a clear control when the input has a value. */
  onClear?: () => void;
};

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    'aria-label': ariaLabel = 'Search',
    className,
    disabled,
    onClear,
    placeholder = 'Search',
    value,
    ...props
  },
  ref,
) {
  const hasValue = String(value ?? '').length > 0;
  const classes = [styles.input, onClear && styles.withClear, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.control}>
      <SearchIcon
        aria-hidden="true"
        className={styles.searchIcon}
        size={16}
        strokeWidth={1.75}
      />
      <input
        {...props}
        aria-label={ariaLabel}
        className={classes}
        disabled={disabled}
        placeholder={placeholder}
        ref={ref}
        type="search"
        value={value}
      />
      {onClear && hasValue ? (
        <button
          aria-label="Clear search"
          className={styles.clear}
          disabled={disabled}
          onClick={onClear}
          title="Clear search"
          type="button"
        >
          <X aria-hidden="true" size={14} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
});
