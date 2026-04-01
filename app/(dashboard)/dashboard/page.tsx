import { createServiceClient } from '@/lib/supabase/server'
import { Activity, Users, Send, CheckCircle2, Bot } from 'lucide-react'
import { FunnelChart, type FunnelDataPoint } from '@/components/dashboard/FunnelChart'

export default async function DashboardPage() {
  const supabase = createServiceClient()

  // Buscar conta
  const { data: accounts } = await supabase.from('accounts').select('*').limit(1)
  const accountId = accounts?.[0]?.id

  if (!accountId) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col">
        <h1 className="text-2xl font-bold text-[#1A202C] mb-2">Bem-vindo ao Agentise Chat</h1>
        <p className="text-[#718096]">Comece configurando sua conta Instagram.</p>
      </div>
    )
  }

  // KPI: Total Contacts
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)

  // KPI: Active Windows
  const { count: activeWindows } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .gt('window_expires_at', new Date().toISOString())

  // KPI: Total Messages (Outbound)
  const { count: totalOutbound } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('direction', 'outbound')

  // IDs das automações da conta (necessário para filtrar automation_runs)
  const { data: automations } = await supabase
    .from('automations')
    .select('id')
    .eq('account_id', accountId)

  const automationIds = automations?.map((a) => a.id) ?? []

  // KPI + Funil: contagem de runs por status
  let totalStarts = 0
  let activeRuns = 0
  let completedRuns = 0

  if (automationIds.length > 0) {
    const [{ count: starts }, { count: active }, { count: completed }] = await Promise.all([
      supabase
        .from('automation_runs')
        .select('*', { count: 'exact', head: true })
        .in('automation_id', automationIds),
      supabase
        .from('automation_runs')
        .select('*', { count: 'exact', head: true })
        .in('automation_id', automationIds)
        .in('status', ['running', 'waiting_reply']),
      supabase
        .from('automation_runs')
        .select('*', { count: 'exact', head: true })
        .in('automation_id', automationIds)
        .eq('status', 'completed'),
    ])
    totalStarts   = starts   ?? 0
    activeRuns    = active   ?? 0
    completedRuns = completed ?? 0
  }

  // Funil de conversão com dados reais
  const midpoint   = completedRuns + activeRuns
  const midpctRaw  = totalStarts > 0 ? (midpoint / totalStarts) * 100 : 0
  const compPctRaw = totalStarts > 0 ? (completedRuns / totalStarts) * 100 : 0

  const funnelData: FunnelDataPoint[] = [
    { stage: 'Iniciaram',      count: totalStarts,   pct: 100 },
    { stage: 'Em Progresso',   count: midpoint,      pct: Math.round(midpctRaw) },
    { stage: 'Concluídas',     count: completedRuns, pct: Math.round(compPctRaw) },
  ]

  // Activity Feed
  const { data: recentRuns } = await supabase
    .from('automation_runs')
    .select(`
      id,
      status,
      started_at,
      automation:automations(name)
    `)
    .in('automation_id', automationIds.length > 0 ? automationIds : ['00000000-0000-0000-0000-000000000000'])
    .order('started_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1A202C]">Dashboard</h1>
        <p className="text-sm text-[#718096] mt-1">Visão geral do desempenho do seu agente de conversão.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 flex flex-col hover:border-[#2B7FFF] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#718096]">Base Total de Leads</h3>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1A202C]">{totalContacts || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 flex flex-col hover:border-[#38A169] transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-[#DEF7EC] opacity-50 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#718096]">Janelas 24h Ativas</h3>
            <div className="w-8 h-8 rounded-lg bg-[#DEF7EC] text-[#38A169] flex items-center justify-center relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></span>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1A202C]">{activeWindows || 0}</p>
          <p className="text-xs text-[#38A169] font-medium mt-1 leading-none">Prontos p/ Broadcast</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 flex flex-col hover:border-[#805AD5] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#718096]">Mensagens Enviadas</h3>
            <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] text-[#805AD5] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1A202C]">{totalOutbound || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 flex flex-col hover:border-[#D69E2E] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#718096]">Automações Concluídas</h3>
            <div className="w-8 h-8 rounded-lg bg-[#FFFAF0] text-[#D69E2E] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1A202C]">{completedRuns}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funil de Conversão */}
        <div className="lg:col-span-2 bg-white flex flex-col rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-[#1A202C]">Funil de Conversão do Bot</h3>
            {totalStarts > 0 && (
              <span className="text-xs text-[#718096]">{totalStarts} execuções totais</span>
            )}
          </div>
          <FunnelChart data={funnelData} />
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col h-[340px]">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#1A202C]">Atividades Recentes</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {(!recentRuns || recentRuns.length === 0) ? (
              <div className="text-sm text-[#A0AEC0] text-center mt-10">Nenhuma atividade recente.</div>
            ) : recentRuns.map((run: any) => (
              <div key={run.id} className="flex gap-4 items-start pb-5 border-b border-[#E2E8F0] last:border-0 last:pb-0">
                <div className={`p-2 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-[#DEF7EC] text-[#38A169]' : 'bg-[#EBF3FF] text-[#2B7FFF]'}`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className="-mt-1">
                  <p className="text-sm text-[#1A202C] font-semibold leading-tight">
                    {(run.automation as any)?.name}
                  </p>
                  <p className="text-xs text-[#718096] mt-1">
                    {run.status === 'completed'
                      ? 'Finalizado com sucesso'
                      : run.status === 'waiting_reply'
                      ? 'Aguardando usuário'
                      : run.status}
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
