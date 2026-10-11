import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "sf-symbols-typescript";
import type { ColorValue } from "react-native";

/**
 * One name → SF Symbol (iOS) + Material Symbol (Android / web). Filled glyphs for things
 * (card, gift, vault), thin strokes for directions (send/receive arrows) — the iOS Wallet idiom.
 */
const ICONS = {
  // navigation
  home: { ios: "house.fill", android: "home" },
  wallet: { ios: "banknote.fill", android: "account_balance_wallet" },
  pay: { ios: "square.grid.2x2.fill", android: "grid_view" },
  card: { ios: "creditcard.fill", android: "credit_card" },
  me: { ios: "person.crop.circle.fill", android: "account_circle" },
  // money actions
  add: { ios: "plus", android: "add" },
  plus: { ios: "plus", android: "add" },
  plusCircle: { ios: "plus.circle.fill", android: "add_circle" },
  send: { ios: "arrow.up", android: "arrow_upward" },
  receive: { ios: "arrow.down", android: "arrow_downward" },
  swap: { ios: "arrow.left.arrow.right", android: "swap_horiz" },
  swapVertical: { ios: "arrow.up.arrow.down", android: "swap_vert" },
  arrowDown: { ios: "arrow.down", android: "arrow_downward" },
  more: { ios: "ellipsis", android: "more_horiz" },
  cashpoint: { ios: "number", android: "pin" },
  bank: { ios: "building.columns.fill", android: "account_balance" },
  globe: { ios: "globe.europe.africa.fill", android: "public" },
  bitcoin: { ios: "bitcoinsign.circle.fill", android: "currency_bitcoin" },
  chart: { ios: "chart.line.uptrend.xyaxis", android: "show_chart" },
  // pay
  bill: { ios: "doc.text.fill", android: "receipt_long" },
  bolt: { ios: "bolt.fill", android: "bolt" },
  airtime: { ios: "phone.fill", android: "call" },
  data: { ios: "antenna.radiowaves.left.and.right", android: "cell_tower" },
  tv: { ios: "tv.fill", android: "tv" },
  gift: { ios: "gift.fill", android: "redeem" },
  vault: { ios: "archivebox.fill", android: "inventory_2" },
  repeat: { ios: "arrow.triangle.2.circlepath", android: "autorenew" },
  // system
  bell: { ios: "bell.fill", android: "notifications" },
  bellBadge: { ios: "bell.badge.fill", android: "notifications_active" },
  person: { ios: "person.crop.circle", android: "person" },
  people: { ios: "person.2.fill", android: "group" },
  personAdd: { ios: "person.badge.plus", android: "person_add" },
  qr: { ios: "qrcode", android: "qr_code_2" },
  scan: { ios: "qrcode.viewfinder", android: "qr_code_scanner" },
  copy: { ios: "square.on.square", android: "content_copy" },
  share: { ios: "square.and.arrow.up", android: "ios_share" },
  download: { ios: "arrow.down.to.line", android: "download" },
  paperplane: { ios: "paperplane.fill", android: "send" },
  filter: { ios: "line.3.horizontal.decrease.circle", android: "filter_list" },
  wallet2: { ios: "wallet.pass.fill", android: "account_balance_wallet" },
  link: { ios: "link", android: "link" },
  check: { ios: "checkmark", android: "check" },
  checkCircle: { ios: "checkmark.circle.fill", android: "check_circle" },
  close: { ios: "xmark", android: "close" },
  backspace: { ios: "delete.left", android: "backspace" },
  faceid: { ios: "faceid", android: "face" },
  fingerprint: { ios: "touchid", android: "fingerprint" },
  lock: { ios: "lock.fill", android: "lock" },
  key: { ios: "key.fill", android: "key" },
  shield: { ios: "checkmark.shield.fill", android: "verified_user" },
  verified: { ios: "checkmark.seal.fill", android: "verified" },
  eye: { ios: "eye", android: "visibility" },
  eyeOff: { ios: "eye.slash", android: "visibility_off" },
  settings: { ios: "gearshape.fill", android: "settings" },
  sliders: { ios: "slider.horizontal.3", android: "tune" },
  gauge: { ios: "speedometer", android: "speed" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  help: { ios: "bubble.left.and.bubble.right.fill", android: "support_agent" },
  info: { ios: "info.circle", android: "info" },
  legal: { ios: "doc.plaintext.fill", android: "gavel" },
  statements: { ios: "doc.richtext.fill", android: "description" },
  star: { ios: "star.fill", android: "star" },
  appearance: { ios: "circle.lefthalf.filled", android: "contrast" },
  moon: { ios: "moon.fill", android: "dark_mode" },
  search: { ios: "magnifyingglass", android: "search" },
  chevron: { ios: "chevron.right", android: "chevron_right" },
  chevronDown: { ios: "chevron.down", android: "expand_more" },
  back: { ios: "chevron.left", android: "arrow_back" },
  clock: { ios: "clock.fill", android: "schedule" },
  history: { ios: "clock.arrow.circlepath", android: "history" },
  snowflake: { ios: "snowflake", android: "ac_unit" },
  wifi: { ios: "wifi", android: "wifi" },
  phone: { ios: "iphone", android: "smartphone" },
  laptop: { ios: "laptopcomputer", android: "laptop_mac" },
  devices: { ios: "laptopcomputer.and.iphone", android: "devices" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  sun: { ios: "sun.max.fill", android: "light_mode" },
  infinity: { ios: "infinity", android: "all_inclusive" },
  checklist: { ios: "checklist", android: "checklist" },
  camera: { ios: "camera.fill", android: "photo_camera" },
  photo: { ios: "photo.on.rectangle.angled", android: "photo_library" },
  trash: { ios: "trash.fill", android: "delete" },
  pencil: { ios: "pencil", android: "edit" },
  idcard: { ios: "person.text.rectangle.fill", android: "badge" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  refresh: { ios: "arrow.clockwise", android: "refresh" },
  megaphone: { ios: "megaphone.fill", android: "campaign" },
  palette: { ios: "paintpalette.fill", android: "palette" },
  envelope: { ios: "envelope.fill", android: "mail" },
  location: { ios: "mappin.and.ellipse", android: "location_on" },
  percent: { ios: "percent", android: "percent" },
  // line variants — calm, consistent glyphs for settings lists (Me, Security)
  personLine: { ios: "person", android: "person" },
  shieldLine: { ios: "checkmark.shield", android: "verified_user" },
  docLine: { ios: "doc.text", android: "description" },
  lockLine: { ios: "lock", android: "lock" },
  bellLine: { ios: "bell", android: "notifications" },
  globeLine: { ios: "globe", android: "language" },
  questionLine: { ios: "questionmark.circle", android: "help" },
  starLine: { ios: "star", android: "star" },
  legalLine: { ios: "doc.plaintext", android: "gavel" },
  giftLine: { ios: "gift", android: "redeem" },
  keyLine: { ios: "key", android: "key" },
  devicesLine: { ios: "laptopcomputer.and.iphone", android: "devices" },
  chatLine: { ios: "bubble.left", android: "chat_bubble" },
  qrLine: { ios: "qrcode", android: "qr_code_2" },
  scanLine: { ios: "qrcode.viewfinder", android: "qr_code_scanner" },
  shareLine: { ios: "square.and.arrow.up", android: "ios_share" },
  logoutLine: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  trashLine: { ios: "trash", android: "delete" },
  // legacy aliases (onboarding / verify)
  home2: { ios: "house", android: "home" },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color, weight = "semibold" }: { name: IconName; size?: number; color: ColorValue; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  const n = ICONS[name];
  return (
    <SymbolView
      name={{ ios: n.ios as SFSymbol, android: n.android as never, web: n.android as never }}
      size={size}
      tintColor={color}
      weight={weight}
      style={{ width: size, height: size }}
    />
  );
}
