'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface FilterState {
  moduleType: string;
  hasDiagram: boolean | null;
  minRating: number | null;
  searchQuery: string;
}

export interface FilterPanelProps {
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: FilterState) => void;
  /** Whether the panel is collapsed on mobile */
  collapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggleCollapse?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Filter panel for question review page
 * Provides client-side filtering controls
 */
export default function FilterPanel({
  filters,
  onFiltersChange,
  collapsed = false,
  onToggleCollapse,
  className,
}: FilterPanelProps) {
  const handleClearFilters = () => {
    onFiltersChange({
      moduleType: '',
      hasDiagram: null,
      minRating: null,
      searchQuery: '',
    });
  };

  const hasActiveFilters = 
    filters.moduleType !== '' || 
    filters.hasDiagram !== null || 
    filters.minRating !== null || 
    filters.searchQuery !== '';

  return (
    <div className={cn('bg-white rounded-lg shadow-md', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label={collapsed ? 'Expand filters' : 'Collapse filters'}
          >
            <X className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-45')} />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className={cn('p-4 space-y-4', collapsed && 'lg:block hidden')}>
        {/* Search Query */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
            Search Questions
          </label>
          <input
            type="text"
            id="search-query"
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search by question text..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Module Type */}
        <div>
          <label htmlFor="module-type" className="block text-sm font-medium text-gray-700 mb-2">
            Module Type
          </label>
          <select
            id="module-type"
            value={filters.moduleType}
            onChange={(e) => onFiltersChange({ ...filters, moduleType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Modules</option>
            <option value="math">Math</option>
            <option value="reading-writing">Reading & Writing</option>
          </select>
        </div>

        {/* Has Diagram */}
        <div>
          <label htmlFor="has-diagram" className="block text-sm font-medium text-gray-700 mb-2">
            Has Diagram
          </label>
          <select
            id="has-diagram"
            value={filters.hasDiagram === null ? '' : filters.hasDiagram.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? null : e.target.value === 'true';
              onFiltersChange({ ...filters, hasDiagram: value });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Questions</option>
            <option value="true">With Diagram</option>
            <option value="false">Without Diagram</option>
          </select>
        </div>

        {/* Minimum Rating */}
        <div>
          <label htmlFor="min-rating" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Rating
          </label>
          <select
            id="min-rating"
            value={filters.minRating === null ? '' : filters.minRating.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
              onFiltersChange({ ...filters, minRating: value });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any Rating</option>
            <option value="1">1+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="5">5 Stars</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}
