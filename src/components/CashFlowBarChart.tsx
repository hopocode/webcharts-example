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

  // Listen for native messages that request selecting/highlighting a week
  useEffect(() => {
    const handler = (e: any) => {
      const payload = e?.detail ?? e;
      // payload expected shape: { index: number } or { index: number, ... }
      if (payload && typeof payload.index === "number") {
        setSelectedIndex(payload.index);
      }
    };
    window.addEventListener("selectWeek", handler as EventListener);
    return () =>
      window.removeEventListener("selectWeek", handler as EventListener);
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
