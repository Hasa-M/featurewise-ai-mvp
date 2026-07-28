import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CircleGauge,
  Clock3,
  FileText,
  FolderArchive,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '../button';
import { Tag } from '../tag';
import {
  Table,
  TableCellContent,
  type TableColumn,
  type TableProps,
  type TableSort,
} from './Table';

type FeatureRow = {
  artifacts: number;
  id: string;
  name: string;
  origin: 'brand_new' | 'mapped_existing';
  readiness: 'Ready' | 'Needs attention' | 'Draft';
  summary: string;
  updatedAt: string;
  updatedLabel: string;
};

const featureRows: readonly FeatureRow[] = [
  {
    artifacts: 5,
    id: 'feature_checkout',
    name: 'Checkout recovery',
    origin: 'brand_new',
    readiness: 'Ready',
    summary: 'Recover interrupted payment sessions.',
    updatedAt: '2026-07-28T08:14:00Z',
    updatedLabel: '28 Jul 2026, 10:14',
  },
  {
    artifacts: 2,
    id: 'feature_import',
    name: 'Repository context import',
    origin: 'mapped_existing',
    readiness: 'Needs attention',
    summary: 'Map uploaded source archives into context.',
    updatedAt: '2026-07-26T15:42:00Z',
    updatedLabel: '26 Jul 2026, 17:42',
  },
  {
    artifacts: 0,
    id: 'feature_export',
    name: 'Markdown export',
    origin: 'brand_new',
    readiness: 'Draft',
    summary: 'Export the current valid spec.',
    updatedAt: '2026-07-24T12:05:00Z',
    updatedLabel: '24 Jul 2026, 14:05',
  },
];

const featureColumns = [
  {
    cell: (row) => (
      <TableCellContent
        leadingIcon={<FileText />}
        supportingText={row.summary}
      >
        {row.name}
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
    cell: (row) => row.origin,
    header: 'Origin',
    id: 'origin',
    minWidth: '10rem',
    sortable: true,
    sortLabel: 'Origin',
    technical: true,
  },
  {
    align: 'center',
    cell: (row) => row.readiness,
    header: 'Readiness',
    headerIcon: <CircleGauge />,
    id: 'readiness',
    minWidth: '9rem',
  },
  {
    align: 'center',
    cell: (row) => <Tag>{`${row.artifacts} artifacts`}</Tag>,
    header: 'Context',
    headerIcon: <FolderArchive />,
    id: 'artifacts',
    minWidth: '8rem',
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
      <a aria-label={`Review ${row.name}`} href={`#${row.id}`}>
        Review
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
    caption: 'Feature readiness',
    columns: featureColumns,
    emptyContent: 'No features yet.',
    getRowKey: (row) => row.id,
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

    if (sort.columnId === 'origin') {
      return left.origin.localeCompare(right.origin) * direction;
    }

    return left.name.localeCompare(right.name) * direction;
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
        aria-label={`Open actions for ${row.name}`}
        isIcon
        size='small'
        title={`Open actions for ${row.name}`}
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
