import { useState } from "react";
import type { Resource, ResourceHand } from "@catan/game";
import { RESOURCES } from "@catan/game";
import { RESOURCE_LABEL } from "../theme";

interface Props {
  hand: ResourceHand;
  required: number;
  onSubmit: (discard: Partial<ResourceHand>) => void;
}

export default function DiscardModal({ hand, required, onSubmit }: Props) {
  const [picked, setPicked] = useState<Partial<ResourceHand>>({});
  const total = Object.values(picked).reduce((a, b) => a + (b ?? 0), 0);

  function change(resource: Resource, delta: number) {
    setPicked((prev) => {
      const current = prev[resource] ?? 0;
      const next = Math.max(0, Math.min(hand[resource], current + delta));
      return { ...prev, [resource]: next };
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Défausse obligatoire</h2>
        <p>
          Un 7 a été tiré : tu dois défausser {required} carte(s) ({total}/{required} sélectionnée(s)).
        </p>
        <div className="resource-picker">
          {RESOURCES.map((resource) => (
            <div key={resource} className="resource-row">
              <span>{RESOURCE_LABEL[resource]}</span>
              <button onClick={() => change(resource, -1)}>-</button>
              <span>{picked[resource] ?? 0}</span>
              <button onClick={() => change(resource, 1)} disabled={(picked[resource] ?? 0) >= hand[resource]}>
                +
              </button>
              <span className="hand-count">/ {hand[resource]}</span>
            </div>
          ))}
        </div>
        <button disabled={total !== required} onClick={() => onSubmit(picked)}>
          Défausser
        </button>
      </div>
    </div>
  );
}
