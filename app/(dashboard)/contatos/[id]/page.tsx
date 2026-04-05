import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, User, ShieldBan, ShieldCheck, Mail, Ban, CheckCircle2 } from 'lucide-react'
import { isFuture, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { revalidatePath } from 'next/cache'
import { TagManager } from '@/components/contacts/tag-manager'

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

  const [messagesResult, runsResult] = await Promise.all([
    supabase.from('messages').select('*').eq('contact_id', contact.id).order('sent_at', { ascending: true }),
    supabase.from('automation_runs').select('*, automations(name)').eq('contact_id', contact.id).order('started_at', { ascending: false }).limit(10),
  ])
  const messages = messagesResult.data
  const runs = runsResult.data

  const inWindow = contact.window_expires_at ? isFuture(new Date(contact.window_expires_at)) : false

  async function toggleOptOut() {
    'use server'
    const db = createServiceClient()
    await db.from('contacts').update({ opted_out: !contact?.opted_out }).eq('id', params.id)
    revalidatePath(`/contatos/${params.id}`)
  }

  async function toggleBlock() {
    'use server'
    const db = createServiceClient()
    await db.from('contacts').update({ is_blocked: !contact?.is_blocked }).eq('id', params.id)
    revalidatePath(`/contatos/${params.id}`)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contatos" className="p-2 bg-[rgba(15,18,35,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0F1223] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          {contact.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.profile_pic_url} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">@{contact.username}</h1>
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
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8]">
                  <span className="h-2 w-2 rounded-full bg-[rgba(59,130,246,0.2)]"></span>
                  Janela Inativa
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <form action={toggleBlock}>
            <button
              type="submit"
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border ${
                contact.is_blocked
                  ? 'bg-[rgba(239,68,68,0.12)] border-[#EF4444]/20 text-[#EF4444]'
                  : 'bg-[rgba(15,18,35,0.6)] border-[rgba(59,130,246,0.15)] text-[#94A3B8] hover:bg-[#0F1223]'
              }`}
            >
              {contact.is_blocked ? <><CheckCircle2 className="w-4 h-4" /> Desbloquear</> : <><Ban className="w-4 h-4" /> Bloquear</>}
            </button>
          </form>
          <form action={toggleOptOut}>
            <button
              type="submit"
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border ${
                contact.opted_out
                  ? 'bg-[rgba(245,158,11,0.12)] border-[#F59E0B]/20 text-[#F59E0B]'
                  : 'bg-[rgba(15,18,35,0.6)] border-[rgba(59,130,246,0.15)] text-[#94A3B8] hover:bg-[#0F1223]'
              }`}
            >
              {contact.opted_out ? <><ShieldCheck className="w-4 h-4" /> Reativar</> : <><ShieldBan className="w-4 h-4" /> Opt-out</>}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider mb-4 border-b border-[rgba(59,130,246,0.15)] pb-2">Sobre o Lead</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="text-[#64748B] block">Capturado em</span>
                <span className="text-[#F8FAFC] font-semibold">{format(new Date(contact.created_at || new Date()), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
              </li>
              <li>
                <span className="text-[#64748B] block">ID Instagram</span>
                <span className="text-[#F8FAFC] font-mono text-xs">{contact.instagram_user_id}</span>
              </li>
              <li>
                <TagManager contactId={contact.id} tags={(contact.tags as string[]) ?? []} />
              </li>
            </ul>
          </div>

          {/* Histórico de Automações */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider mb-4 border-b border-[rgba(59,130,246,0.15)] pb-2">Automações</h3>
            {runs && runs.length > 0 ? (
              <ul className="space-y-2">
                {runs.map((run: any) => (
                  <li key={run.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#F8FAFC] font-medium truncate max-w-[140px]">
                      {run.automations?.name ?? 'Automação'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        run.status === 'completed' ? 'bg-[rgba(16,185,129,0.12)] text-[#10B981]' :
                        run.status === 'failed' ? 'bg-[rgba(239,68,68,0.12)] text-[#EF4444]' :
                        run.status === 'waiting_reply' ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]' :
                        'bg-[#0F1223] text-[#94A3B8]'
                      }`}>
                        {run.status}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {format(new Date(run.started_at || run.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#64748B] italic">Nenhuma automação executada</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass-card overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-[rgba(59,130,246,0.15)] bg-[#0F1223] flex items-center gap-2 text-[#CBD5E1]">
              <Mail className="w-4 h-4" />
              <h3 className="text-sm font-bold">Histórico de Mensagens</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0F]">
              {(!messages || messages.length === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-[#64748B]">
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
                          ? 'bg-[#3B82F6] text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-[rgba(15,18,35,0.6)] text-[#F8FAFC] rounded-2xl rounded-tl-sm border border-[rgba(59,130,246,0.15)]'
                      }`}>
                        {contentText || <span className="italic text-white/70">[Mensagem Multimídia]</span>}
                      </div>
                      <span className="text-[10px] text-[#64748B] mt-1 px-1">
                        {format(new Date(msg.sent_at || Date.now()), "HH:mm", { locale: ptBR })} 
                        {msg.type === 'quick_reply' && ' (Quick Reply)'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
            {/* Input Fake just to maintain aesthetic */}
            <div className="p-3 bg-[rgba(15,18,35,0.6)] border-t border-[rgba(59,130,246,0.15)]">
              <div className="w-full bg-[#0F1223] border border-[rgba(59,130,246,0.15)] rounded-full px-4 py-2.5 text-sm outline-none text-[#64748B] cursor-not-allowed">
                Interações limitadas à automação
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
