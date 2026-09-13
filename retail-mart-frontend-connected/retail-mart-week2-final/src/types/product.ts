export type ProductStatus = "active" | "draft" | "out-of-stock";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  status: ProductStatus;
  imageUrl: string | null;
}

/** Fields collected by ProductForm when creating or editing a product. */
export type ProductFormValues = Omit<Product, "id">;
