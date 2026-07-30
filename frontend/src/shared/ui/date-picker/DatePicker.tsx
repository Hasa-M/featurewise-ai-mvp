import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { useOverflowTitle } from '@/shared/model';

import styles from './DatePicker.module.css';

export type DateRangeValue = {
  end: string;
  start: string;
};

type DatePickerBaseProps = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  /** ISO calendar date used for the first visible month when no value is selected. */
  defaultMonth?: string;
  disabled?: boolean;
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  id?: string;
  /** Return true to prevent selection. The callback receives a local Date and its YYYY-MM-DD value. */
  isDateDisabled?: (date: Date, isoDate: string) => boolean;
  /** Optional visible title. Provide aria-label or aria-labelledby when omitted. */
  label?: ReactNode;
  locale?: string;
  maxDate?: string;
  minDate?: string;
  placeholder?: string;
  required?: boolean;
  weekStartsOn?: 0 | 1;
};

export type SingleDatePickerProps = DatePickerBaseProps & {
  mode?: 'single';
  name?: string;
  onChange: (value: string) => void;
  value?: string;
};

export type RangeDatePickerProps = DatePickerBaseProps & {
  mode: 'range';
  name?: { end: string; start: string };
  onChange: (value: DateRangeValue) => void;
  value: DateRangeValue;
};

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_DAY_COUNT = 42;

function fromIsoDate(value?: string) {
  if (!value) return undefined;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : undefined;
}

function toIsoDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function getInitialMonth(props: DatePickerProps) {
  const selected = props.mode === 'range' ? props.value.start || props.value.end : props.value;
  const initial = fromIsoDate(selected) ?? fromIsoDate(props.defaultMonth) ?? new Date();
  return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
}

