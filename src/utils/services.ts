import { useServices } from "@/api/queries";
import { useCatalogStore } from "@/stores/use-catalog-store";

/** The services an admin can switch off (tribe-backend: shared.ServiceCatalog). */
export type ServiceCode =
  | "swap"
  | "send_tribe"
  | "send_bank"
  | "send_global"
  | "send_crypto"
  | "bill_airtime"
  | "bill_data"
  | "bill_electricity"
  | "bill_tv"
  | "recurring_bills"
  | "gift_card_buy"
  | "gift_card_sell"
  | "virtual_cards"
  | "cashpoint_create"
  | "cashpoint_redeem"
  | "referral_withdraw"
  | "wallet_open"
  | "receive";

/** Every way to send: "Send" as a whole is only off when all four are. */
export const SEND_SERVICES: ServiceCode[] = ["send_tribe", "send_bank", "send_global", "send_crypto"];
export const BILL_SERVICES: ServiceCode[] = ["bill_airtime", "bill_data", "bill_electricity", "bill_tv"];
/** A bill category (`billCategory` in the catalogue) → its service. */
export const BILL_SERVICE: Record<string, ServiceCode> = { airtime: "bill_airtime", data: "bill_data", electricity: "bill_electricity", tv: "bill_tv" };

export const PAUSED = "Not available right now";

/**
 * Is this switched off? Returns the admin's message when EVERY one of the given services is off
 * (an entry point that leads to several, like Send, stays open while any of them is on), and
 * null while it can be used. Screens grey the entry out and stop it being tapped; the API refuses
 * a switched-off service either way. Until the switches have loaded, everything counts as on.
 */
export function useServiceOff(...codes: ServiceCode[]): string | null {
  useServices(); // keeps the switches fresh while a screen that cares is open
  const services = useCatalogStore((s) => s.services);
  let message: string | null = null;
  for (const code of codes) {
    const service = services.find((x) => x.code === code);
    if (!service || service.enabled) return null;
    message ??= service.message || PAUSED;
  }
  return message;
}
