import { User, ShoppingBag, Tag, Heart } from "lucide-react";

export function TrustBar() {
  const stats = [
    {
      icon: <User className="h-5 w-5 text-gray-700" strokeWidth={1.5} />,
      title: "Thousands of Styles",
      description: "Explore a wide range",
    },
    {
      icon: <ShoppingBag className="h-5 w-5 text-gray-700" strokeWidth={1.5} />,
      title: "Top Brands",
      description: "Handpicked collections",
    },
    {
      icon: <Tag className="h-5 w-5 text-gray-700" strokeWidth={1.5} />,
      title: "Best Prices",
      description: "Unbeatable deals",
    },
    {
      icon: <Heart className="h-5 w-5 text-gray-700" strokeWidth={1.5} />,
      title: "Happy Customers",
      description: "4.8/5 average rating",
    },
  ];

  return (
    <section className="border-y border-gray-100 bg-[#fcfaf9] py-10">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-center gap-4">
              <div className="flex-shrink-0">{stat.icon}</div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {stat.title}
                </span>
                <span className="text-xs text-gray-500">
                  {stat.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
