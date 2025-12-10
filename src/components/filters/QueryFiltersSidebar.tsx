import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QueryFilters {
  month: string;
  category: string;
  status: string;
  ticketNumber: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  approvalStatus: string;
}

interface QueryFiltersSidebarProps {
  filters: QueryFilters;
  onFiltersChange: (filters: QueryFilters) => void;
  onReset: () => void;
  showApprovalFilters?: boolean;
  showCategoryFilter?: boolean;
  showTicketFilter?: boolean;
}

const months = [
  { value: 'all', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'computing', label: 'Computing' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'peripherals', label: 'Peripherals' },
  { value: 'networking', label: 'Networking' },
  { value: 'audio_visual', label: 'Audio Visual' },
  { value: 'other', label: 'Other' },
];

const statuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'issued', label: 'Issued' },
  { value: 'returned', label: 'Returned' },
];

const approvalStatuses = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved Only' },
  { value: 'rejected', label: 'Denied Only' },
  { value: 'pending', label: 'Pending Only' },
];

export const defaultFilters: QueryFilters = {
  month: 'all',
  category: 'all',
  status: 'all',
  ticketNumber: '',
  dateFrom: undefined,
  dateTo: undefined,
  approvalStatus: 'all',
};

export function QueryFiltersSidebar({
  filters,
  onFiltersChange,
  onReset,
  showApprovalFilters = true,
  showCategoryFilter = true,
  showTicketFilter = true,
}: QueryFiltersSidebarProps) {
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'dateFrom' || key === 'dateTo') return value !== undefined;
    if (key === 'ticketNumber') return value !== '';
    return value !== 'all';
  }).length;

  const updateFilter = <K extends keyof QueryFilters>(key: K, value: QueryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="w-full space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-semibold">Query Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <Separator />

      {/* Month Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">By Month</Label>
        <Select value={filters.month} onValueChange={(v) => updateFilter('month', v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter */}
      {showCategoryFilter && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">By Product/Category</Label>
          <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Ticket Number Filter */}
      {showTicketFilter && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">By Ticket Number</Label>
          <div className="relative">
            <Input
              placeholder="e.g. 2025-000001"
              value={filters.ticketNumber}
              onChange={(e) => updateFilter('ticketNumber', e.target.value)}
            />
            {filters.ticketNumber && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => updateFilter('ticketNumber', '')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Date Range */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Activity Date Range</Label>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => updateFilter('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, 'PPP') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => updateFilter('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Approval Status Filter */}
      {showApprovalFilters && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">By Approval/Denial Status</Label>
            <Select value={filters.approvalStatus} onValueChange={(v) => updateFilter('approvalStatus', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by decision" />
              </SelectTrigger>
              <SelectContent>
                {approvalStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">By Status</Label>
            <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to apply filters to data
export function applyQueryFilters<T extends Record<string, any>>(
  data: T[],
  filters: QueryFilters,
  options: {
    dateField?: keyof T;
    categoryField?: keyof T;
    statusField?: keyof T;
    ticketField?: keyof T;
  } = {}
): T[] {
  const {
    dateField = 'created_at' as keyof T,
    categoryField = 'device_category' as keyof T,
    statusField = 'status' as keyof T,
    ticketField = 'ticket' as keyof T,
  } = options;

  return data.filter((item) => {
    // Month filter
    if (filters.month !== 'all') {
      const itemDate = new Date(item[dateField] as string);
      const itemMonth = String(itemDate.getMonth() + 1).padStart(2, '0');
      if (itemMonth !== filters.month) return false;
    }

    // Category filter
    if (filters.category !== 'all' && categoryField in item) {
      if (item[categoryField] !== filters.category) return false;
    }

    // Status filter
    if (filters.status !== 'all' && statusField in item) {
      if (item[statusField] !== filters.status) return false;
    }

    // Approval status filter
    if (filters.approvalStatus !== 'all' && statusField in item) {
      const status = String(item[statusField]).toLowerCase();
      if (filters.approvalStatus === 'approved' && status !== 'approved' && status !== 'issued') return false;
      if (filters.approvalStatus === 'rejected' && status !== 'rejected') return false;
      if (filters.approvalStatus === 'pending' && status !== 'pending') return false;
    }

    // Ticket number filter
    if (filters.ticketNumber && ticketField in item) {
      const ticket = String(item[ticketField] || '').toLowerCase();
      if (!ticket.includes(filters.ticketNumber.toLowerCase())) return false;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const itemDate = new Date(item[dateField] as string);
      if (filters.dateFrom && itemDate < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
    }

    return true;
  });
}
