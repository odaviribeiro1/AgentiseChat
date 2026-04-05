'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DayData {
  day: string
  comments: number
  dms: number
}

export function InteractionsChart({ data }: { data: DayData[] }) {
  if (!data.length) {
    return <p className="text-sm text-[#64748B] text-center py-8">Nenhum dado disponível ainda.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.15)" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A3B8' }} />
        <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="comments" name="Comentários" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="dms" name="DMs Enviadas" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
