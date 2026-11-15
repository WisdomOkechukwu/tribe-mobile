import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetResource, BillerResource, CardDesignsResource, ChannelResource, GiftBrandResource, ServiceResource } from "@/api/types";
import { registerAssets } from "@/data/assets";
import { persistStorage } from "./storage";

type CatalogState = {
  /** GET /billers, GET /gift-cards/brands, GET /card-designs, GET /channels, GET /assets */
  billers: BillerResource[];
  brands: GiftBrandResource[];
  designs: CardDesignsResource | null;
  channels: ChannelResource[];
  assets: AssetResource[];
  /** GET /services: which services an admin has switched off (read through `utils/services.ts`) */
  services: ServiceResource[];
  set: (patch: Partial<Pick<CatalogState, "billers" | "brands" | "designs" | "channels" | "assets" | "services">>) => void;
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
      services: [],
      set: (patch) => {
        // currencies an admin added since this build: known to the whole app from here on
        if (patch.assets) registerAssets(patch.assets);
        set(patch);
      },
      resetUserScoped: () => {},
    }),
    { name: "tribe:catalog", storage: persistStorage, version: 1, partialize: ({ billers, brands, designs, channels, assets, services }) => ({ billers, brands, designs, channels, assets, services }),
      // the copy from the last launch: register its currencies before the first screen draws
      onRehydrateStorage: () => (state) => {
        if (state?.assets.length) registerAssets(state.assets);
      },
    },
  ),
);

/** Decimal places the API uses for an asset (amount strings are rounded to this). */
export function apiDecimals(code: string) {
  const known = useCatalogStore.getState().assets.find((a) => a.code === code)?.decimal_places;
  if (known !== undefined) return known;
  return ["BTC", "ETH", "SOL"].includes(code) ? 8 : ["USDT", "USDC"].includes(code) ? 6 : 2;
}
