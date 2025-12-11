import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QueryFiltersSidebar, QueryFilters, defaultFilters } from '@/components/filters/QueryFiltersSidebar';
import { Filter, FileText, Loader2 } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ReportCardWithFiltersProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onGenerate: (filters: QueryFilters) => Promise<void>;
  showCategoryFilter?: boolean;
  showApprovalFilters?: boolean;
  showTicketFilter?: boolean;
}

export function ReportCardWithFilters({
  title,
  description,
  icon: Icon,
  onGenerate,
  showCategoryFilter = true,
  showApprovalFilters = true,
  showTicketFilter = true,
}: ReportCardWithFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<QueryFilters>(defaultFilters);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    await onGenerate(filters);
    setLoading(false);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  return (
    <>
      <Card 
        className="border-dashed hover:border-primary hover:shadow-md cursor-pointer transition-all" 
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Apply filters to customize your report before generating
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <QueryFiltersSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleReset}
              showApprovalFilters={showApprovalFilters}
              showCategoryFilter={showCategoryFilter}
              showTicketFilter={showTicketFilter}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
