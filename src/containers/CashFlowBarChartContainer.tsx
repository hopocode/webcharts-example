import React, { useEffect, useState } from "react";
import CashFlowBarChart from "../components/CashFlowBarChart";
import mockData from "../mockData";

type Props = {
  onWeekClick?: (point: any, key: string, event: any) => void;
  enableWebViewMessaging?: boolean;
};

export default function CashFlowBarChartContainer({
  onWeekClick,
  enableWebViewMessaging = false,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Listen for global native messages (dispatched by window.onNativeMessage in main.tsx)
  useEffect(() => {
    const handler = (e: any) => {
      const msg = e?.detail ?? e;
      if (
        msg &&
        msg.type === "selectWeek" &&
        msg.payload &&
        typeof msg.payload.key === "string"
      ) {
        setSelectedKey(msg.payload.key);
      }
    };
    window.addEventListener("nativeMessage", handler as EventListener);
    return () =>
      window.removeEventListener("nativeMessage", handler as EventListener);
  }, []);
  const handleWeekClick = (point: any, key: string, event: any) => {
    // Forward to provided callback
    if (onWeekClick) onWeekClick(point, key, event);

    // Update local selection for UI
    setSelectedKey(key);

    // If enabled, post message for native webviews / parent frames
    if (enableWebViewMessaging) {
      const message = {
        type: "weekClick",
        payload: { point, key },
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

  return (
    <CashFlowBarChart
      data={mockData}
      onWeekClick={handleWeekClick}
      selectedKey={selectedKey}
    />
  );
}