export function DatePicker(props: DatePickerProps) {
  const overflowTitle = useOverflowTitle<HTMLSpanElement>();
  const {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    className,
    disabled = false,
    errorMessage,
    helperText,
    id,
    isDateDisabled,
    label,
    locale,
    maxDate,
    minDate,
    placeholder = props.mode === 'range' ? 'Select a date range' : 'Select a date',
    required = false,
    weekStartsOn = 1,
  } = props;
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlId = id ?? generatedId;
  const labelId = label ? `${controlId}-label` : undefined;
  const dialogId = `${controlId}-dialog`;
  const monthHeadingId = `${controlId}-month`;
  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = errorMessage ? `${controlId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ');
  const triggerLabelledBy = [ariaLabelledBy, labelId].filter(Boolean).join(' ');
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth(props));
  const [calendarView, setCalendarView] = useState<'calendar' | 'month-picker'>('calendar');
  const [navigationYear, setNavigationYear] = useState(() => String(visibleMonth.getFullYear()));
  const min = fromIsoDate(minDate);
  const max = fromIsoDate(maxDate);
  const isRange = props.mode === 'range';
  const startValue = isRange ? props.value.start : props.value ?? '';
  const endValue = isRange ? props.value.end : '';
  const isChoosingEnd = isRange && Boolean(startValue) && !endValue;

  const displayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  );
  const dayNameFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale],
  );
  const fullDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }),
    [locale],
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale],
  );
  const monthNameFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short' }),
    [locale],
  );
  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, month) => monthNameFormatter.format(new Date(2026, month, 1, 12))),
    [monthNameFormatter],
  );

  const calendarStart = useMemo(() => {
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
    const offset = (monthStart.getDay() - weekStartsOn + 7) % 7;
    return addDays(monthStart, -offset);
  }, [visibleMonth, weekStartsOn]);
  const calendarDays = useMemo(
    () => Array.from({ length: CALENDAR_DAY_COUNT }, (_, index) => addDays(calendarStart, index)),
    [calendarStart],
  );
  const weekDays = useMemo(() => {
    const sunday = new Date(2026, 0, 4, 12);
    return Array.from({ length: 7 }, (_, index) =>
      dayNameFormatter.format(addDays(sunday, (weekStartsOn + index) % 7)),
    );
  }, [dayNameFormatter, weekStartsOn]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = startValue || endValue || toIsoDate(new Date());
    window.requestAnimationFrame(() => {
      const preferredButton = rootRef.current?.querySelector<HTMLButtonElement>(
        `[data-date="${preferred}"]:not(:disabled)`,
      );
      const firstEnabled = rootRef.current?.querySelector<HTMLButtonElement>(
        '[data-date]:not(:disabled)',
      );
      (preferredButton ?? firstEnabled)?.focus();
    });
  }, [endValue, isOpen, startValue, visibleMonth]);

  function isBaseDisabled(date: Date) {
    const isoDate = toIsoDate(date);
    if (min && date < min) return true;
    if (max && date > max) return true;
    return isDateDisabled?.(new Date(date), isoDate) ?? false;
  }

  function intervalContainsDisabled(start: Date, end: Date) {
    for (let cursor = addDays(start, 1); cursor <= end; cursor = addDays(cursor, 1)) {
      if (isBaseDisabled(cursor)) return true;
    }
    return false;
  }

  function dateIsDisabled(date: Date) {
    if (isBaseDisabled(date)) return true;
    if (!isChoosingEnd) return false;

    const start = fromIsoDate(startValue);
    if (!start) return false;
    return date < start || intervalContainsDisabled(start, date);
  }

  function openCalendar() {
    if (disabled) return;
    const initialMonth = getInitialMonth(props);
    setVisibleMonth(initialMonth);
    setNavigationYear(String(initialMonth.getFullYear()));
    setCalendarView('calendar');
    setIsOpen(true);
  }

  function monthIsAvailable(year: number, month: number) {
    const monthStart = new Date(year, month, 1, 12);
    const monthEnd = new Date(year, month + 1, 0, 12);
    return (!min || monthEnd >= min) && (!max || monthStart <= max);
  }

  function changeVisibleMonth(amount: number) {
    const nextMonth = addMonths(visibleMonth, amount);
    if (!monthIsAvailable(nextMonth.getFullYear(), nextMonth.getMonth())) return;
    setVisibleMonth(nextMonth);
    setNavigationYear(String(nextMonth.getFullYear()));
    setCalendarView('calendar');
  }

  function getValidNavigationYear() {
    const parsedYear = Number(navigationYear);
    const minimumYear = min?.getFullYear() ?? 100;
    const maximumYear = max?.getFullYear() ?? 9999;
    if (!Number.isInteger(parsedYear)) return visibleMonth.getFullYear();
    return Math.min(Math.max(parsedYear, minimumYear), maximumYear);
  }

  function commitNavigationYear() {
    setNavigationYear(String(getValidNavigationYear()));
  }

  function changeNavigationYear(amount: number) {
    const minimumYear = min?.getFullYear() ?? 100;
    const maximumYear = max?.getFullYear() ?? 9999;
    const nextYear = Math.min(
      Math.max(getValidNavigationYear() + amount, minimumYear),
      maximumYear,
    );
    setNavigationYear(String(nextYear));
  }

  function selectMonth(month: number) {
    const year = getValidNavigationYear();
    if (!monthIsAvailable(year, month)) return;
    setNavigationYear(String(year));
    setVisibleMonth(new Date(year, month, 1, 12));
    setCalendarView('calendar');
  }

  function showCurrentMonth() {
    const today = new Date();
    if (!monthIsAvailable(today.getFullYear(), today.getMonth())) return;
    setNavigationYear(String(today.getFullYear()));
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    setCalendarView('calendar');
  }

  function selectDate(date: Date) {
    if (dateIsDisabled(date)) return;
    const isoDate = toIsoDate(date);

    if (props.mode === 'range') {
      if (!props.value.start || props.value.end) {
        props.onChange({ end: '', start: isoDate });
        return;
      }
      props.onChange({ end: isoDate, start: props.value.start });
      setIsOpen(false);
      return;
    }

    props.onChange(isoDate);
    setIsOpen(false);
  }

  function clearValue() {
    if (props.mode === 'range') props.onChange({ end: '', start: '' });
    else props.onChange('');
  }

  function focusDate(date: Date) {
    if (!sameMonth(date, visibleMonth)) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
    window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(date)}"]`)
        ?.focus();
    });
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const movements: Partial<Record<string, number>> = {
      ArrowDown: 7,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
    };
    const movement = movements[event.key];
    if (movement !== undefined) {
      event.preventDefault();
      focusDate(addDays(date, movement));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const offset = (date.getDay() - weekStartsOn + 7) % 7;
      focusDate(addDays(date, event.key === 'Home' ? -offset : 6 - offset));
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      focusDate(addMonths(date, event.key === 'PageUp' ? -1 : 1));
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  const startDate = fromIsoDate(startValue);
  const endDate = fromIsoDate(endValue);
  const displayValue = isRange
    ? startDate
      ? endDate
        ? `${displayFormatter.format(startDate)} – ${displayFormatter.format(endDate)}`
        : `${displayFormatter.format(startDate)} – Select end date`
      : ''
    : startDate
      ? displayFormatter.format(startDate)
      : '';
  const hasValue = Boolean(startValue || endValue);
  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const today = new Date();
  const validNavigationYear = getValidNavigationYear();

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')} ref={rootRef}>
      {label ? (
        <div className={styles.labelRow}>
          <span className={styles.label} id={labelId}>{label}</span>
          {required ? <span className={styles.required}>Required</span> : null}
        </div>
      ) : null}

      <div className={styles.anchor}>
        <button
          aria-controls={dialogId}
          aria-describedby={describedBy || undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-invalid={errorMessage ? true : undefined}
          aria-label={label || ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={triggerLabelledBy || undefined}
          className={styles.control}
          data-error={errorMessage ? 'true' : undefined}
          data-open={isOpen ? 'true' : undefined}
          disabled={disabled}
          id={controlId}
          onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
          type="button"
        >
          <CalendarDays aria-hidden="true" className={styles.calendarIcon} size={17} strokeWidth={1.75} />
          <span
            {...overflowTitle}
            className={displayValue ? styles.selectedText : styles.placeholder}
          >
            {displayValue || placeholder}
          </span>
        </button>

        {isOpen ? (
          <div
            aria-labelledby={monthHeadingId}
            className={styles.popover}
            id={dialogId}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsOpen(false);
            }}
            role="dialog"
          >
            <div className={styles.monthNavigation}>
              <button
                aria-label="Previous month"
                className={styles.iconButton}
                disabled={monthIsAvailable(previousMonth.getFullYear(), previousMonth.getMonth()) ? undefined : true}
                onClick={() => changeVisibleMonth(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={17} strokeWidth={1.75} />
              </button>
              <button
                aria-expanded={calendarView === 'month-picker'}
                className={styles.monthHeading}
                id={monthHeadingId}
                onClick={() => {
                  setNavigationYear(String(visibleMonth.getFullYear()));
                  setCalendarView((current) =>
                    current === 'calendar' ? 'month-picker' : 'calendar',
                  );
                }}
                type="button"
              >
                {monthFormatter.format(visibleMonth)}
                <ChevronDown
                  aria-hidden="true"
                  className={styles.monthChevron}
                  data-open={calendarView === 'month-picker' ? 'true' : undefined}
                  size={15}
                  strokeWidth={1.75}
                />
              </button>
              <button
                aria-label="Next month"
                className={styles.iconButton}
                disabled={monthIsAvailable(nextMonth.getFullYear(), nextMonth.getMonth()) ? undefined : true}
                onClick={() => changeVisibleMonth(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={17} strokeWidth={1.75} />
              </button>
            </div>

            {calendarView === 'month-picker' ? (
              <div className={styles.monthPicker}>
                <div className={styles.yearNavigation}>
                  <button
                    aria-label="Previous year"
                    className={styles.iconButton}
                    disabled={validNavigationYear <= (min?.getFullYear() ?? 100)}
                    onClick={() => changeNavigationYear(-1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" size={17} strokeWidth={1.75} />
                  </button>
                  <label className={styles.yearField}>
                    <span>Year</span>
                    <input
                      aria-label="Year"
                      className={styles.yearInput}
                      inputMode="numeric"
                      maxLength={4}
                      onBlur={commitNavigationYear}
                      onChange={(event) => {
                        if (/^\d{0,4}$/.test(event.currentTarget.value)) {
                          setNavigationYear(event.currentTarget.value);
                        }
                      }}
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitNavigationYear();
                        }
                      }}
                      type="text"
                      value={navigationYear}
                    />
                  </label>
                  <button
                    aria-label="Next year"
                    className={styles.iconButton}
                    disabled={validNavigationYear >= (max?.getFullYear() ?? 9999)}
                    onClick={() => changeNavigationYear(1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={17} strokeWidth={1.75} />
                  </button>
                </div>
                <div
                  aria-label={'Months in ' + validNavigationYear}
                  className={styles.monthGrid}
                  role="group"
                >
                  {monthNames.map((monthName, month) => (
                    <button
                      aria-label={monthName + ' ' + validNavigationYear}
                      aria-pressed={
                        validNavigationYear === visibleMonth.getFullYear() &&
                        month === visibleMonth.getMonth()
                      }
                      className={styles.monthOption}
                      disabled={monthIsAvailable(validNavigationYear, month) ? undefined : true}
                      key={monthName}
                      onClick={() => selectMonth(month)}
                      type="button"
                    >
                      {monthName}
                    </button>
                  ))}
                </div>
                <button
                  className={styles.currentMonthButton}
                  disabled={monthIsAvailable(today.getFullYear(), today.getMonth()) ? undefined : true}
                  onClick={showCurrentMonth}
                  type="button"
                >
                  Current month
                </button>
              </div>
            ) : (
            <div aria-labelledby={monthHeadingId} className={styles.calendarGrid} role="grid">
              {weekDays.map((dayName, index) => (
                <div className={styles.weekDay} key={`${dayName}-${index}`} role="columnheader">
                  {dayName}
                </div>
              ))}
              {calendarDays.map((date) => {
                const isoDate = toIsoDate(date);
                const isStart = isoDate === startValue;
                const isEnd = isoDate === endValue;
                const inRange = Boolean(startDate && endDate && date > startDate && date < endDate);
                const isToday = isoDate === toIsoDate(new Date());
                return (
                  <div className={styles.dayCell} key={isoDate} role="gridcell">
                    <button
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={fullDateFormatter.format(date)}
                      aria-selected={isStart || isEnd || inRange}
                      className={styles.dayButton}
                      data-date={isoDate}
                      data-in-current-month={sameMonth(date, visibleMonth) ? 'true' : undefined}
                      data-in-range={inRange ? 'true' : undefined}
                      data-range-end={isEnd ? 'true' : undefined}
                      data-range-start={isStart ? 'true' : undefined}
                      disabled={dateIsDisabled(date)}
                      onClick={() => selectDate(date)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                      tabIndex={isStart || isEnd || isToday ? 0 : -1}
                      type="button"
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
            )}

            <div className={styles.footer}>
              <span className={styles.instruction}>
                {calendarView === 'month-picker'
                  ? 'Choose a month, then a date'
                  : isChoosingEnd
                    ? 'Select an end date'
                    : isRange
                      ? 'Select a start date'
                      : 'Select a date'}
              </span>
              {hasValue ? (
                <button className={styles.clearButton} onClick={clearValue} type="button">
                  <X aria-hidden="true" size={14} strokeWidth={1.75} />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {props.name && props.mode !== 'range' ? <input name={props.name} type="hidden" value={props.value ?? ''} /> : null}
      {props.name && props.mode === 'range' ? (
        <>
          <input name={props.name.start} type="hidden" value={props.value.start} />
          <input name={props.name.end} type="hidden" value={props.value.end} />
        </>
      ) : null}
      {helperText ? <div className={styles.helperText} id={helperId}>{helperText}</div> : null}
      {errorMessage ? <div className={styles.errorMessage} id={errorId} role="alert">{errorMessage}</div> : null}
    </div>
  );
}
