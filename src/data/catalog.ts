import type { AssetCode } from "./assets";
import type { BillerResource, GiftBrandResource } from "@/api/types";
import { useCatalogStore } from "@/stores/use-catalog-store";
import { usdRate } from "@/utils/rates";
import type { ImageSourcePropType } from "react-native";

// Billers, plans, prices and gift-card rates come from the API (GET billers, GET gift-cards/brands,
// kept in use-catalog-store). The app only bundles the art: biller tiles (background baked in,
// rendered AS the tile) and brand marks, keyed by the API's ids.
export type PlanPeriod = "daily" | "weekly" | "monthly";
export type BillPlan = { id: string; name: string; price: number; period?: PlanPeriod };
export type Biller = {
  id: string;
  name: string;
  category: "airtime" | "data" | "tv" | "electricity";
  /** bundled tile art; billers without one show their name on their colour */
  image?: ImageSourcePropType;
  bg: string;
  fg: string;
  /** what the customer identifies themselves by */
  field: "phone" | "smartcard" | "meter";
  /** data bundles (with a period) or TV packages */
  plans?: BillPlan[];
};

const BILLER_ART: Record<string, ImageSourcePropType> = {
  mtn: require("@/assets/billers/mtn.png"),
  airtel: require("@/assets/billers/airtel.png"),
  glo: require("@/assets/billers/glo.png"),
  "9mobile": require("@/assets/billers/9mobile.png"),
  dstv: require("@/assets/billers/dstv.jpg"),
  gotv: require("@/assets/billers/gotv.jpg"),
  phed: require("@/assets/billers/phed.png"),
};

const toBiller = (r: BillerResource): Biller => ({
  id: r.id,
  name: r.name,
  category: r.category,
  field: r.field,
  image: BILLER_ART[r.id],
  bg: r.background || "#3b2a52",
  fg: r.foreground || "#fff",
  plans: r.plans?.map((p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, period: p.period })),
});

/** Every enabled biller, in the API's order. */
export const allBillers = (list = useCatalogStore.getState().billers) => list.filter((b) => b.enabled !== false).map(toBiller);

/** A stand-in while the catalogue loads (a stale deep link, a receipt for a retired biller). */
const unknownBiller = (id: string): Biller => ({ id, name: id ? id.toUpperCase() : "Bill", category: "airtime", field: "phone", bg: "#3b2a52", fg: "#fff", image: BILLER_ART[id] });

export function billerById(id: string): Biller {
  const r = useCatalogStore.getState().billers.find((b) => b.id === id);
  return r ? toBiller(r) : unknownBiller(id);
}

/** The first four digits of a Nigerian mobile number → its network (numbers can be ported: always overridable). */
const NETWORK_PREFIXES: Record<string, string[]> = {
  mtn: ["0803", "0806", "0703", "0706", "0810", "0813", "0814", "0816", "0903", "0906", "0913", "0916", "0704"],
  airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"],
  glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0909", "0908"],
};

/** Which network a phone number is on, from its prefix (null until 4 digits / unknown). */
export function detectNetwork(phone: string): string | null {
  const digits = phone.replace(/\D/g, "").replace(/^234/, "0");
  if (digits.length < 4) return null;
  const prefix = digits.slice(0, 4);
  return Object.keys(NETWORK_PREFIXES).find((k) => NETWORK_PREFIXES[k].includes(prefix)) ?? null;
}

export type GiftBrand = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  mark?: ImageSourcePropType;
  wordmark?: string;
  /** ₦ paid per $1 when selling */
  sellRate: number;
  /** what buying adds on top of the face value (0.015 = 1.5%) */
  markup: number;
  minUsd: number;
  maxUsd: number;
};

// Marks generated from simple-icons (CC0); Xbox and Amazon aren't in it → wordmarks.
const BRAND_ART: Record<string, { mark?: ImageSourcePropType; wordmark?: string }> = {
  steam: { mark: require("@/assets/gift-marks/steam.png") },
  apple: { mark: require("@/assets/gift-marks/apple.png") },
  playstation: { mark: require("@/assets/gift-marks/playstation.png") },
  amazon: { wordmark: "amazon" },
  spotify: { mark: require("@/assets/gift-marks/spotify.png") },
  netflix: { mark: require("@/assets/gift-marks/netflix.png") },
  xbox: { wordmark: "XBOX" },
  googleplay: { mark: require("@/assets/gift-marks/googleplay.png") },
  ebay: { mark: require("@/assets/gift-marks/ebay.png") },
  nike: { mark: require("@/assets/gift-marks/nike.png") },
  roblox: { mark: require("@/assets/gift-marks/roblox.png") },
  target: { mark: require("@/assets/gift-marks/target.png") },
};

const toBrand = (r: GiftBrandResource): GiftBrand => {
  const art = BRAND_ART[r.id] ?? { wordmark: r.name };
  return {
    id: r.id,
    name: r.name,
    bg: r.background || "#111",
    fg: r.foreground || "#fff",
    ...art,
    sellRate: Number(r.sell_rate_ngn) || 0,
    markup: (Number(r.buy_markup_percent) || 0) / 100,
    minUsd: r.minimum_usd || 5,
    maxUsd: r.maximum_usd || 500,
  };
};

export const allGiftBrands = (list = useCatalogStore.getState().brands) => list.filter((b) => b.enabled !== false).map(toBrand);

export function giftBrandById(id: string, loadedAt?: number): GiftBrand {
  void loadedAt;
  const r = useCatalogStore.getState().brands.find((b) => b.id === id);
  return r ? toBrand(r) : { id, name: id || "Gift card", bg: "#111", fg: "#fff", ...(BRAND_ART[id] ?? { wordmark: id }), sellRate: 0, markup: 0, minUsd: 5, maxUsd: 500 };
}

/** Quick picks, inside the brand's limits. */
export const giftAmounts = (brand: GiftBrand) => [10, 25, 50, 100, 200].filter((v) => v >= brand.minUsd && v <= brand.maxUsd);

/** What selling a card pays, in any currency: the ₦/$ rate, then converted at live rates (estimate). */
export function giftSellPayout(usd: number, brand: GiftBrand, code: AssetCode, version?: number) {
  void version;
  const ngn = usd * brand.sellRate;
  return code === "NGN" ? ngn : (ngn * usdRate("NGN")) / usdRate(code);
}
