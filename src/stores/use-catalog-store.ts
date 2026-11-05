import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetResource, BillerResource, CardDesignsResource, ChannelResource, GiftBrandResource } from "@/api/types";
import { persistStorage } from "./storage";

type CatalogState = {
  /** GET /billers, GET /gift-cards/brands, GET /card-designs, GET /channels, GET /assets */
  billers: BillerResource[];
  brands: GiftBrandResource[];
  designs: CardDesignsResource | null;
  channels: ChannelResource[];
  assets: AssetResource[];
  set: (patch: Partial<Pick<CatalogState, "billers" | "brands" | "designs" | "channels" | "assets">>) => void;
  /** the catalogue is the same for everyone; nothing here is user data, but keep the hook for symmetry */
  resetUserScoped: () => void;
};

/**
 * Product catalogues from the API (billers and their plans, gift-card brands and rates, card
 * designs, send channels, asset decimals). Persisted, so pickers paint from the last copy while
 * a fresh one loads. Read through `data/catalog.ts` (merged with the app's bundled logos).
 */
export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      billers: [],
      brands: [],
      designs: null,
      channels: [],
      assets: [],
      set: (patch) => set(patch),
      resetUserScoped: () => {},
    }),
    { name: "tribe:catalog", storage: persistStorage, version: 1, partialize: ({ billers, brands, designs, channels, assets }) => ({ billers, brands, designs, channels, assets }) },
  ),
);

/** Decimal places the API uses for an asset (amount strings are rounded to this). */
export function apiDecimals(code: string) {
  const known = useCatalogStore.getState().assets.find((a) => a.code === code)?.decimal_places;
  if (known !== undefined) return known;
  return ["BTC", "ETH", "SOL"].includes(code) ? 8 : ["USDT", "USDC"].includes(code) ? 6 : 2;
}
