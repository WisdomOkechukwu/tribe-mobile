import { assetByCode, type AssetCode } from "./assets";
import type { ImageSourcePropType } from "react-native";

// Biller tiles have their background baked in (no alpha) — render the image AS the tile.
// bg/fg are the brand colours for the loading/fallback face. All prices are illustrative.
export type PlanPeriod = "daily" | "weekly" | "monthly";
export type BillPlan = { id: string; name: string; price: number; period?: PlanPeriod };
export type Biller = {
  id: string;
  name: string;
  category: "airtime" | "data" | "tv" | "electricity";
  image: ImageSourcePropType;
  bg: string;
  fg: string;
  /** what the customer identifies themselves by */
  field: "phone" | "smartcard" | "meter";
  /** data bundles (with a period) or TV packages */
  plans?: BillPlan[];
};

const d = (id: string, name: string, price: number, period: PlanPeriod): BillPlan => ({ id, name, price, period });

export const BILLERS: Biller[] = [
  {
    id: "mtn", name: "MTN", category: "data", image: require("@/assets/billers/mtn.png"), bg: "#ffcb05", fg: "#1a1a1a", field: "phone",
    plans: [
      d("mtn-110mb", "110MB · 1 day", 100, "daily"),
      d("mtn-1gb-d", "1GB · 1 day", 350, "daily"),
      d("mtn-1gb", "1GB · 7 days", 800, "weekly"),
      d("mtn-3gb-w", "3.5GB · 7 days", 1_500, "weekly"),
      d("mtn-10gb", "10GB · 30 days", 3_500, "monthly"),
      d("mtn-20gb", "20GB · 30 days", 5_500, "monthly"),
      d("mtn-40gb", "40GB · 30 days", 11_000, "monthly"),
    ],
  },
  {
    id: "airtel", name: "Airtel", category: "airtime", image: require("@/assets/billers/airtel.png"), bg: "#e40000", fg: "#fff", field: "phone",
    plans: [d("airtel-200mb", "200MB · 1 day", 200, "daily"), d("airtel-1gb-d", "1GB · 1 day", 350, "daily"), d("airtel-1gb", "1.5GB · 7 days", 1_000, "weekly"), d("airtel-6gb", "6GB · 7 days", 2_500, "weekly"), d("airtel-10gb", "10GB · 30 days", 3_000, "monthly"), d("airtel-25gb", "25GB · 30 days", 8_000, "monthly")],
  },
  {
    id: "glo", name: "Glo", category: "data", image: require("@/assets/billers/glo.png"), bg: "#50b748", fg: "#fff", field: "phone",
    plans: [d("glo-1gb-d", "1GB · 1 day", 300, "daily"), d("glo-2gb-w", "2.5GB · 7 days", 1_000, "weekly"), d("glo-5gb", "5.8GB · 30 days", 2_000, "monthly"), d("glo-18gb", "18GB · 30 days", 5_000, "monthly")],
  },
  {
    id: "9mobile", name: "9mobile", category: "airtime", image: require("@/assets/billers/9mobile.png"), bg: "#006b3f", fg: "#fff", field: "phone",
    plans: [d("9m-650mb", "650MB · 1 day", 200, "daily"), d("9m-2gb", "2GB · 7 days", 1_000, "weekly"), d("9m-4gb", "4.5GB · 30 days", 2_000, "monthly"), d("9m-11gb", "11GB · 30 days", 4_000, "monthly")],
  },
  {
    id: "dstv", name: "DStv", category: "tv", image: require("@/assets/billers/dstv.jpg"), bg: "#00a2e5", fg: "#fff", field: "smartcard",
    plans: [
      { id: "dstv-padi", name: "Padi", price: 3_600 },
      { id: "dstv-yanga", name: "Yanga", price: 5_100 },
      { id: "dstv-confam", name: "Confam", price: 9_300 },
      { id: "dstv-compact", name: "Compact", price: 15_700 },
      { id: "dstv-premium", name: "Premium", price: 37_000 },
    ],
  },
  {
    id: "gotv", name: "GOtv", category: "tv", image: require("@/assets/billers/gotv.jpg"), bg: "#f2f2f2", fg: "#d6001c", field: "smartcard",
    plans: [
      { id: "gotv-smallie", name: "Smallie", price: 1_900 },
      { id: "gotv-jinja", name: "Jinja", price: 3_900 },
      { id: "gotv-jolli", name: "Jolli", price: 5_800 },
      { id: "gotv-max", name: "Max", price: 7_200 },
      { id: "gotv-supa", name: "Supa", price: 9_600 },
    ],
  },
  { id: "phed", name: "PHED", category: "electricity", image: require("@/assets/billers/phed.png"), bg: "#1f4fa3", fg: "#fff", field: "meter" },
];

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

