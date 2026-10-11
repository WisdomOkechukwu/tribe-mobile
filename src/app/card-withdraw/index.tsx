import { CardMoneyScreen } from "@/screens/cards/move-money";

/** Move dollars off a card back into a wallet → review → PIN. */
export default function CardWithdraw() {
  return <CardMoneyScreen mode="withdraw" />;
}
