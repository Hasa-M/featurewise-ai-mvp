import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Clock3,
  FileText,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '../button';
import {
  Table,
  TableCellContent,
  type TableColumn,
  type TableProps,
  type TableSort,
} from './Table';

type FeatureRow = {
  publicKey: string;
  specification: string;
  title: string;
  updatedAt: string;
  updatedLabel: string;
};

const featureRows: readonly FeatureRow[] = [
  {
    publicKey: 'FEAT-5831',
    specification: 'Recover interrupted payment sessions.',
    title: 'Checkout recovery',
    updatedAt: '2026-07-28T08:14:00Z',
    updatedLabel: '28 Jul 2026, 10:14',
  },
  {
    publicKey: 'FEAT-5832',
    specification: 'Attach source archives as supporting context.',
    title: 'Repository context import',
    updatedAt: '2026-07-26T15:42:00Z',
    updatedLabel: '26 Jul 2026, 17:42',
  },
  {
    publicKey: 'FEAT-5833',
    specification: 'Export the current feature specification.',
    title: 'Markdown export',
    updatedAt: '2026-07-24T12:05:00Z',
    updatedLabel: '24 Jul 2026, 14:05',
  },
];

const featureColumns = [
  {
    cell: (row) => (
      <TableCellContent
        leadingIcon={<FileText />}
        supportingText={row.specification}
      >
        {row.title}
      </TableCellContent>
    ),
    header: 'Feature',
    headerIcon: <FileText />,
    id: 'name',
    isRowHeader: true,
    minWidth: '17rem',
    sortable: true,
    sortLabel: 'Feature',
  },
  {
    cell: (row) => row.publicKey,
    header: 'Public key',
    id: 'publicKey',
    minWidth: '10rem',
    sortable: true,
    sortLabel: 'Public key',
    technical: true,
  },
  {
    cell: (row) => (
      <time dateTime={row.updatedAt}>{row.updatedLabel}</time>
    ),
    header: 'Updated',
    headerIcon: <Clock3 />,
    id: 'updated',
    minWidth: '10rem',
    sortable: true,
    sortLabel: 'Updated',
  },
  {
    align: 'end',
    cell: (row) => (
      <a aria-label={`Open ${row.title}`} href={`#${row.publicKey}`}>
        Open
      </a>
    ),
    header: 'Action',
    id: 'action',
    width: '6rem',
  },
] satisfies readonly TableColumn<FeatureRow>[];

const FeatureTable = Table<FeatureRow>;

const meta = {
  title: 'Shared/Table',
  component: FeatureTable,
  args: {
    caption: 'Features',
    columns: featureColumns,
    emptyContent: 'No features yet.',
    getRowKey: (row) => row.publicKey,
    onSortChange: fn(),
    rows: featureRows,
  },
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FeatureTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenCaption: Story = {
  args: {
    captionVisibility: 'hidden',
  },
};

function SortableTableStory(args: TableProps<FeatureRow>) {
  const [sort, setSort] = useState<TableSort>({
    columnId: 'name',
    direction: 'ascending',
  });
  const sortedRows = [...args.rows].sort((left, right) => {
    const direction = sort.direction === 'ascending' ? 1 : -1;

    if (sort.columnId === 'updated') {
      return left.updatedAt.localeCompare(right.updatedAt) * direction;
    }

    if (sort.columnId === 'publicKey') {
      return left.publicKey.localeCompare(right.publicKey) * direction;
    }

    return left.title.localeCompare(right.title) * direction;
  });

  return (
    <Table
      {...args}
      onSortChange={setSort}
      rows={sortedRows}
      sort={sort}
    />
  );
}

export const Sortable: Story = {
  render: (args) => <SortableTableStory {...args} />,
};

const buttonActionColumns = [
  ...featureColumns.slice(0, -1),
  {
    align: 'end',
    cell: (row: FeatureRow) => (
      <Button
        aria-label={`Open actions for ${row.title}`}
        isIcon
        size='small'
        title={`Open actions for ${row.title}`}
        variant='ghost'
      >
        <MoreHorizontal aria-hidden='true' size={16} strokeWidth={1.75} />
      </Button>
    ),
    header: 'Actions',
    id: 'actions',
    width: '5rem',
  },
] satisfies readonly TableColumn<FeatureRow>[];

export const ButtonActions: Story = {
  args: {
    columns: buttonActionColumns,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    loadingContent: 'Loading features...',
    rows: [],
  },
};

export const Empty: Story = {
  args: {
    rows: [],
  },
};
