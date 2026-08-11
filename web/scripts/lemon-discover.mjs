const API = "https://api.lemonsqueezy.com/v1";
const key = process.env.LEMONSQUEEZY_API_KEY;
if (!key) throw new Error("LEMONSQUEEZY_API_KEY is missing");
const headers = { Authorization: `Bearer ${key}`, Accept: "application/vnd.api+json" };
const get = async (path) => {
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};
const stores = await get("/stores");
const store = stores.data?.[0];
const catalog = await get("/products?include=variants");
console.log(JSON.stringify({
  store: store ? { id: store.id, name: store.attributes.name, slug: store.attributes.slug, testMode: !!store.attributes.test_mode } : null,
  products: (catalog.data || []).map((item) => ({ id: item.id, name: item.attributes.name, status: item.attributes.status, testMode: !!item.attributes.test_mode })),
  variants: (catalog.included || []).filter((item) => item.type === "variants").map((item) => ({
    id: item.id,
    productId: String(item.attributes.product_id),
    name: item.attributes.name,
    price: item.attributes.price,
    subscription: !!item.attributes.is_subscription,
    interval: item.attributes.interval,
    status: item.attributes.status,
    testMode: !!item.attributes.test_mode,
  })),
}, null, 2));
