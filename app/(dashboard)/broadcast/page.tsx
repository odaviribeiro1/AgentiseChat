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
      case 'sent': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DEF7EC] text-[#03543F]"><CheckCircle2 className="w-3 h-3"/> Concluído</span>
      case 'sending': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF3FF] text-[#2B7FFF] animate-pulse"><PlayCircle className="w-3 h-3"/> Enviando...</span>
      case 'scheduled': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#D97706]"><Clock className="w-3 h-3"/> Agendado</span>
      case 'failed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF5F5] text-[#E53E3E]"><AlertCircle className="w-3 h-3"/> Falhou</span>
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F8F9FB] text-[#4A5568]">Rascunho</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Disparos em Massa (Broadcast)</h1>
          <p className="text-sm text-[#718096] mt-1">
            Envie mensagens seguras que respeitam a janela de 24h da Meta.
          </p>
        </div>
        <Link
          href="/broadcast/novo"
          className="bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Disparo
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        {(!broadcasts || broadcasts.length === 0) ? (
          <div className="px-6 py-12 text-center text-[#718096] flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center mb-4">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1A202C] mb-1">Nenhum disparo criado</h3>
            <p className="text-sm max-w-sm">
              Use campanhas de Broadcast para reengajar leads convertidos que interagiram nas últimas 24 horas.
            </p>
            <Link
              href="/broadcast/novo"
              className="mt-6 font-semibold text-[#2B7FFF] hover:underline"
            >
              Criar o primeiro disparo &rarr;
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-[#4A5568]">
            <thead className="text-xs text-[#718096] uppercase bg-[#F8F9FB] border-b border-[#E2E8F0]">
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
                <tr key={br.id} className="border-b border-[#E2E8F0] hover:bg-[#F8F9FB] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1A202C]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center">
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
                          <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E2E8F0] text-[#4A5568] uppercase">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#A0AEC0] italic">Todos na Janela 24h</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#718096]">
                    {br.scheduled_at 
                      ? format(new Date(br.scheduled_at), "dd 'de' MMM, HH:mm", { locale: ptBR }) 
                      : format(new Date(br.created_at || new Date()), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/broadcast/${br.id}`} className="text-[#2B7FFF] hover:text-[#1A6FEF] font-semibold">
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
