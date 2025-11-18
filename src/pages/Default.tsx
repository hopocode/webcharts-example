import React from "react";
import CashFlowBarChart from "../components/CashFlowBarChart";
import mockData from "../mockData";

export default function DefaultPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Ahoj 1</h2>
      <div style={{ marginTop: 20 }}>
        <CashFlowBarChart
          data={mockData}
          onWeekClick={(point, index, event) => {
            console.log("Week clicked2:", point, index, event);
          }}
        />
      </div>
    </div>
  );
}
