import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableColumn } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { useCategories } from "@/features/categories/useCategories";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import type { Category } from "@/types";
import { formatDate } from "@/utils/format";

export default function CategoriesPage() {
  const { categories, isLoading, error, refresh } = useCategories();
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  );

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.status === "active").length;
  const totalMappedProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  const columns: TableColumn<Category>[] = [
    {
      header: "Category",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs ring-1 ring-blue-100 dark:ring-blue-900/40">
            {c.name.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
        </div>
      ),
    },
    {
      header: "Mapped Products",
      render: (c) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {c.productCount} products
        </span>
      ),
    },
    { header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { header: "Created", hideBelow: "sm", render: (c) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(c.createdAt)}</span> },
    {
      header: "Actions",
      render: () => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm">
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 dark:text-rose-400">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="TAXONOMY & CLASSIFICATION"
        title="Product Categories"
        description="Organize and structure product catalog groupings, collections, and storefront taxonomy."
        action={<Button>+ Add Category</Button>}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Total Categories"
          value={totalCategories}
          subtext="Catalog departments"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
        />
        <AdminStatCard
          label="Active Taxonomies"
          value={activeCategories}
          subtext="Visible on navigation"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Catalog Products"
          value={totalMappedProducts}
          subtext="Assigned across categories"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search categories by name"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading categories" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load categories" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredCategories}
              getRowKey={(c) => c.id}
              emptyState={
                <EmptyState
                  title="No categories found"
                  description="Try a different search term."
                />
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}
