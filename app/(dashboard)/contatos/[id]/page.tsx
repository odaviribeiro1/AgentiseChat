import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, User, ShieldBan, ShieldCheck, Mail } from 'lucide-react'
import { isFuture, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { revalidatePath } from 'next/cache'

export default async function ContactProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!contact) {
    return <div>Contato não encontrado.</div>
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contact.id)
    .order('sent_at', { ascending: true })

  const inWindow = contact.window_expires_at ? isFuture(new Date(contact.window_expires_at)) : false

  async function toggleOptOut() {
    'use server'
    const db = createServiceClient()
    await db.from('contacts').update({ opted_out: !contact?.opted_out }).eq('id', params.id)
    revalidatePath(`/contatos/${params.id}`)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contatos" className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-[#718096] hover:text-[#1A202C] hover:bg-[#F8F9FB] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          {contact.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.profile_pic_url} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#1A202C]">@{contact.username}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {inWindow ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#03543F]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Janela 24h Ativa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#718096]">
                  <span className="h-2 w-2 rounded-full bg-[#CBD5E0]"></span>
                  Janela Inativa
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ml-auto">
          <form action={toggleOptOut}>
            <button 
              type="submit"
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border ${
                contact.opted_out 
                  ? 'bg-[#FFF5F5] border-[#E53E3E]/20 text-[#E53E3E] hover:bg-[#E53E3E] hover:text-white' 
                  : 'bg-white border-[#E2E8F0] text-[#718096] hover:bg-[#F8F9FB] hover:text-[#1A202C]'
              }`}
            >
              {contact.opted_out ? (
                <><ShieldCheck className="w-4 h-4" /> Desbloquear Contato</>
              ) : (
                <><ShieldBan className="w-4 h-4" /> Bloquear Mensagens (Opt-out)</>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-2">Sobre o Lead</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="text-[#A0AEC0] block">Capturado em</span>
                <span className="text-[#1A202C] font-semibold">{format(new Date(contact.created_at || new Date()), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
              </li>
              <li>
                <span className="text-[#A0AEC0] block">ID Instagram</span>
                <span className="text-[#1A202C] font-mono text-xs">{contact.instagram_user_id}</span>
              </li>
              <li>
                <span className="text-[#A0AEC0] block mb-1">Tags (Segmentação)</span>
                <div className="flex flex-wrap gap-1">
                  {contact.tags && contact.tags.length > 0 ? contact.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF3FF] text-[#2B7FFF] uppercase border border-[#2B7FFF]/20">
                      {t}
                    </span>
                  )) : (
                    <span className="text-[#718096] italic text-xs">Sem tags</span>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8F9FB] flex items-center gap-2 text-[#4A5568]">
              <Mail className="w-4 h-4" />
              <h3 className="text-sm font-bold">Histórico de Mensagens</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0F2F5]">
              {(!messages || messages.length === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-[#A0AEC0]">
                  Nenhuma mensagem registrada.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound'
                  let contentText = ''
                  if (typeof msg.content === 'string') {
                    contentText = msg.content
                  } else if (msg.content && typeof msg.content === 'object' && 'text' in (msg.content as any)) {
                    contentText = (msg.content as any).text
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2 text-sm shadow-sm ${
                        isOutbound 
                          ? 'bg-[#2B7FFF] text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-white text-[#1A202C] rounded-2xl rounded-tl-sm border border-[#E2E8F0]'
                      }`}>
                        {contentText || <span className="italic text-white/70">[Mensagem Multimídia]</span>}
                      </div>
                      <span className="text-[10px] text-[#A0AEC0] mt-1 px-1">
                        {format(new Date(msg.sent_at || Date.now()), "HH:mm", { locale: ptBR })} 
                        {msg.type === 'quick_reply' && ' (Quick Reply)'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
            {/* Input Fake just to maintain aesthetic */}
            <div className="p-3 bg-white border-t border-[#E2E8F0]">
              <div className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-full px-4 py-2.5 text-sm outline-none text-[#A0AEC0] cursor-not-allowed">
                Interações limitadas à automação
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
