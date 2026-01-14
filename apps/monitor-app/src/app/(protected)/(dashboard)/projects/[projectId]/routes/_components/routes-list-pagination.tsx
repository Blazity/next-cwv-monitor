"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type RoutesListPaginationProps = {
  currentPage: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalRoutes: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
};

export function RoutesListPagination({
  currentPage,
  totalPages,
  rangeStart,
  rangeEnd,
  totalRoutes,
  isPending,
  onPageChange,
}: RoutesListPaginationProps) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t p-4">
      <span className="text-muted-foreground text-sm">
        Showing {rangeStart}-{rangeEnd} of {totalRoutes}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isPending}
            className="bg-card"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isPending}
            className="bg-card"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
