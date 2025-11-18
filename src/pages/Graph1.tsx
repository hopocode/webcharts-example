import React from "react";
import CashFlowBarChartContainer from "../containers/CashFlowBarChartContainer";

export function Graph1Page() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Ahoj 2</h2>
      <div style={{ marginTop: 20 }}>
        <CashFlowBarChartContainer
          onWeekClick={(point, index, event) => {
            console.log("Week clicked2:", point, index, event);
          }}
        />
      </div>
    </div>
  );
}
