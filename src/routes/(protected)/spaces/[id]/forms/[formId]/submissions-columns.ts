import type { ColumnDef } from '@tanstack/table-core';
import { formatDistanceToNow } from 'date-fns';
import { renderComponent } from '$lib/components/ui/data-table';
import DataTableCheckbox from './data-table-checkbox.svelte';

export type Submission = {
	id: string;
	formId: string;
	name: string | null;
	email: string | null;
	message: string | null;
	data: string | null;
	files?: string | null;
	status: 'new' | 'read' | 'resolved';
	isSpam: boolean;
	isArchived: boolean;
	createdAt: Date;
	updatedAt: Date;
	// Metadata fields
	ipAddress?: string | null;
	userAgent?: string | null;
	referer?: string | null;
	device?: string | null;
	deviceType?: string | null;
	os?: string | null;
	browser?: string | null;
	isRobot?: boolean | null;
	spamScore?: number | null;
	spamReason?: string | null;
	webhookSent?: boolean | null;
	webhookSentAt?: Date | null;
	emailSent?: boolean | null;
	emailSentAt?: Date | null;
};

// Shared column definitions
const selectColumn: ColumnDef<Submission> = {
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

const nameColumn: ColumnDef<Submission> = {
	accessorKey: 'name',
	header: 'Name',
	cell: ({ row }) => {
		const name = row.getValue('name') as string | null;
		return name || '-';
	},
	size: 200,
	minSize: 150
};

const emailColumn: ColumnDef<Submission> = {
	accessorKey: 'email',
	header: 'Email',
	cell: ({ row }) => {
		const email = row.getValue('email') as string | null;
		return email || '-';
	},
	size: 250,
	minSize: 200
};

const submittedColumn: ColumnDef<Submission> = {
	accessorKey: 'createdAt',
	header: 'Submitted',
	cell: ({ row }) => {
		const date = row.getValue('createdAt') as Date;
		return formatDistanceToNow(new Date(date), { addSuffix: true });
	},
	size: 180,
	minSize: 150
};

const statusColumn: ColumnDef<Submission> = {
	id: 'status',
	accessorKey: 'status',
	header: 'Status',
	size: 120,
	minSize: 100
	// Cell will be rendered with snippet in the component
};

const spamReasonColumn: ColumnDef<Submission> = {
	id: 'spamReason',
	accessorKey: 'spamReason',
	header: 'Spam Reason',
	cell: ({ row }) => {
		const reason = row.original.spamReason;
		if (!reason) return '-';
		// Format the reason nicely
		return reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	},
	size: 150,
	minSize: 120
};

const actionsColumn: ColumnDef<Submission> = {
	id: 'actions',
	header: '',
	size: 60,
	minSize: 60,
	maxSize: 60,
	enableSorting: false,
	enableHiding: false
	// Cell will be rendered with snippet in the component
};

// Regular submissions columns
export const columns: ColumnDef<Submission>[] = [
	selectColumn,
	nameColumn,
	emailColumn,
	submittedColumn,
	statusColumn,
	actionsColumn
];

// Spam view columns - shows spam reason instead of status
export const spamColumns: ColumnDef<Submission>[] = [
	selectColumn,
	nameColumn,
	emailColumn,
	submittedColumn,
	spamReasonColumn,
	actionsColumn
];
