import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type DataPoint = {
  name: string;
  value: number;
};

type Props = {
  data: DataPoint[];
  onWeekClick?: (point: DataPoint, index: number, event: any) => void;
};

export default function CashFlowBarChart({ data, onWeekClick }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Listen for global native messages dispatched by window.onNativeMessage
  // Expect message shape: { type: 'selectWeek', payload: { index: number } }
  useEffect(() => {
    const handler = (e: any) => {
      const msg = e?.detail ?? e;
      if (
        msg &&
        msg.type === "selectWeek" &&
        msg.payload &&
        typeof msg.payload.index === "number"
      ) {
        setSelectedIndex(msg.payload.index);
      }
    };
    window.addEventListener("nativeMessage", handler as EventListener);
    return () =>
      window.removeEventListener("nativeMessage", handler as EventListener);
  }, []);

  const handleBarClick = (point: any, index: number, event: any) => {
    // point may come wrapped by recharts; try to surface useful info
    const payload = point && point.payload ? point.payload : point;
    // set selected index locally so UI highlights immediately
    setSelectedIndex(index);
    if (onWeekClick) {
      // Ensure payload matches DataPoint shape
      onWeekClick(payload as DataPoint, index, event);
    }
  };

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value: number) => `${value} €`} />
          <Bar dataKey="value" onClick={handleBarClick}>
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={i === selectedIndex ? "#ff9800" : "#1976d2"}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
