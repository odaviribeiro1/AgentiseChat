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

const COLORS = ['#3B82F6', '#3B82F6', '#10B981']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as FunnelDataPoint
  return (
    <div className="bg-[rgba(15,18,35,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-[#F8FAFC]">{d.stage}</p>
      <p className="text-[#CBD5E1]">
        {d.count} run{d.count !== 1 ? 's' : ''} ({d.pct}%)
      </p>
    </div>
  )
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-[#64748B]">
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
          tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'Nunito, Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0A0A0F' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
