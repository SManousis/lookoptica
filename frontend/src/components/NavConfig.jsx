export const NAV_CATEGORIES = [
  {
    label: "Γυαλιά Ηλίου",
    slug: "sunglasses",
    audiences: [
      { label: "Άνδρες", slug: "men" },
      { label: "Γυναίκες", slug: "women" },
      { label: "Unisex", slug: "unisex" },
      { label: "Παιδιά", slug: "kids" },
    ],
    extras: [{ label: "Stock", view: "stock" }],
  },
  {
    label: "Σκελετοί Οράσεως",
    slug: "frames",
    audiences: [
      { label: "Άνδρες", slug: "men" },
      { label: "Γυναίκες", slug: "women" },
      { label: "Unisex", slug: "unisex" },
      { label: "Παιδιά", slug: "kids" },
    ],
    extras: [{ label: "Stock", view: "stock" }],
  },
  {
    label: "Όλα τα Προϊόντα",
    slug: "shop",
    href: "/shop",
    children: [
      { label: "Φακοί Επαφής", to: "/shop/contact-lenses" },
      { label: "Υγρά Φακών Επαφής", to: "/shop/other-products" },
      { label: "Αξεσουάρ / Αλυσίδες (Accessor-Eyes)", to: "/shop/other-products" },
      { label: "Διάφορα", to: "/shop/other-products" },
      { label: "Stock", to: "/shop?view=stock" },
    ],
  },
];
