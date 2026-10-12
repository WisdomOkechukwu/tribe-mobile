@AGENTS.md

# Tribe — mobile app

Expo SDK 57 · Expo Router · React Native 0.86 · Reanimated 4 · React Compiler · Zustand. It mirrors the landing page in `../` (same palette, logos and product truths). This is a **prototype on mock data**: there is no backend. Every balance, rate and transaction is seeded in `src/data/`.

## Run
Homebrew Node on this machine is broken, so prefix every command with `export PATH=~/.nvm/versions/node/v24.19.0/bin:$PATH`.
```sh
npx expo start            # Expo Go (QoreID falls back to the mock flow)
npx expo run:ios          # native dev build: needed for the real QoreID SDK
npm run check            # tsc + expo lint + SF Symbols guard (scripts/check-symbols.mjs)
npm run flags            # re-rasterise assets/flags/*.png from flag-icons (needs the root's sharp)
```
Add packages with `npx expo install`, never `npm install` directly. `ios/` and `android/` are generated (CNG) and gitignored, so never edit them.

## Product truths (same as the landing page)
- **Cashpoints** are a 12-digit code generated with NGN. Anyone can redeem one: existing users instantly, new users at sign-up. They are **never** @tag transfers. (@tag transfers exist separately under Send.)
- **Gift cards** can be bought *and* sold.
- **Recurring bills are live** (weekly, every 2 weeks, monthly; any balance). `success` offers "Make this recurring?" after a bill.
- **Token Vault** saves every electricity token; users tap "I've loaded it" (Undo exists). The screen is deliberately static: no layout/press animation, no filter tabs.
- **Referrals** pay ₦25 every time an invited friend transacts, for life (`src/data/referrals.ts`). Rewards collect in a **referral balance** (`use-referral-store`) that withdraws into **any currency**, crypto included (`referral-withdraw/`).
- **Every receipt** has "Report an issue" → `report/[id]` (reasons per transaction type, ticket in `use-support-store`, inbox item).
- **PHED** is the only electricity provider we have a logo for.

