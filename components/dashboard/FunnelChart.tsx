'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface FunnelDataPoint {
  stage: string
  count: number
  pct: number
}

interface FunnelChartProps {
  data: FunnelDataPoint[]
}

const COLORS = ['#2B7FFF', '#3182ce', '#38A169']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as FunnelDataPoint
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-[#1A202C]">{d.stage}</p>
      <p className="text-[#4A5568]">
        {d.count} run{d.count !== 1 ? 's' : ''} ({d.pct}%)
      </p>
    </div>
  )
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-[#A0AEC0]">
        Nenhum dado disponível ainda.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="stage"
          width={140}
          tick={{ fill: '#4A5568', fontSize: 13, fontFamily: 'Nunito, Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F0F2F5' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
