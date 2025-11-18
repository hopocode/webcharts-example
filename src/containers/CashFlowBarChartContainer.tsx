import React from "react";
import CashFlowBarChart from "../components/CashFlowBarChart";
import mockData from "../mockData";

type Props = {
  onWeekClick?: (point: any, index: number, event: any) => void;
};

export default function CashFlowBarChartContainer({ onWeekClick }: Props) {
  const handleWeekClick = (point: any, index: number, event: any) => {
    // console.log(
    //   "CashFlowBarChartContainer - week clicked",
    //   point,
    //   index,
    //   event
    // );
    if (onWeekClick) onWeekClick(point, index, event);
  };

  return <CashFlowBarChart data={mockData} onWeekClick={handleWeekClick} />;
}
