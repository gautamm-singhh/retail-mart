import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableColumn } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { ProductForm } from "@/features/products/components/ProductForm";
import { useProducts } from "@/features/products/useProducts";
import { useCategories } from "@/features/categories/useCategories";
import { getActiveCategoryOptions } from "@/features/categories/getCategoryOptions";
import { useToast } from "@/hooks/useToast";
import type { Product, ProductFormValues } from "@/types";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Out of stock", value: "out-of-stock" },
];

export default function ProductsPage() {
  const { products, isLoading, error, refresh, addProduct, editProduct, removeProduct } =
    useProducts();
  const { categories } = useCategories();
  const categoryOptions = useMemo(() => getActiveCategoryOptions(categories), [categories]);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  function openAddForm() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  async function handleFormSubmit(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await editProduct(editingProduct.id, values);
        showToast("Product updated successfully.");
      } else {
        await addProduct(values);
        showToast("Product created successfully.");
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch {
      showToast("Something went wrong saving this product.", "error");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingProduct) return;
    try {
      await removeProduct(deletingProduct.id);
      showToast("Product deleted.");
    } catch {
      showToast("Something went wrong deleting this product.", "error");
    } finally {
      setDeletingProduct(null);
    }
  }

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "active").length;
  const lowStockCount = products.filter((p) => p.stock < 10).length;
  const categoriesCount = categories.length;

  const columns: TableColumn<Product>[] = [
    {
      header: "Product",
      render: (p) => (
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.products}/${p.id}`)}
          className="flex items-center gap-3 text-left font-medium text-slate-900 hover:text-emerald-600 hover:underline dark:text-slate-100 dark:hover:text-emerald-400 transition-colors"
        >
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shadow-xs"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
              }}
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
              {p.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{p.name}</div>
            <div className="text-xs text-slate-400 font-mono sm:hidden">SKU: {p.sku}</div>
          </div>
        </button>
      ),
    },
    {
      header: "SKU",
      hideBelow: "sm",
      render: (p) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {p.sku}
        </span>
      ),
    },
    {
      header: "Category",
      hideBelow: "md",
      render: (p) => (
        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {p.category}
        </span>
      ),
    },
    {
      header: "Price",
      render: (p) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {formatCurrency(p.price)}
        </span>
      ),
    },
    {
      header: "Stock",
      hideBelow: "sm",
      render: (p) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            p.stock === 0
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              : p.stock < 10
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
        </span>
      ),
    },
    { header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      header: "Actions",
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openEditForm(p)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingProduct(p)}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="CATALOG INVENTORY"
        title="Products & Inventory"
        description="Monitor product catalog inventory, pricing, SKU codes, and stock levels."
        action={<Button onClick={openAddForm}>+ Add Product</Button>}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Products"
          value={totalProducts}
          subtext="Catalog items"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <AdminStatCard
          label="Active Catalog"
          value={activeProducts}
          subtext="Live on storefront"
          accentColor="teal"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Low Stock Alerts"
          value={lowStockCount}
          subtext={lowStockCount > 0 ? "Needs restocking" : "Optimal levels"}
          accentColor={lowStockCount > 0 ? "amber" : "emerald"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <AdminStatCard
          label="Categories"
          value={categoriesCount}
          subtext="Active departments"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search products by name or SKU"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="sm:w-48">
              <Select
                label="Status"
                hideLabel
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          }
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading products" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load products" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredProducts}
              getRowKey={(p) => p.id}
              emptyState={
                <EmptyState
                  title="No products found"
                  description="Try a different search term or status filter."
                />
              }
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? "Edit product" : "Add product"}
      >
        <ProductForm
          initialValues={editingProduct ?? undefined}
          submitLabel={editingProduct ? "Save changes" : "Create product"}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
          categoryOptions={categoryOptions}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        title="Delete product"
        description={`This removes ${deletingProduct?.name ?? "this product"} from the catalog.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
}
