import React from "react";
import CashFlowBarChart from "../components/CashFlowBarChart";
import mockData from "../mockData";

type Props = {
  onWeekClick?: (point: any, index: number, event: any) => void;
  enableWebViewMessaging?: boolean;
};

export default function CashFlowBarChartContainer({
  onWeekClick,
  enableWebViewMessaging = false,
}: Props) {
  const handleWeekClick = (point: any, index: number, event: any) => {
    // Forward to provided callback
    if (onWeekClick) onWeekClick(point, index, event);

    // If enabled, post message for native webviews / parent frames
    if (enableWebViewMessaging) {
      const message = {
        type: "weekClick",
        payload: { point, index },
      };
      try {
        // React Native WebView
        // @ts-ignore
        if (
          window &&
          (window as any).ReactNativeWebView &&
          typeof (window as any).ReactNativeWebView.postMessage === "function"
        ) {
          // React Native expects a string
          (window as any).ReactNativeWebView.postMessage(
            JSON.stringify(message)
          );
        }
      } catch (e) {
        // ignore
      }

      try {
        // Parent window (iframe embedding)
        if (
          window &&
          window.parent &&
          window.parent !== window &&
          typeof window.parent.postMessage === "function"
        ) {
          window.parent.postMessage(message, "*");
        }
      } catch (e) {
        // ignore
      }
    }
  };

  return <CashFlowBarChart data={mockData} onWeekClick={handleWeekClick} />;
}
