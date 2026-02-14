import type { Snippet } from 'svelte';

export interface Column {
	id: string;
	label: string;
	sortable?: boolean;
	hideable?: boolean;
	align?: 'left' | 'center' | 'right';
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface DataTableProps<TData> {
	data: TData[];
	columns: Column[];
	visibleColumns: string[];
	defaultColumns: string[];
	pagination: Pagination;
	sortBy: string;
	sortOrder: 'asc' | 'desc';
	search?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	emptyIcon?: Snippet;
	storageKey?: string;
	itemName?: string;
	row: Snippet<[TData, string[]]>;
	headerActions?: Snippet;
	onColumnVisibilityChange?: (columns: string[]) => void;
}

export interface ColumnHeaderProps {
	column: Column;
	sortBy: string;
	sortOrder: 'asc' | 'desc';
	onSort: (columnId: string) => void;
}

export interface PaginationProps {
	pagination: Pagination;
	itemName: string;
	onPageChange: (page: number) => void;
	onLimitChange: (limit: string) => void;
}

export interface ColumnVisibilityProps {
	columns: Column[];
	visibleColumns: string[];
	defaultColumns: string[];
	onToggle: (columnId: string) => void;
	onReset: () => void;
}
