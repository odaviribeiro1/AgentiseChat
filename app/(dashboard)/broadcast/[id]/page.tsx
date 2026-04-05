import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, PlayCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function BroadcastDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  
  const { data: broadcast } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!broadcast) {
    return <div>Broadcast não encontrado</div>
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'sent': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[rgba(16,185,129,0.12)] text-[#03543F]"><CheckCircle2 className="w-4 h-4"/> Concluído</span>
      case 'sending': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[rgba(59,130,246,0.12)] text-[#3B82F6] animate-pulse"><PlayCircle className="w-4 h-4"/> Enviando...</span>
      case 'scheduled': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[rgba(245,158,11,0.12)] text-[#F59E0B]"><Clock className="w-4 h-4"/> Agendado</span>
      case 'failed': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[rgba(239,68,68,0.12)] text-[#EF4444]"><AlertCircle className="w-4 h-4"/> Falhou</span>
      default: return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#0F1223] text-[#CBD5E1]">Rascunho</span>
    }
  }

  const msgConfig = broadcast.message_config as any
  const isCta = msgConfig.type === 'cta_button'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/broadcast" className="p-2 bg-[rgba(15,18,35,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0F1223] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">{broadcast.name}</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Visão geral do disparo</p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(broadcast.status)}
        </div>
      </div>

      {/* Métricas de envio */}
      {['sending', 'sent', 'failed'].includes(broadcast.status) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-5 text-center">
            <p className="text-3xl font-bold text-[#F8FAFC]">{broadcast.total_recipients ?? 0}</p>
            <p className="text-sm text-[#94A3B8] mt-1">Destinatários</p>
          </div>
          <div className="glass-card p-5 text-center">
            <p className="text-3xl font-bold text-[#10B981]">{broadcast.total_sent ?? 0}</p>
            <p className="text-sm text-[#94A3B8] mt-1">Enviados</p>
          </div>
          <div className="glass-card p-5 text-center">
            <p className="text-3xl font-bold text-[#EF4444]">{broadcast.total_failed ?? 0}</p>
            <p className="text-sm text-[#94A3B8] mt-1">Falhas</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider mb-4">Mensagem</h3>
            
            <div className="bg-[#0A0A0F] p-4 rounded-xl max-w-sm mb-4">
              <div className="bg-[rgba(15,18,35,0.6)] p-3 rounded-2xl rounded-tl-sm text-sm text-[#F8FAFC] shadow-sm whitespace-pre-wrap">
                {msgConfig.text || '[Sem texto]'}
              </div>
              {isCta && (
                <div className="mt-2 bg-[rgba(15,18,35,0.6)] border border-[#3B82F6] text-[#3B82F6] px-3 py-1.5 rounded-full text-xs font-semibold text-center cursor-default">
                  {msgConfig.button?.title || 'Botão'}
                </div>
              )}
            </div>

            <div className="text-xs text-[#94A3B8] space-y-1">
              <p>🎯 <strong>Tags Alvo:</strong> {broadcast.segment_tags && broadcast.segment_tags.length ? broadcast.segment_tags.join(', ') : 'Todos na janela de 24h'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider mb-4">Metadados</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[#64748B] block mb-0.5">Criado em</span>
                <span className="text-[#F8FAFC] font-semibold">{format(new Date(broadcast.created_at || new Date()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              
              {broadcast.started_at && (
                <div>
                  <span className="text-[#64748B] block mb-0.5">Iniciado em</span>
                  <span className="text-[#F8FAFC] font-semibold">{format(new Date(broadcast.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}

              {broadcast.sent_at && (
                <div>
                  <span className="text-[#03543F] block mb-0.5">Concluído em</span>
                  <span className="text-[#F8FAFC] font-semibold">{format(new Date(broadcast.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
