import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Megaphone, Clock, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function BroadcastPage() {
  const supabase = createServiceClient()

  // Buscar conta base
  const { data: accounts } = await supabase.from('accounts').select('*').limit(1)
  const accountId = accounts?.[0]?.id

  if (!accountId) {
    return <div>Crie uma conta primeiro</div>
  }

  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'sent': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(16,185,129,0.12)] text-[#03543F]"><CheckCircle2 className="w-3 h-3"/> Concluído</span>
      case 'sending': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(59,130,246,0.12)] text-[#3B82F6] animate-pulse"><PlayCircle className="w-3 h-3"/> Enviando...</span>
      case 'scheduled': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(245,158,11,0.12)] text-[#F59E0B]"><Clock className="w-3 h-3"/> Agendado</span>
      case 'failed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(239,68,68,0.12)] text-[#EF4444]"><AlertCircle className="w-3 h-3"/> Falhou</span>
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F1223] text-[#CBD5E1]">Rascunho</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Disparos em Massa (Broadcast)</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Envie mensagens seguras que respeitam a janela de 24h da Meta.
          </p>
        </div>
        <Link
          href="/broadcast/novo"
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Disparo
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        {(!broadcasts || broadcasts.length === 0) ? (
          <div className="px-6 py-12 text-center text-[#94A3B8] flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center mb-4">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">Nenhum disparo criado</h3>
            <p className="text-sm max-w-sm">
              Use campanhas de Broadcast para reengajar leads convertidos que interagiram nas últimas 24 horas.
            </p>
            <Link
              href="/broadcast/novo"
              className="mt-6 font-semibold text-[#3B82F6] hover:underline"
            >
              Criar o primeiro disparo &rarr;
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-[#CBD5E1]">
            <thead className="text-xs text-[#94A3B8] uppercase bg-[#0F1223] border-b border-[rgba(59,130,246,0.15)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Nome da Campanha</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Segmentação</th>
                <th className="px-6 py-4 font-semibold">Data / Agendamento</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((br) => (
                <tr key={br.id} className="border-b border-[rgba(59,130,246,0.15)] hover:bg-[#0F1223] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#F8FAFC]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      {br.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(br.status)}
                  </td>
                  <td className="px-6 py-4">
                    {br.segment_tags && br.segment_tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {br.segment_tags.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(59,130,246,0.15)] text-[#CBD5E1] uppercase">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748B] italic">Todos na Janela 24h</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#94A3B8]">
                    {br.scheduled_at 
                      ? format(new Date(br.scheduled_at), "dd 'de' MMM, HH:mm", { locale: ptBR }) 
                      : format(new Date(br.created_at || new Date()), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/broadcast/${br.id}`} className="text-[#3B82F6] hover:text-[#2563EB] font-semibold">
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