## Structure
- `src/app/`: routes only. Three guarded groups in the root `<Stack>` (see "Auth and lock" below).
  - `(auth)/` (signed out): intro (Onboarding.png carousel) → create-account (1/3: email + country) → verify-email (4-digit code) → details (2/3) → password (3/3); sign-in; forgot → verify-email?mode=reset → password?mode=reset → password-done.
  - `(onboarding)/` (signed in, not set up — SBU.png): welcome (pick a **world**) → checklist (only that world's needs, `data/worlds.ts`) → phone/otp, bvn, know-you ("Submit for review") → pin-intro → create-pin → pin-done → lock-intro → lock-create → lock-done → biometrics → redeem (Cashpoint) → done. `done` stores the world's landing route; Home opens it once.
  - `(tabs)/` holds five tabs: **Home · Wallet · Pay · Cards · Me**. Every tab `_layout` exports `unstable_settings = { initialRouteName: "index" }`.
    - `(home)/`: index (fixed top bar), activity (**History**: All/Local/Crypto/Global + type filter; `?type=card&card=c1`), notifications
    - `wallet/`: index
    - `pay/`: index, vault, gift-cards, recurring
    - `cards/`: index (page tinted by the card's theme; Recent + All transactions), details, all ("My cards")
    - `me/`: index, edit, qr, invite (balance · Earnings · Withdrawals · Friends), security, change-pin (transaction PIN), lock-pin, password, devices, notifications, statements
  - **Modal flows** (own folder + stack, native headers via `FlowScreen`): `send/` (index: NGN / global / crypto → global or crypto pickers → recipient → amount → review; state in `use-send-draft`), `swap/`, `bill/[id]`, `gift/[id]`, `cashpoint/`, `recurring/`, `card-new/` (index → type → verify → details → review), `card-fund/`, `card-withdraw/` (both render `screens/cards/move-money.tsx`), `add-currency/`, `referral-withdraw/`.
  - Other root screens: `transaction/[id]` (receipt), `report/[id]`, `receive/[code]`, `search` (modals); `scan` (fullScreenModal); `asset/[code]`, `verify/*`, `pin`, `success`, `dev.tsx` (dev only: `?action=onboard|showcase|lock|signout|reset|hide`, plus `&to=`, `&theme=`, `&demo=send`).
- **Routing rules:**
  - Only the tabs' Home may be `/`. Guarded groups come first in the root `<Stack>`.
  - Flow folders set `unstable_settings.initialRouteName = "index"`.
  - Cross-tab deep links use `router.push(href, { withAnchor: true })` so the tab's index sits underneath (that's how Token Vault got its back button).
  - Titles sit inline with the back button: large titles only on the Wallet, Pay and Cards roots (`TAB_ROOT` in `stack-options.ts`). Headers are opaque.
- `src/screens/`: `review.tsx` (shared review + `actionSummary()`: heading, breakdown, CTA per kind), `onboarding/shell.tsx` + `onboarding/pin-create.tsx`, `pin-change.tsx` (change/reset either PIN), `send/shared.tsx`, `cards/move-money.tsx`, `home/sheets.tsx`, verify flow.
- `src/components/` (highlights):
  - Overlays: `overlay-host` + `stores/use-overlay-store` (`overlay.select / sheet / confirm / notice`), `toast`
  - Layout and lists: `list` (ListSection, ListRow, RowIcon, SectionLink), `flow-screen`, `screen`, `field`, `dropdown`, `keyboard-frame`
  - Navigation: `glass-tab-bar`, `tab-icons`, `app-tabs`, `stack-options`
  - Money: `balance-hero`, `asset-row`, `transaction-row` (`groupByDay`), `pair-icon`, `transfer-legs` (From → To pair), `result-badge`, `pending-timeline`, `amount-entry`
  - Brand: `cashpoint-mark` (₦ on a tilted ticket), `cashpoint-ticket`, `card-face` (7 finishes, `useCardPalette`), `brand-tiles`, `coin-icon` (circular flags/coins), `illustrations` (intro art built from real assets; `onColour` for the intro bands), `tribe-loader` (logo disc breathing out rings over a wave of slanted bars; + `LoadingHost`, `withLoader()`), `brand-splash` (cold-start breathe-out)
  - **The logo is `assets/brand/tribe-logo.png`** (copied from `../TribeLogo.png`; it carries the TRIBE wordmark, so never set "TRIBE" text next to it). On purple-900 or orange put it on a white disc (`MarkDisc` in `screens/auth/shell.tsx`).
  - Auth: `lock-gate` (app lock overlay), `password-field`, `password-rules`. Signed-out screens use `AuthShell` (`src/screens/auth/shell.tsx`): purple-900 band (corner stripes, logo disc, `poster` caps headline with an orange last line, step segments) and a light sheet rising over it; the band scrolls with the form. Post-signup setup keeps `OnboardingShell`.
  - Pickers & money: `asset-picker` (`openAssetPicker`: search, popular, tabs, "Tap to create"), `quote-timer`, `receipt-ticket` (shareable receipt image)
  - `privacy-guard` (screenshot/recording protection; web no-op)
- `src/stores/` (Zustand, persisted as `tribe:*`): `session` (auth, PINs, lock, world landing), `prefs`, `wallet`, `cards`, `vault`, `inbox`, `recurring`, `support`, `beneficiaries`, `referrals`. Not persisted: `flow`, `swap-draft`, `send-draft`, `signup`, `overlay`, `ui` (toast + loader). `reset.ts` resets all demo data.
- `src/data/`: `countries`, `channels` (send rails + their fields), `worlds`, `security` (auto-lock, PIN lengths, password rules) alongside the seed data.
- `src/utils/`: `tx.ts` (`txScope`, `receiptRows`), `rates.ts` (clock-driven demo quotes), `share-receipt.ts` + `save-image(.web).ts`, `hash.ts` (demo password digest). `src/services/biometrics.ts` wraps expo-local-authentication. `src/hooks/use-auto-lock.ts`.
- `src/theme/`: the only source of colour, type, spacing, radius, shadow and motion.

## Design rules (v2: Revolut-clean, Gen Z warmth)
- **Colour:**
  - Neutral surfaces, with **brand purple as the only primary** (buttons, selection, links).
  - Orange only as a highlight: notification dots, promos, Cashpoints and referral moments.
  - Green and red only for money up and down.
- **Grouping:** group with `ListSection` (hairlines, inset separators), not a card per row. Cards are only for real cards: promos, the virtual card, the tag card, the Cashpoint hub.
- **Icons are circular**: icon chips, flags, coins, biller and card badges. Neutral line icons in grey circles on Me/settings; colour only for status.
- **No system UI**: no `Alert`, `ActionSheetIOS` or native pickers. Use `overlay.select / sheet / confirm / notice`.
- **No scroll bars**: every `ScrollView` / `FlatList` / `SectionList` sets `showsVerticalScrollIndicator={false}` and `showsHorizontalScrollIndicator={false}`.
- **Money colour**: outgoing (−) amounts are red, incoming green.
- **Sensitive screens** (Cashpoint, card details, receipts with tokens/codes, Token Vault, success with a code) mount `<PrivacyGuard />`.
- **Type:** Bricolage for money and titles only; Poppins for everything else. Use the `Text` variants; never set fontSize in screens. `poster` (uppercase Bricolage 800) is for brand moments only: the intro and the auth band.
- **Stripes:** at most one stripes motif per screen.
- **Feedback:** copy actions confirm with `toast()`, not inline "Copied" chips.
- **Tab bar:**
  - iOS 26+ uses the system **Liquid Glass** `NativeTabs`, with no background override.
  - Older iOS, Android and web use the floating frosted `GlassTabs` capsule.
  - The bar hides on screens pushed inside a tab (`useTabBarHidden`).
- **`expo-router/ui` Tabs gotchas** (we hit both):
  - `TabTrigger`s must be **direct children** of `TabList`'s child.
  - `TabList asChild` rejects array styles. That's why the bar animates with RN `Animated` and a single style object.
- **Currency chips** use `ASSETS_FIAT_FIRST`, and `ChipRow` scrolls a default selection into view.
- **New native modules** (`expo-blur`, `expo-camera`, `expo-image-picker`, `expo-glass-effect`, `expo-screen-capture`, `expo-clipboard`, `expo-local-authentication`, `expo-sharing`, `expo-media-library`, `react-native-view-shot`) work in Expo Go. A dev build (`npx expo run:ios`) must be **rebuilt** after adding them.

## Auth and lock
- **Guards:** `!signedIn` → `(auth)`; `signedIn && !hasOnboarded` → `(onboarding)`; both → the app. Log out = `signOut()` (keeps the device's account and data, remembers the email); Delete account / dev reset = `resetDemoData()` + `wipe()`.
- **App lock is an overlay, not a guard** (`LockGate` in the root layout, iOS `FullWindowOverlay`), so unlocking returns you exactly where you were. `useAutoLock` locks after 10 min without a touch, incl. background/cold start (`lastActiveAt` is persisted). 3 wrong lock PINs → password sign-in. Mount order in the root layout is the stacking order: LockGate, then OverlayHost (overlays opened from the lock screen must sit above it), LoadingHost, ToastHost.
- **Two PINs, never confused in copy:** the 4-digit **transaction PIN** approves payments; the 6-digit **lock PIN** unlocks the app. Every lock-PIN screen says it isn't the transaction PIN.
- **Biometrics are real:** `authenticate()` must succeed before turning Face ID on or approving with it. On web it's simulated in dev only.

## Rules that came from real bugs
- **Splash parity:** `BrandSplash` must start exactly where the native splash ends: same image (`tribe-logo.png`), same width (`SPLASH_MARK_WIDTH` = `imageWidth` in app.json), same light `#F5F3F7` background in both schemes. It hides the native splash on its own `onLayout`. Native splash changes need a rebuild (`npx expo run:ios`).
- **Finishing a flow resets it:** `/success` leaves through `closeAll()`, which is `router.dismissTo("/")`. `dismissAll()` stopped at the flow's modal, so closing a receipt reopened the review screen. "View details" closes everything first, *then* pushes the receipt, so closing the receipt lands on Home.
- **Every money flow is review → `/pin` → `/success`.** Screens call `useFlowStore.begin(action, origin)` and push `/pin`. `pin.tsx` executes the action and **pushes** `/success` on top (replacing it flashed the review screen). `/success` is a `transparentModal` result card over the dimmed PIN screen: Processing → success/pending, View details, **Make another transaction** (re-opens `origin`), Done. PIN-less actions (Cashpoint redeem) call `complete(result)`. Don't move money anywhere else.
- **Swap/send quotes come from `utils/rates.ts`** (30-second windows), so review, PIN and execution agree within a window. Don't compute rates from `asset.usd` directly in new money code.
- **`expo-media-library`'s new API doesn't exist on web** (its `Asset` class extends `undefined` and kills static rendering). Keep it behind `utils/save-image.ts` with the `.web.ts` twin.
- **SF Symbols must exist in SF Symbols 4 (iOS 16).** `wallet.bifold` rendered blank on iOS 17; `npm run check` fails on newer names.
- **Flags are PNGs** in `assets/flags/` (`npm run flags`); iOS's SVG decoder drops flag-icons' `<marker>`/`<use>` parts.
- **SVG gradient ids must be unique per instance** (`useId`); on web every SVG shares one DOM.
- **Swaps show `PairIcon`**: the FROM coin sits underneath, the TO coin overlaps in front (Mastercard-style).
- **Modal flows use `<FlowScreen>`** (`cancel="x"` puts a working ✕ in the header; native form-sheet ✕ buttons sat in the drag area and didn't respond). Content sets `contentInsetAdjustmentBehavior="never"` and wraps in `KeyboardFrame`, which measures the frame's on-screen Y because RN's KAV under-pads inside sheets.
- **Code cells** (`PinCells`) size themselves to the window width; 11-digit BVN and 12-digit Cashpoint must fit a 375pt phone.
- **Reanimated shared values** are written with `.set()` inside event handlers (React Compiler lint). Animate transforms and opacity only.
- **No callbacks inside worklets** (`useAnimatedStyle`, scroll handlers, animation callbacks): no `.map((x) => …)`, `.filter`, inline arrows. The React Compiler hoists capture-free arrows into plain `_tempN` functions; calling one on the UI runtime aborts Expo Go with `[Worklets] Tried to synchronously call a Remote Function`. Build arrays on the JS side and only read them in the worklet (see `SLIDE_BGS` in `(auth)/intro.tsx`). Hop back to JS with `scheduleOnRN`.
- `Appearance.setColorScheme` doesn't exist on web; keep the guard in the root layout.
- Static `boxShadow` strings and `borderCurve: "continuous"` are fine. Don't use Tailwind or NativeWind here.

## Identity verification (QoreID)
- **Client-only.** `src/services/kyc.ts` asks **Tribe's backend** for a session token at `EXPO_PUBLIC_KYC_SESSION_URL`, then launches `QoreIdSdk.launch(...)`.
- QoreID client credentials must never be in this app. The backend mints `POST https://api.qoreid.com/v1/sessions` and owns the webhook, which is the only trustworthy result.
- **The mock flow** runs automatically in Expo Go, when `EXPO_PUBLIC_KYC_SESSION_URL` is unset, or with `EXPO_PUBLIC_KYC_PROVIDER=mock`.
- The SDK module is `require`d lazily inside the native branch, because a static import crashes Expo Go.
- Product codes, the auth header and webhook handling are `TODO(kyc)`.

## Demo values (never shown in the UI)
- **Transaction PIN:** whatever the user creates at signup. `1234` is the fallback, and what `dev?action=onboard` sets.
- **OTP:** any 6 digits are accepted (no SMS backend).
- **Redeem:** any 12-digit Cashpoint redeems ₦5,000, except `000000000000` (doesn't exist) and `111111111111` (already redeemed).
- **Sign in:** `ada@tribe.africa` / `Tribe@2026`, or the account created on this device. Taken emails, @tags and phone numbers are in `DEMO` (`src/data/seed.ts`).
- **Email codes:** any 4 digits verify, except `0000` (reads as expired).
- **Lock PIN:** whatever was set in setup; `dev?action=onboard` sets `123456`. `dev?action=lock` locks now.
- **Global accounts** (Global payments world) are "approved" 45 s after "Submit for review", while Home is open.

## Verifying UI changes
1. Run `npx tsc --noEmit` and `npx expo lint`. Both must be clean.
2. Deep-link the simulator and screenshot it:
   - `xcrun simctl openurl booted "exp://<lan-ip>:<port>/--/<route>"`
   - `xcrun simctl io booted screenshot out.png`
   - Check every screen in light and dark (`xcrun simctl ui booted appearance dark`).
   - Don't drive the simulator while someone else is using it.
3. The web build (`npx expo start --web --port 8084 --clear`) plus headless Chrome at 393×852 is a non-intrusive second check. The landing page's phone screenshots come from this build (`npm run capture:app` in `../`, 7 shots incl. `send` via `dev?…&demo=send`), so re-run that after visible UI changes.
   - **Restart with `--clear` after edits before trusting screenshots.** Lazy web route chunks were served stale and hid real errors.
   - For native checks, boot a *separate* simulator by UDID and install Expo Go from `~/.expo/ios-simulator-app-cache`.
