import "./Arena.css";
import React from "react";
import type { TerritoryControl } from "../../types/chess";
import { MetricInfo } from "../MetricInfo";

interface InfluencePanelProps {
  territory: TerritoryControl;
}

export const InfluencePanel: React.FC<InfluencePanelProps> = ({ territory }) => {
  const { center_control: center, total_influence: total } = territory;
  return (
    <div className="influence-panel" aria-label="Square influence summary">
      <div className="influence-row">
        <span className="influence-side">
          ♔ <span className="num">{center.white_percent}%</span>
        </span>
        <span className="influence-title">
          Centre control (d4 · e4 · d5 · e5)
          <MetricInfo metric="centreControl" />
        </span>
        <span className="influence-side">
          <span className="num">{center.black_percent}%</span> ♚
        </span>
      </div>
      <div className="influence-split">
        <span className="influence-split__white" style={{ width: `${center.white_percent}%` }} />
      </div>
      <div className="influence-legend">
        <span><i className="swatch swatch--white" /> White <span className="num">{total.white_squares}</span></span>
        <span><i className="swatch swatch--contested" /> Contested <span className="num">{total.contested_squares}</span></span>
        <span><i className="swatch swatch--black" /> Black <span className="num">{total.black_squares}</span></span>
      </div>
    </div>
  );
};
