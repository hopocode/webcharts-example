import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  const handleBarClick = (point: any, index: number, event: any) => {
    // point may come wrapped by recharts; try to surface useful info
    const payload = point && point.payload ? point.payload : point;
    //console.log("CashFlowBarChart - bar clicked", { payload, index, event });
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
          <Bar dataKey="value" fill="#1976d2" onClick={handleBarClick} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
