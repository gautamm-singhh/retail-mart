import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ProductForm } from "@/features/products/components/ProductForm";
import { useProducts } from "@/features/products/useProducts";
import { useCategories } from "@/features/categories/useCategories";
import { getActiveCategoryOptions } from "@/features/categories/getCategoryOptions";
import { useToast } from "@/hooks/useToast";
import type { ProductFormValues } from "@/types";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, isLoading, error, refresh, editProduct, removeProduct } = useProducts();
  const { categories } = useCategories();
  const categoryOptions = useMemo(() => getActiveCategoryOptions(categories), [categories]);
  const { showToast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Product details" />
        <Card>
          <LoadingState label="Loading product" rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Product details" />
        <Card>
          <ErrorState title="Couldn't load this product" description={error} onRetry={refresh} />
        </Card>
      </div>
    );
  }

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Product not found" />
        <Card>
          <ErrorState
            title="We couldn't find this product"
            description="It may have been deleted, or the link is incorrect."
            onRetry={() => navigate(ROUTES.products)}
          />
        </Card>
      </div>
    );
  }

  const handleEditSubmit = async (values: ProductFormValues) => {
    try {
      await editProduct(product.id, values);
      showToast("Product updated successfully.");
      setIsEditOpen(false);
    } catch {
      showToast("Something went wrong saving this product.", "error");
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await removeProduct(product.id);
      showToast("Product deleted.");
      navigate(ROUTES.products);
    } catch {
      showToast("Something went wrong deleting this product.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="PRODUCT DETAILS"
        title={product.name}
        description={`SKU code: ${product.sku} • ID: ${product.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.products)}>
              ← Back to products
            </Button>
            <Button onClick={() => setIsEditOpen(true)}>Edit Product</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col gap-6 sm:flex-row">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-48 w-48 shrink-0 rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-700"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
                }}
              />
            ) : (
              <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-4xl font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                {product.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={product.status} />
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {product.category}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{product.name}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {product.description || "No catalog description specified for this SKU item."}
                </p>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs text-slate-400 font-medium">Retail Unit Price</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inventory & Catalog Specifications
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <dt className="text-xs text-slate-400">Stock on Hand</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {product.stock} <span className="text-xs font-normal text-slate-500">units</span>
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <dt className="text-xs text-slate-400">Stock Status</dt>
                <dd className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {product.stock > 0 ? "Available" : "Depleted"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <dt className="text-xs text-slate-400">SKU Code</dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {product.sku}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <dt className="text-xs text-slate-400">Visibility</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {product.status === "active" ? "Public Storefront" : "Internal Only"}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Catalog Actions</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage live product availability, pricing adjustments, or permanently archive.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => setIsEditOpen(true)} className="w-full justify-center">
              Edit Product Details
            </Button>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)} className="w-full justify-center">
              Delete Product from Catalog
            </Button>
          </div>

          <div className="mt-auto rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Enabled
            </div>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Changes to this product synchronize immediately with customer search and checkout.
            </p>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit product"
      >
        <ProductForm
          initialValues={product}
          submitLabel="Save changes"
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditOpen(false)}
          categoryOptions={categoryOptions}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete product"
        description={`This removes ${product.name} from the catalog.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
