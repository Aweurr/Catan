import type { DevCardType } from "@catan/game";
import { DEV_CARD_ICON, DEV_CARD_LABEL } from "../theme";

interface Props {
  devCards: DevCardType[];
  devCardsBoughtThisTurn: DevCardType[];
}

const ORDER: DevCardType[] = ["knight", "roadBuilding", "yearOfPlenty", "monopoly", "victoryPoint"];

export default function MyDevCards({ devCards, devCardsBoughtThisTurn }: Props) {
  const all = [...devCards, ...devCardsBoughtThisTurn];
  if (all.length === 0) return null;

  const counts = new Map<DevCardType, number>();
  for (const card of all) counts.set(card, (counts.get(card) ?? 0) + 1);

  return (
    <div className="my-dev-cards">
      {ORDER.filter((type) => counts.has(type)).map((type) => (
        <div key={type} className="dev-card-face" title={DEV_CARD_LABEL[type]}>
          <span className="dev-card-face-icon">{DEV_CARD_ICON[type]}</span>
          <span className="dev-card-face-label">{DEV_CARD_LABEL[type]}</span>
          <span className="dev-card-face-count">{counts.get(type)}</span>
        </div>
      ))}
    </div>
  );
}
