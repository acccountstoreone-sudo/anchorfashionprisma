import { redirect } from "next/navigation";

export default function AdminCatalogReviewsRedirect() {
  redirect("/admin/products/reviews");
}
