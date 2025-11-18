import React from "react";
import CashFlowBarChartContainer from "../containers/CashFlowBarChartContainer";

export function Graph2Page() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Graph 2 — WebView Ready</h2>
      <p>
        This route is intended to be embedded in a native WebView or iframe.
      </p>
      <div style={{ marginTop: 20 }}>
        <CashFlowBarChartContainer
          enableWebViewMessaging={true}
          onWeekClick={(point, index) => {
            console.log("Graph2 - week clicked:", point, index);
          }}
        />
      </div>
    </div>
  );
}
