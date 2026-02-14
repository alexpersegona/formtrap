import type { ColumnDef } from '@tanstack/table-core';
import { formatDistanceToNow } from 'date-fns';
import { renderComponent } from '$lib/components/ui/data-table';
import DataTableCheckbox from './data-table-checkbox.svelte';

export type Space = {
	id: string;
	name: string;
	logo: string | null;
	role: 'owner' | 'admin' | 'member';
	isPaused: boolean;
	isClientOwned: boolean;
	privacyIndicatorEnabled: boolean;
	formCount: number;
	memberCount: number;
	createdAt: Date;
};

// Shared column definitions
const selectColumn: ColumnDef<Space> = {
	id: 'select',
	header: ({ table }) =>
		renderComponent(DataTableCheckbox, {
			checked: table.getIsAllPageRowsSelected(),
			indeterminate:
				table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
			onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
			'aria-label': 'Select all'
		}),
	cell: ({ row }) =>
		renderComponent(DataTableCheckbox, {
			checked: row.getIsSelected(),
			onCheckedChange: (value) => row.toggleSelected(!!value),
			'aria-label': 'Select row'
		}),
	enableSorting: false,
	enableHiding: false,
	size: 40,
	minSize: 40,
	maxSize: 40
};

const nameColumn: ColumnDef<Space> = {
	accessorKey: 'name',
	header: 'Space',
	size: 250,
	minSize: 200,
	enableGlobalFilter: true
	// Cell will be rendered with snippet in the component for logo + name
};

const roleColumn: ColumnDef<Space> = {
	accessorKey: 'role',
	header: 'Role',
	size: 100,
	minSize: 80,
	filterFn: (row, columnId, filterValue) => {
		if (!filterValue) return true;
		return row.getValue(columnId) === filterValue;
	}
	// Cell will be rendered with snippet for badge
};

const formsColumn: ColumnDef<Space> = {
	accessorKey: 'formCount',
	header: 'Forms',
	cell: ({ row }) => {
		return row.getValue('formCount') as number;
	},
	size: 80,
	minSize: 60
};

const membersColumn: ColumnDef<Space> = {
	accessorKey: 'memberCount',
	header: 'Members',
	cell: ({ row }) => {
		return row.getValue('memberCount') as number;
	},
	size: 100,
	minSize: 80
};

const statusColumn: ColumnDef<Space> = {
	id: 'status',
	accessorKey: 'isPaused',
	header: 'Status',
	size: 100,
	minSize: 80,
	filterFn: (row, columnId, filterValue) => {
		if (filterValue === undefined || filterValue === null) return true;
		return row.getValue(columnId) === filterValue;
	}
	// Cell will be rendered with snippet for badge
};

const createdColumn: ColumnDef<Space> = {
	accessorKey: 'createdAt',
	header: 'Created',
	cell: ({ row }) => {
		const date = row.getValue('createdAt') as Date;
		return formatDistanceToNow(new Date(date), { addSuffix: true });
	},
	size: 140,
	minSize: 120
};

const actionsColumn: ColumnDef<Space> = {
	id: 'actions',
	header: '',
	size: 60,
	minSize: 60,
	maxSize: 60,
	enableSorting: false,
	enableHiding: false
	// Cell will be rendered with snippet in the component
};

export const columns: ColumnDef<Space>[] = [
	selectColumn,
	nameColumn,
	roleColumn,
	formsColumn,
	membersColumn,
	statusColumn,
	createdColumn,
	actionsColumn
];
