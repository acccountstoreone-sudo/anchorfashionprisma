"use server"

// Manager product actions -- re-exports admin product actions since
// safe-action.ts now allows manager role. This file exists as a clean
// import path for manager components.
export {
  createAdminProductAction as createManagerProductAction,
  updateAdminProductAction as updateManagerProductAction,
  getAdminProductByIdAction as getManagerProductByIdAction,
  getCategoriesAction,
  getBrandsAction,
  getTagsAction,
} from "@/lib/actions/admin/products.actions";
