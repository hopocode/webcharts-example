import React from "react";
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
  key: string;
};

type Props = {
  data: DataPoint[];
  onWeekClick?: (point: DataPoint, key: string, event: any) => void;
  selectedKey?: string | null;
};

function CashFlowBarChart({ data, onWeekClick, selectedKey }: Props) {
  // Pure presentational component — no state, no effects.
  const handleBarClick = (point: any, _: number, event: any) => {
    const payload = point && point.payload ? point.payload : point;
    const key = (payload && payload.key) || payload.name;
    if (onWeekClick) onWeekClick(payload as DataPoint, key, event);
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
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.key}`}
                fill={entry.key === selectedKey ? "#ff9800" : "#1976d2"}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Export memoized/pure component to avoid unnecessary re-renders
export default React.memo(CashFlowBarChart);
