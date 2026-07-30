import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  LoaderCircle,
} from 'lucide-react';
import type {
  CSSProperties,
  HTMLAttributes,
  Key,
  ReactNode,
  TableHTMLAttributes,
} from 'react';

import { useOverflowTitle } from '@/shared/model';

import styles from './Table.module.css';

export type TableColumnAlignment = 'start' | 'center' | 'end';
export type TableSortDirection = 'ascending' | 'descending';

export type TableSort = {
  columnId: string;
  direction: TableSortDirection;
};

type TableColumnBase<Row> = {
  align?: TableColumnAlignment;
  cell: (row: Row, rowIndex: number) => ReactNode;
  header: ReactNode;
  /** Decorative icon rendered before the column label. */
  headerIcon?: ReactNode;
  id: string;
  isRowHeader?: boolean;
  minWidth?: CSSProperties['minWidth'];
  technical?: boolean;
  width?: CSSProperties['width'];
};

type SortableTableColumn<Row> = TableColumnBase<Row> & {
  sortable: true;
  /** Accessible column name used by the sorting control. */
  sortLabel: string;
};

type StaticTableColumn<Row> = TableColumnBase<Row> & {
  sortable?: false;
  sortLabel?: never;
};

export type TableColumn<Row> =
  | SortableTableColumn<Row>
  | StaticTableColumn<Row>;

export type TableProps<Row> = Omit<
  TableHTMLAttributes<HTMLTableElement>,
  'children'
> & {
  caption: ReactNode;
  captionVisibility?: 'visible' | 'hidden';
  columns: readonly TableColumn<Row>[];
  emptyContent?: ReactNode;
  getRowKey: (row: Row, rowIndex: number) => Key;
  loading?: boolean;
  loadingContent?: ReactNode;
  /**
   * Reports the next requested sort. The consumer owns ordering the rows so the
   * same table supports local, server-backed, and paginated data.
   */
  onSortChange?: (sort: TableSort) => void;
  rows: readonly Row[];
  sort?: TableSort;
};

export type TableCellContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children: ReactNode;
  leadingIcon?: ReactNode;
  supportingText?: ReactNode;
  trailingContent?: ReactNode;
};

export function TableCellContent({
  children,
  className,
  leadingIcon,
  supportingText,
  trailingContent,
  ...props
}: TableCellContentProps) {
  const primaryOverflowTitle = useOverflowTitle<HTMLSpanElement>();
  const supportingOverflowTitle = useOverflowTitle<HTMLSpanElement>();

  return (
    <div
      {...props}
      className={[styles.cellContent, className].filter(Boolean).join(' ')}
    >
      {leadingIcon ? (
        <span aria-hidden='true' className={styles.cellIcon}>
          {leadingIcon}
        </span>
      ) : null}
      <span className={styles.cellCopy}>
        <span {...primaryOverflowTitle} className={styles.cellPrimary}>
          {children}
        </span>
        {supportingText ? (
          <span {...supportingOverflowTitle} className={styles.supportingText}>
            {supportingText}
          </span>
        ) : null}
      </span>
      {trailingContent ? (
        <span className={styles.trailingContent}>{trailingContent}</span>
      ) : null}
    </div>
  );
}

function getColumnStyle<Row>(column: TableColumn<Row>): CSSProperties {
  return {
    ...(column.width !== undefined ? { width: column.width } : {}),
    ...(column.minWidth !== undefined ? { minWidth: column.minWidth } : {}),
  };
}

function getNextDirection(
  columnId: string,
  sort: TableSort | undefined,
): TableSortDirection {
  return sort?.columnId === columnId && sort.direction === 'ascending'
    ? 'descending'
    : 'ascending';
}

function SortIndicator({
  direction,
}: {
  direction: TableSortDirection | undefined;
}) {
  if (direction === 'ascending') {
    return <ArrowUp aria-hidden='true' size={14} strokeWidth={1.75} />;
  }

  if (direction === 'descending') {
    return <ArrowDown aria-hidden='true' size={14} strokeWidth={1.75} />;
  }

  return <ArrowUpDown aria-hidden='true' size={14} strokeWidth={1.75} />;
}

export function Table<Row>({
  caption,
  captionVisibility = 'visible',
  className,
  columns,
  emptyContent = 'No items yet.',
  getRowKey,
  loading = false,
  loadingContent = 'Loading items...',
  onSortChange,
  rows,
  sort,
  ...props
}: TableProps<Row>) {
  const stateColumnSpan = Math.max(columns.length, 1);

  return (
    <div className={styles.tableFrame}>
      <table
        {...props}
        aria-busy={loading ? true : props['aria-busy']}
        className={[styles.table, className].filter(Boolean).join(' ')}
      >
        <caption
          className={
            captionVisibility === 'hidden'
              ? styles.hiddenCaption
              : styles.caption
          }
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const direction =
                sort?.columnId === column.id ? sort.direction : undefined;
              const nextDirection = getNextDirection(column.id, sort);
              const columnStyle = getColumnStyle(column);

              return (
                <th
                  aria-sort={direction}
                  className={styles.headerCell}
                  data-align={column.align ?? 'start'}
                  key={column.id}
                  scope='col'
                  style={columnStyle}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      aria-label={`${column.sortLabel}: sort ${nextDirection}`}
                      className={styles.sortButton}
                      onClick={() =>
                        onSortChange({
                          columnId: column.id,
                          direction: nextDirection,
                        })
                      }
                      type='button'
                    >
                      <span className={styles.headerContent}>
                        {column.headerIcon ? (
                          <span
                            aria-hidden='true'
                            className={styles.headerIcon}
                          >
                            {column.headerIcon}
                          </span>
                        ) : null}
                        <span>{column.header}</span>
                      </span>
                      <span className={styles.sortIndicator}>
                        <SortIndicator direction={direction} />
                      </span>
                    </button>
                  ) : (
                    <span className={styles.headerContent}>
                      {column.headerIcon ? (
                        <span
                          aria-hidden='true'
                          className={styles.headerIcon}
                        >
                          {column.headerIcon}
                        </span>
                      ) : null}
                      <span>{column.header}</span>
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading || rows.length === 0 ? (
            <tr>
              <td className={styles.stateCell} colSpan={stateColumnSpan}>
                <div className={styles.stateContent} role='status'>
                  {loading ? (
                    <LoaderCircle
                      aria-hidden='true'
                      className={styles.spinner}
                      size={16}
                      strokeWidth={1.75}
                    />
                  ) : null}
                  <span>{loading ? loadingContent : emptyContent}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr className={styles.bodyRow} key={getRowKey(row, rowIndex)}>
                {columns.map((column) => {
                  const cellContent = column.cell(row, rowIndex);
                  const sharedCellProps = {
                    className: styles.bodyCell,
                    'data-align': column.align ?? 'start',
                    'data-technical': column.technical ? 'true' : undefined,
                    style: getColumnStyle(column),
                  } as const;

                  return column.isRowHeader ? (
                    <th
                      {...sharedCellProps}
                      className={`${styles.bodyCell} ${styles.rowHeader}`}
                      key={column.id}
                      scope='row'
                    >
                      {cellContent}
                    </th>
                  ) : (
                    <td {...sharedCellProps} key={column.id}>
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
