import type { ImageSourcePropType } from "react-native";

// Biller tiles have their background baked in (no alpha) — render the image AS the tile.
// bg/fg are the brand colours for the loading/fallback face.
export type Biller = {
  id: string;
  name: string;
  category: "airtime" | "data" | "tv" | "electricity";
  image: ImageSourcePropType;
  bg: string;
  fg: string;
  /** what the customer identifies themselves by */
  field: "phone" | "smartcard" | "meter";
  plans?: { id: string; name: string; price: number }[];
};

export const BILLERS: Biller[] = [
  {
    id: "mtn", name: "MTN", category: "data", image: require("@/assets/billers/mtn.png"), bg: "#ffcb05", fg: "#1a1a1a", field: "phone",
    plans: [
      { id: "mtn-1gb", name: "1GB · 7 days", price: 800 },
      { id: "mtn-10gb", name: "10GB · 30 days", price: 3_500 },
      { id: "mtn-40gb", name: "40GB · 30 days", price: 11_000 },
    ],
  },
  { id: "airtel", name: "Airtel", category: "airtime", image: require("@/assets/billers/airtel.png"), bg: "#e40000", fg: "#fff", field: "phone" },
  { id: "glo", name: "Glo", category: "data", image: require("@/assets/billers/glo.png"), bg: "#50b748", fg: "#fff", field: "phone", plans: [{ id: "glo-5gb", name: "5.8GB · 30 days", price: 2_000 }] },
  { id: "9mobile", name: "9mobile", category: "airtime", image: require("@/assets/billers/9mobile.png"), bg: "#006b3f", fg: "#fff", field: "phone" },
  {
    id: "dstv", name: "DStv", category: "tv", image: require("@/assets/billers/dstv.jpg"), bg: "#00a2e5", fg: "#fff", field: "smartcard",
    plans: [
      { id: "dstv-compact", name: "Compact", price: 15_700 },
      { id: "dstv-premium", name: "Premium", price: 37_000 },
    ],
  },
  { id: "gotv", name: "GOtv", category: "tv", image: require("@/assets/billers/gotv.jpg"), bg: "#f2f2f2", fg: "#d6001c", field: "smartcard", plans: [{ id: "gotv-max", name: "Max", price: 7_200 }] },
  { id: "phed", name: "PHED", category: "electricity", image: require("@/assets/billers/phed.png"), bg: "#1f4fa3", fg: "#fff", field: "meter" },
];

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
  { id: "steam", name: "Steam", bg: "#0b0b0d", fg: "#fff", mark: require("@/assets/gift-marks/steam.svg"), sellRate: 1_210 },
  { id: "apple", name: "Apple", bg: "#1d1d1f", fg: "#fff", mark: require("@/assets/gift-marks/apple.svg"), sellRate: 1_240 },
  { id: "playstation", name: "PlayStation", bg: "#0a5fc2", fg: "#fff", mark: require("@/assets/gift-marks/playstation.svg"), sellRate: 1_160 },
  { id: "amazon", name: "Amazon", bg: "#232f3e", fg: "#ff9900", wordmark: "amazon", sellRate: 1_180 },
  { id: "spotify", name: "Spotify", bg: "#1ed760", fg: "#0b0b0d", mark: require("@/assets/gift-marks/spotify.svg"), sellRate: 1_020 },
  { id: "netflix", name: "Netflix", bg: "#141414", fg: "#e50914", mark: require("@/assets/gift-marks/netflix.svg"), sellRate: 1_050 },
  { id: "xbox", name: "Xbox", bg: "#107c10", fg: "#fff", wordmark: "XBOX", sellRate: 1_130 },
  { id: "googleplay", name: "Google Play", bg: "#f4f4f4", fg: "#1f1f1f", mark: require("@/assets/gift-marks/googleplay.svg"), sellRate: 1_000 },
  { id: "ebay", name: "eBay", bg: "#e0433a", fg: "#fff", mark: require("@/assets/gift-marks/ebay.svg"), sellRate: 1_090 },
  { id: "nike", name: "Nike", bg: "#111111", fg: "#fff", mark: require("@/assets/gift-marks/nike.svg"), sellRate: 1_070 },
  { id: "roblox", name: "Roblox", bg: "#000000", fg: "#fff", mark: require("@/assets/gift-marks/roblox.svg"), sellRate: 1_100 },
  { id: "target", name: "Target", bg: "#cc0000", fg: "#fff", mark: require("@/assets/gift-marks/target.svg"), sellRate: 1_040 },
];

export const giftBrandById = (id: string) => GIFT_BRANDS.find((b) => b.id === id) ?? GIFT_BRANDS[0];
export const GIFT_CARD_BUY_MARKUP = 0.015;
export const GIFT_AMOUNTS = [10, 25, 50, 100, 200];
