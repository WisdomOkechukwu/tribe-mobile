import { router } from "expo-router";
import { CommonActions, StackActions } from "expo-router/react-navigation";

/**
 * Leaving a finished money flow without a trip Home. The root stack knows exactly what sits on
 * top of the screen the flow started from (Cards tab, an asset page, Vault…): the flow's modal,
 * /pin and /success. We pop just those, so you land back where you were.
 */

/** Root routes that belong to a money flow (the flow modals, the PIN pad and the result card). */
const FLOW_ROUTES = new Set(["send", "swap", "cashpoint", "bill", "gift", "recurring", "card-fund", "card-withdraw", "card-new", "referral-withdraw", "add-currency", "setup", "pin", "success"]);

type Route = { key: string; name: string; params?: object; state?: NavState };
type NavState = { key: string; index?: number; routes: Route[] };
/** The bits of a navigation object we use (the root stack's, from /success). */
type Action = { type: string; payload?: object; source?: string; target?: string };
type Nav = { getState: () => unknown; dispatch: (action: Action) => void };

/** How many routes on top of the root stack belong to the flow. */
function trailing(state: NavState) {
  let n = 0;
  for (let i = state.routes.length - 1; i >= 0 && FLOW_ROUTES.has(state.routes[i].name); i--) n++;
  return n;
}

/** The flow's own modal (the deepest flow route with a stack inside), and where it sits. */
function flowModal(state: NavState) {
  const start = state.routes.length - trailing(state);
  for (let i = start; i < state.routes.length; i++) {
    const r = state.routes[i];
    if (r.state?.routes?.length) return { route: r, index: i };
  }
  return null;
}

/** Close the flow (and /pin, /success) and land on the screen it started from. */
export function leaveFlow(nav: Nav) {
  const state = nav.getState() as NavState;
  const n = trailing(state);
  if (n > 0 && n < state.routes.length) nav.dispatch({ ...StackActions.pop(n), target: state.key });
  else router.replace("/");
}

/** "Make another transaction" makes sense: there's a flow with a real first screen to go back to. */
export function canRestart(nav: Nav) {
  const m = flowModal(nav.getState() as NavState);
  // opening a currency is a one-off: its funding step has nothing to "make another" of
  return !!m && m.route.name !== "add-currency" && m.route.state!.routes[0]?.name !== "review";
}

/**
 * Back to the start of the same flow, fresh: pop /pin and /success off the flow's modal, then
 * reset the modal's stack to its first screen (same params: sell stays sell, airtime stays
 * airtime) with a new key, so it remounts empty.
 */
export function restartFlow(nav: Nav) {
  const state = nav.getState() as NavState;
  const m = flowModal(state);
  if (!m) return leaveFlow(nav);
  const above = state.routes.length - 1 - m.index;
  if (above > 0) nav.dispatch({ ...StackActions.pop(above), target: state.key });
  const first = m.route.state!.routes[0];
  nav.dispatch({ ...CommonActions.reset({ index: 0, routes: [{ name: first.name, params: first.params }] }), target: m.route.state!.key });
}
