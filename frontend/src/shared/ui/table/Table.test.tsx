import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Table, TableCellContent, type TableColumn } from './Table';

type TestRow = { id: string; name: string };

const rows: readonly TestRow[] = [{ id: 'checkout', name: 'Checkout recovery' }];

const columns = [
  {
    cell: (row) => (
      <TableCellContent
        leadingIcon={<FileText aria-label='File icon' />}
        supportingText='Payment workflow'
      >
        {row.name}
      </TableCellContent>
    ),
    header: 'Feature',
    headerIcon: <FileText aria-label='Feature icon' />,
    id: 'name',
    isRowHeader: true,
    sortable: true,
    sortLabel: 'Feature',
  },
  {
    cell: () => <a href='#checkout'>Review</a>,
    header: 'Action',
    id: 'action',
  },
] satisfies readonly TableColumn<TestRow>[];

describe('Table', () => {
  it('renders native semantics and a row action', () => {
    render(
      <Table
        caption='Feature readiness'
        columns={columns}
        getRowKey={(row) => row.id}
        rows={rows}
      />,
    );

    expect(screen.getByRole('table', { name: 'Feature readiness' })).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', {
        name: /Checkout recovery\s*Payment workflow/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '#checkout');
  });

  it('reports controlled sort changes', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Table
        caption='Feature readiness'
        columns={columns}
        getRowKey={(row) => row.id}
        onSortChange={onSortChange}
        rows={rows}
        sort={{ columnId: 'name', direction: 'ascending' }}
      />,
    );

    const sortButton = screen.getByRole('button', { name: 'Feature: sort descending' });
    expect(sortButton.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await user.click(sortButton);
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'descending' });
  });

  it('keeps decorative header and cell icons out of accessible names', () => {
    render(
      <Table
        caption='Feature readiness'
        columns={columns}
        getRowKey={(row) => row.id}
        onSortChange={() => undefined}
        rows={rows}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Feature: sort ascending' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', {
        name: /Checkout recovery\s*Payment workflow/,
      }),
    ).not.toHaveAccessibleName(/File icon/);
  });

  it('renders accessible loading and empty states', () => {
    const view = render(
      <Table
        caption='Feature readiness'
        columns={columns}
        getRowKey={(row) => row.id}
        loading
        loadingContent='Loading features...'
        rows={rows}
      />,
    );

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading features...');
    expect(
      screen.queryByRole('rowheader', { name: /Checkout recovery/ }),
    ).not.toBeInTheDocument();

    view.rerender(
      <Table
        caption='Feature readiness'
        columns={columns}
        emptyContent='No features yet.'
        getRowKey={(row) => row.id}
        rows={[]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No features yet.');
  });
});
