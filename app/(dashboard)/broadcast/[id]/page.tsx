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
      case 'sent': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#DEF7EC] text-[#03543F]"><CheckCircle2 className="w-4 h-4"/> Concluído</span>
      case 'sending': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#EBF3FF] text-[#2B7FFF] animate-pulse"><PlayCircle className="w-4 h-4"/> Enviando...</span>
      case 'scheduled': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FFFBEB] text-[#D97706]"><Clock className="w-4 h-4"/> Agendado</span>
      case 'failed': return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FFF5F5] text-[#E53E3E]"><AlertCircle className="w-4 h-4"/> Falhou</span>
      default: return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#F8F9FB] text-[#4A5568]">Rascunho</span>
    }
  }

  const msgConfig = broadcast.message_config as any
  const isCta = msgConfig.type === 'cta_button'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/broadcast" className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-[#718096] hover:text-[#1A202C] hover:bg-[#F8F9FB] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">{broadcast.name}</h1>
          <p className="text-sm text-[#718096] mt-1">Visão geral do disparo</p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(broadcast.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider mb-4">Mensagem</h3>
            
            <div className="bg-[#F0F2F5] p-4 rounded-xl max-w-sm mb-4">
              <div className="bg-white p-3 rounded-2xl rounded-tl-sm text-sm text-[#1A202C] shadow-sm whitespace-pre-wrap">
                {msgConfig.text || '[Sem texto]'}
              </div>
              {isCta && (
                <div className="mt-2 bg-white border border-[#2B7FFF] text-[#2B7FFF] px-3 py-1.5 rounded-full text-xs font-semibold text-center cursor-default">
                  {msgConfig.button?.title || 'Botão'}
                </div>
              )}
            </div>

            <div className="text-xs text-[#718096] space-y-1">
              <p>🎯 <strong>Tags Alvo:</strong> {broadcast.segment_tags && broadcast.segment_tags.length ? broadcast.segment_tags.join(', ') : 'Todos na janela de 24h'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider mb-4">Metadados</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[#A0AEC0] block mb-0.5">Criado em</span>
                <span className="text-[#1A202C] font-semibold">{format(new Date(broadcast.created_at || new Date()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              
              {broadcast.started_at && (
                <div>
                  <span className="text-[#A0AEC0] block mb-0.5">Iniciado em</span>
                  <span className="text-[#1A202C] font-semibold">{format(new Date(broadcast.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}

              {broadcast.sent_at && (
                <div>
                  <span className="text-[#03543F] block mb-0.5">Concluído em</span>
                  <span className="text-[#1A202C] font-semibold">{format(new Date(broadcast.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
