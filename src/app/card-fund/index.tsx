import { CardMoneyScreen } from "@/screens/cards/move-money";

/** Top up a virtual card in dollars from any balance → review → PIN. */
export default function CardFund() {
  return <CardMoneyScreen mode="fund" />;
}
