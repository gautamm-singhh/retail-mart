import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useAddresses } from "@/features/addresses/useAddresses";
import { useCustomerStats } from "@/features/dashboard/useCustomerStats";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import type { Address, AddressFormValues } from "@/types";

export default function AccountPage() {
  const { currentUser } = useAuth();
  const { itemCount: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const { addresses, isLoading, error, refresh, addAddress, editAddress, removeAddress } = useAddresses();
  const { stats, isLoading: statsLoading, error: statsError } = useCustomerStats();
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  if (!currentUser) return null;

  async function handleSubmit(values: AddressFormValues) {
    try {
      if (editingAddress) {
        await editAddress(editingAddress.id, values);
        showToast("Address updated.");
      } else {
        await addAddress(values);
        showToast("Address added.");
      }
      setIsFormOpen(false);
      setEditingAddress(null);
    } catch {
      showToast("Something went wrong saving this address.", "error");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingAddress) return;
    try {
      await removeAddress(deletingAddress.id);
      showToast("Address removed.");
    } catch {
      showToast("Something went wrong removing this address.", "error");
    } finally {
      setDeletingAddress(null);
    }
  }

  const initial = currentUser.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Account Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-xl font-black text-white shadow-sm">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {currentUser.name}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                Customer Account
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.email || "Verified Member"} • Active Member
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 rounded-xl"
          onClick={() => navigate(ROUTES.myOrders)}
        >
          <span>View My Orders</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Button>
      </div>

      {/* Purchase Summary Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Purchase Insights & Statistics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated metrics from your authenticated transaction history
            </p>
          </div>
        </div>

        {statsLoading ? (
          <LoadingState label="Loading purchase summary..." rows={2} />
        ) : statsError ? (
          <ErrorState title="Couldn't load purchase summary" description={statsError} />
        ) : stats ? (
          <div className="space-y-6">
            {/* 5 Primary Stat Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-emerald-950/60 dark:bg-emerald-950/30">
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.totalOrders}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Total Orders</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-emerald-950/60 dark:bg-emerald-950/30">
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(stats.totalSpent)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Total Spent</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-amber-950/60 dark:bg-amber-950/30">
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.totalItemsPurchased}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Items Purchased</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-sky-950/60 dark:bg-sky-950/30">
                <p className="text-2xl font-black text-sky-700 dark:text-sky-400">{stats.uniqueProductsPurchased}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Unique Products</p>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-purple-950/60 dark:bg-purple-950/30">
                <p className="text-2xl font-black text-purple-700 dark:text-purple-400">{stats.activeShipments}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Active Shipments</p>
              </div>
            </div>

            {/* Recent 30-Day Activity Bar */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent Activity (Past 30 Days)
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.last30DaysOrders}</span>
                  <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">orders placed</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(stats.last30DaysSpent)}</span>
                  <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">spent</span>
                </div>
                {stats.lastOrderDate && (
                  <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                    Latest Order Date: <span className="font-semibold text-slate-900 dark:text-slate-200">{stats.lastOrderDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Table */}
            {stats.categoryBreakdown.length > 0 && (
              <div>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Spending by Category
                </p>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80">
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600 dark:text-slate-300">Category</th>
                        <th className="px-4 py-2.5 text-right font-bold text-slate-600 dark:text-slate-300">Orders</th>
                        <th className="px-4 py-2.5 text-right font-bold text-slate-600 dark:text-slate-300">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {stats.categoryBreakdown.map((row) => (
                        <tr key={row.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-200">{row.category}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">{row.orderCount}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(row.totalSpent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.totalOrders === 0 && (
              <EmptyState
                title="No purchases yet"
                description="Your purchase insights and statistics will appear here once you place your first order."
              />
            )}
          </div>
        ) : null}
      </section>

      {/* Saved Wishlist Summary Card */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-5 shadow-xs dark:border-rose-950/60 dark:bg-rose-950/20 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Saved Wishlist</h2>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-900/80 dark:text-rose-200">
                {wishlistCount} {wishlistCount === 1 ? "item" : "items"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {wishlistCount > 0
                ? "Items you've liked and saved across your shopping sessions."
                : "Save your favorite products to quickly purchase them later."}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(ROUTES.wishlist)}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/80 dark:text-rose-300 dark:hover:bg-rose-950/50"
        >
          <span>View Wishlist</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </section>

      {/* Address Book Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Saved Delivery Addresses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage saved destinations for rapid one-click checkout</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="rounded-xl"
            onClick={() => {
              setEditingAddress(null);
              setIsFormOpen(true);
            }}
          >
            + Add Address
          </Button>
        </div>

        {isLoading ? (
          <LoadingState label="Loading addresses..." rows={2} />
        ) : error ? (
          <ErrorState title="Couldn't load addresses" description={error} onRetry={refresh} />
        ) : addresses.length === 0 ? (
          <EmptyState title="No addresses saved" description="Add an address to speed up checkout." />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4.5 text-xs sm:text-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{address.label}</span>
                    {address.isDefault && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} — {address.postalCode}
                  </p>
                  {address.phone && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Contact: {address.phone}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-800/80">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      setEditingAddress(address);
                      setIsFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    onClick={() => setDeletingAddress(address)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Address Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAddress ? "Edit Delivery Address" : "Add New Delivery Address"}
      >
        <AddressForm
          initialValues={editingAddress ?? undefined}
          submitLabel={editingAddress ? "Save Changes" : "Save Address"}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingAddress)}
        title="Remove address"
        description={`Are you sure you want to remove the "${deletingAddress?.label}" address from your account?`}
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeletingAddress(null)}
      />
    </div>
  );
}
