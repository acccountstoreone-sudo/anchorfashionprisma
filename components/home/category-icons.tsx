import Link from "next/link";
import Image from "next/image";

interface Category {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "all", label: "All", icon: "👚", active: true },
  { id: "dresses", label: "Dresses", icon: "👗" },
  { id: "tshirts", label: "T-shirts", icon: "👕" },
  { id: "denim", label: "Denim", icon: "👖" },
  { id: "jackets", label: "Jackets", icon: "🧥" },
  { id: "coats", label: "Coats", icon: "🥼" },
  { id: "shoes", label: "Shoes", icon: "👟" },
];

export function CategoryIcons({
  categories = DEFAULT_CATEGORIES,
}: {
  categories?: Category[];
}) {
  return (
    <section className="w-full bg-white py-10">
      <div className="container px-4 text-center">
        <h2 className="mb-2 text-3xl font-bold text-[#fa5a5a]">Category</h2>
        <div className="mb-12 flex items-center justify-center gap-1">
          <div className="h-2 w-2 rounded-full bg-[#fa5a5a]"></div>
          <div className="h-[2px] w-12 bg-[#fa5a5a]"></div>
          <div className="h-2 w-2 rounded-full bg-[#fa5a5a]"></div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="group flex flex-col items-center gap-4"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white text-3xl transition-all md:h-20 md:w-20 md:text-4xl ${cat.active ? "border-[#fa5a5a] shadow-md shadow-[#fa5a5a]/20" : "border-transparent group-hover:border-[#fa5a5a]/30"}`}
              >
                {cat.icon}
              </div>
              <span
                className={`text-sm font-medium md:text-base ${cat.active ? "border-b-2 border-black pb-1 text-black" : "text-[#fa5a5a]"}`}
              >
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
