import { createServiceClient } from '@/lib/supabase/server'
import { Activity, Users, Send, CheckCircle2, Bot, Zap, AlertTriangle, Info } from 'lucide-react'
import { FunnelChart, type FunnelDataPoint } from '@/components/dashboard/FunnelChart'
import { InteractionsChart } from '@/components/dashboard/InteractionsChart'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = createServiceClient()

  const { data: accounts } = await supabase.from('accounts').select('*').limit(1)
  const account = accounts?.[0]
  const accountId = account?.id

  if (!accountId) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Bem-vindo ao Agentise Chat</h1>
        <p className="text-[#94A3B8]">Comece configurando sua conta Instagram em <a href="/conexao" className="text-[#3B82F6] font-semibold hover:underline">Conexão</a>.</p>
      </div>
    )
  }

  // Queries em paralelo
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7).toISOString()
  const thirtyDaysAgo = subDays(now, 30).toISOString()

  const [
    { count: totalContacts },
    { count: activeWindows },
    { count: totalOutbound },
    { data: automations },
    { count: broadcastsSent },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('account_id', accountId),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gt('window_expires_at', now.toISOString()),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('direction', 'outbound'),
    supabase.from('automations').select('id, name, status, total_runs').eq('account_id', accountId),
    supabase.from('broadcasts').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'sent').gte('sent_at', thirtyDaysAgo),
  ])

  const activeAutomations = automations?.filter(a => a.status === 'active') ?? []
  const automationIds = automations?.map(a => a.id) ?? []

  // Runs por status
  let totalStarts = 0, activeRuns = 0, completedRuns = 0
  if (automationIds.length > 0) {
    const [{ count: starts }, { count: active }, { count: completed }] = await Promise.all([
      supabase.from('automation_runs').select('*', { count: 'exact', head: true }).in('automation_id', automationIds),
      supabase.from('automation_runs').select('*', { count: 'exact', head: true }).in('automation_id', automationIds).in('status', ['running', 'waiting_reply']),
      supabase.from('automation_runs').select('*', { count: 'exact', head: true }).in('automation_id', automationIds).eq('status', 'completed'),
    ])
    totalStarts = starts ?? 0
    activeRuns = active ?? 0
    completedRuns = completed ?? 0
  }

  // Runs ultimos 7 dias (para KPI)
  let runsLast7 = 0
  if (automationIds.length > 0) {
    const { count } = await supabase.from('automation_runs').select('*', { count: 'exact', head: true }).in('automation_id', automationIds).gte('started_at', sevenDaysAgo)
    runsLast7 = count ?? 0
  }

  // Funil de conversao
  const midpoint = completedRuns + activeRuns
  const funnelData: FunnelDataPoint[] = [
    { stage: 'Iniciaram', count: totalStarts, pct: 100 },
    { stage: 'Em Progresso', count: midpoint, pct: totalStarts > 0 ? Math.round((midpoint / totalStarts) * 100) : 0 },
    { stage: 'Concluídas', count: completedRuns, pct: totalStarts > 0 ? Math.round((completedRuns / totalStarts) * 100) : 0 },
  ]

  // Funil por automacao (top 5)
  const automationFunnel: Array<{ name: string; runs: number; completed: number; rate: number }> = []
  for (const auto of (automations ?? []).sort((a, b) => (b.total_runs ?? 0) - (a.total_runs ?? 0)).slice(0, 5)) {
    if (!auto.total_runs) continue
    const { count: comp } = await supabase.from('automation_runs').select('*', { count: 'exact', head: true }).eq('automation_id', auto.id).eq('status', 'completed')
    automationFunnel.push({
      name: auto.name,
      runs: auto.total_runs ?? 0,
      completed: comp ?? 0,
      rate: auto.total_runs > 0 ? Math.round(((comp ?? 0) / auto.total_runs) * 100) : 0,
    })
  }

  // Grafico de interacoes (7 dias)
  const chartData: Array<{ day: string; comments: number; dms: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = subDays(now, i)
    const dayStr = format(dayStart, 'dd/MM', { locale: ptBR })
    const dayIso = format(dayStart, 'yyyy-MM-dd')
    const nextDayIso = format(subDays(now, i - 1), 'yyyy-MM-dd')

    const [{ count: comments }, { count: dms }] = await Promise.all([
      supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('event_type', 'comment').gte('received_at', dayIso).lt('received_at', i === 0 ? now.toISOString() : nextDayIso),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('direction', 'outbound').gte('sent_at', dayIso).lt('sent_at', i === 0 ? now.toISOString() : nextDayIso),
    ])
    chartData.push({ day: dayStr, comments: comments ?? 0, dms: dms ?? 0 })
  }

  // Activity Feed
  const { data: recentRuns } = await supabase
    .from('automation_runs')
    .select('id, status, started_at, automation:automations(name)')
    .in('automation_id', automationIds.length > 0 ? automationIds : ['00000000-0000-0000-0000-000000000000'])
    .order('started_at', { ascending: false })
    .limit(10)

  // Alertas
  const alerts: Array<{ type: 'warning' | 'info' | 'error'; message: string }> = []

  if (account.token_expires_at) {
    const daysToExpiry = Math.floor((new Date(account.token_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToExpiry <= 10) {
      alerts.push({ type: 'warning', message: `Token Meta expira em ${daysToExpiry} dias — reconecte em /conexao` })
    }
  }
  if (account.ig_token_expires_at) {
    const igDays = Math.floor((new Date(account.ig_token_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (igDays <= 10) {
      alerts.push({ type: 'warning', message: `Token Instagram (IGAA) expira em ${igDays} dias` })
    }
  }
  if (activeAutomations.length === 0) {
    alerts.push({ type: 'info', message: 'Nenhuma automação ativa — crie uma em Automações' })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Dashboard</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Visão geral do desempenho do seu agente de conversão.</p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
              alert.type === 'warning' ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[#F59E0B]/20' :
              alert.type === 'error' ? 'bg-[rgba(239,68,68,0.12)] text-[#EF4444] border border-[#EF4444]/20' :
              'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] border border-[#3B82F6]/20'
            }`}>
              {alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 hover:border-[#10B981] transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-[rgba(16,185,129,0.12)] opacity-50 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#94A3B8]">Contatos na Janela</h3>
            <div className="w-8 h-8 rounded-lg bg-[rgba(16,185,129,0.12)] text-[#10B981] flex items-center justify-center relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></span>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#F8FAFC]">{activeWindows ?? 0}</p>
          <p className="text-xs text-[#10B981] font-medium mt-1">Elegíveis para broadcast</p>
        </div>

        <div className="glass-card p-6 hover:border-[#3B82F6] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#94A3B8]">Automações Ativas</h3>
            <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#F8FAFC]">{activeAutomations.length}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{(totalContacts ?? 0)} leads na base</p>
        </div>

        <div className="glass-card p-6 hover:border-[#60A5FA] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#94A3B8]">Fluxos Iniciados (7d)</h3>
            <div className="w-8 h-8 rounded-lg bg-[rgba(96,165,250,0.12)] text-[#60A5FA] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#F8FAFC]">{runsLast7}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{totalOutbound ?? 0} DMs enviadas total</p>
        </div>

        <div className="glass-card p-6 hover:border-[#2563EB] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#94A3B8]">Broadcasts (30d)</h3>
            <div className="w-8 h-8 rounded-lg bg-[rgba(37,99,235,0.12)] text-[#2563EB] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#F8FAFC]">{broadcastsSent ?? 0}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{completedRuns} automações concluídas</p>
        </div>
      </div>

      {/* Gráfico de Interações (7 dias) */}
      <div className="glass-card p-6">
        <h3 className="text-base font-bold text-[#F8FAFC] mb-4">Interações — Últimos 7 dias</h3>
        <InteractionsChart data={chartData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funil por Automação */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-base font-bold text-[#F8FAFC] mb-4">Desempenho por Automação</h3>
          {automationFunnel.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#94A3B8] border-b border-[rgba(59,130,246,0.15)]">
                  <th className="pb-3 font-semibold">Automação</th>
                  <th className="pb-3 font-semibold text-center">Disparos</th>
                  <th className="pb-3 font-semibold text-center">Concluídas</th>
                  <th className="pb-3 font-semibold text-right">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {automationFunnel.map(a => (
                  <tr key={a.name} className="border-b border-[rgba(59,130,246,0.15)] last:border-0">
                    <td className="py-3 font-medium text-[#F8FAFC]">{a.name}</td>
                    <td className="py-3 text-center text-[#94A3B8]">{a.runs}</td>
                    <td className="py-3 text-center text-[#10B981]">{a.completed}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.rate >= 50 ? 'bg-[rgba(16,185,129,0.12)] text-[#10B981]' : a.rate >= 20 ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]' : 'bg-[rgba(239,68,68,0.12)] text-[#EF4444]'
                      }`}>
                        {a.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-[#64748B] text-center py-6">Nenhuma automação com execuções ainda.</p>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card flex flex-col h-[380px]">
          <div className="p-4 border-b border-[rgba(59,130,246,0.15)]">
            <h3 className="text-sm font-bold text-[#F8FAFC]">Atividades Recentes</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {(!recentRuns || recentRuns.length === 0) ? (
              <div className="text-sm text-[#64748B] text-center mt-10">Nenhuma atividade recente.</div>
            ) : recentRuns.map((run: any) => (
              <div key={run.id} className="flex gap-4 items-start pb-5 border-b border-[rgba(59,130,246,0.15)] last:border-0 last:pb-0">
                <div className={`p-2 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-[rgba(16,185,129,0.12)] text-[#10B981]' : run.status === 'failed' ? 'bg-[rgba(239,68,68,0.12)] text-[#EF4444]' : 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]'}`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className="-mt-1">
                  <p className="text-sm text-[#F8FAFC] font-semibold leading-tight">{(run.automation as any)?.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {run.status === 'completed' ? 'Concluído' : run.status === 'waiting_reply' ? 'Aguardando resposta' : run.status === 'failed' ? 'Falhou' : run.status}
                    {run.started_at && ` · ${format(new Date(run.started_at), 'dd/MM HH:mm', { locale: ptBR })}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
