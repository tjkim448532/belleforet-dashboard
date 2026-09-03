export const DEFAULT_CATEGORIES: string[] = [];
export type Category = string;
export interface StoreMapping {
  id?: string;
  storeName: string;
  category: Category;
}
export const defaultMappings: Omit<StoreMapping, 'id'>[] = [];
