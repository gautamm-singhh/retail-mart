import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/api/products";
import type { Product, ProductFormValues } from "@/types";

export const productRepository = {
  list: (): Promise<Product[]> => fetchProducts(),
  getById: (id: string): Promise<Product> => fetchProduct(id),
  create: (values: ProductFormValues): Promise<Product> => createProduct(values),
  update: (id: string, values: ProductFormValues): Promise<Product> => updateProduct(id, values),
  remove: (id: string): Promise<void> => deleteProduct(id),
};
