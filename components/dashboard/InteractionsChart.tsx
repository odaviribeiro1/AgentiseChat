'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DayData {
  day: string
  comments: number
  dms: number
}

export function InteractionsChart({ data }: { data: DayData[] }) {
  if (!data.length) {
    return <p className="text-sm text-[#A0AEC0] text-center py-8">Nenhum dado disponível ainda.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#718096' }} />
        <YAxis tick={{ fontSize: 12, fill: '#718096' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="comments" name="Comentários" stroke="#2B7FFF" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="dms" name="DMs Enviadas" stroke="#38A169" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