export const billerById = (id: string) => BILLERS.find((b) => b.id === id) ?? BILLERS[0];

export type GiftBrand = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  mark?: ImageSourcePropType;
  wordmark?: string;
  /** illustrative ₦ paid per $1 when selling */
  sellRate: number;
};

// Marks generated from simple-icons (CC0); Xbox and Amazon aren't in it → wordmarks.
export const GIFT_BRANDS: GiftBrand[] = [
  { id: "steam", name: "Steam", bg: "#0b0b0d", fg: "#fff", mark: require("@/assets/gift-marks/steam.png"), sellRate: 1_210 },
  { id: "apple", name: "Apple", bg: "#1d1d1f", fg: "#fff", mark: require("@/assets/gift-marks/apple.png"), sellRate: 1_240 },
  { id: "playstation", name: "PlayStation", bg: "#0a5fc2", fg: "#fff", mark: require("@/assets/gift-marks/playstation.png"), sellRate: 1_160 },
  { id: "amazon", name: "Amazon", bg: "#232f3e", fg: "#ff9900", wordmark: "amazon", sellRate: 1_180 },
  { id: "spotify", name: "Spotify", bg: "#1ed760", fg: "#0b0b0d", mark: require("@/assets/gift-marks/spotify.png"), sellRate: 1_020 },
  { id: "netflix", name: "Netflix", bg: "#141414", fg: "#e50914", mark: require("@/assets/gift-marks/netflix.png"), sellRate: 1_050 },
  { id: "xbox", name: "Xbox", bg: "#107c10", fg: "#fff", wordmark: "XBOX", sellRate: 1_130 },
  { id: "googleplay", name: "Google Play", bg: "#f4f4f4", fg: "#1f1f1f", mark: require("@/assets/gift-marks/googleplay.png"), sellRate: 1_000 },
  { id: "ebay", name: "eBay", bg: "#e0433a", fg: "#fff", mark: require("@/assets/gift-marks/ebay.png"), sellRate: 1_090 },
  { id: "nike", name: "Nike", bg: "#111111", fg: "#fff", mark: require("@/assets/gift-marks/nike.png"), sellRate: 1_070 },
  { id: "roblox", name: "Roblox", bg: "#000000", fg: "#fff", mark: require("@/assets/gift-marks/roblox.png"), sellRate: 1_100 },
  { id: "target", name: "Target", bg: "#cc0000", fg: "#fff", mark: require("@/assets/gift-marks/target.png"), sellRate: 1_040 },
];

export const giftBrandById = (id: string) => GIFT_BRANDS.find((b) => b.id === id) ?? GIFT_BRANDS[0];
export const GIFT_CARD_BUY_MARKUP = 0.015;
export const GIFT_AMOUNTS = [10, 25, 50, 100, 200];

/** What selling a card pays, in any currency: the ₦/$ rate, then converted at today's (illustrative) rate. */
export function giftSellPayout(usd: number, brand: GiftBrand, code: AssetCode) {
  const ngn = usd * brand.sellRate;
  return code === "NGN" ? ngn : (ngn * assetByCode("NGN").usd) / assetByCode(code).usd;
}
