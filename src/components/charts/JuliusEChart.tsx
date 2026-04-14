import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface JuliusEChartProps {
  option: EChartsOption;
  className?: string;
  height?: number;
}

export default function JuliusEChart({ option, className, height = 560 }: JuliusEChartProps) {
  return (
    <div className={className}>
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
