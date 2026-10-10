export type WhyChooseUsBenefit = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type WhyChooseUsSettings = {
  isEnabled: boolean;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  benefits: WhyChooseUsBenefit[];
};

export const DEFAULT_WHY_CHOOSE_US: WhyChooseUsSettings = {
  isEnabled: true,
  badge: "Our Ethos",
  title: "The Anchor Fashion Difference",
  description:
    "We don't just sell clothes; we provide an elevated lifestyle experience. Discover why thousands of customers choose us for their everyday elegance.",
  imageUrl:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
  benefits: [
    {
      id: "benefit-1",
      icon: "ShieldCheck",
      title: "Premium Quality",
      description:
        "Crafted with the finest materials to ensure durability, comfort, and a flawless look.",
    },
    {
      id: "benefit-2",
      icon: "Truck",
      title: "Fast & Free Shipping",
      description:
        "Enjoy complimentary express shipping on all orders over ৳999 across the country.",
    },
    {
      id: "benefit-3",
      icon: "RefreshCcw",
      title: "Hassle-Free Returns",
      description:
        "Not the right fit? Return or exchange within 14 days with zero questions asked.",
    },
    {
      id: "benefit-4",
      icon: "HeartHandshake",
      title: "Ethical Fashion",
      description:
        "We are committed to sustainable practices and fair wages throughout our supply chain.",
    },
  ],
};
