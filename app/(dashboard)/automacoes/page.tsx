import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Workflow, Power, PowerOff } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { AutomationActions } from '@/components/automations/AutomationActions'
import { createAutomation } from '@/app/actions/automations'

export default async function AutomationsPage() {
  const supabase = createServiceClient()
  
  // ... (rest of account fetching)
  const { data: accounts } = await supabase.from('accounts').select('*').limit(1)
  const accountId = accounts?.[0]?.id

  if (!accountId) return <div className="p-8">Ocorreu um erro: Nenhuma conta encontrada. Configure sua conexão.</div>

  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  // ... (skip createAutomation since it's above)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Fluxos e Automações</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Crie fluxos de mensagens interativos para converter leads do Instagram.
          </p>
        </div>

        {/* Modal/Dropdown simplificado para o MVP (Form Toggler) */}
        <form action={createAutomation} className="flex gap-2 items-center bg-[rgba(15,18,35,0.6)] p-2 rounded-xl border border-[rgba(59,130,246,0.15)] shadow-sm">
          <input 
            name="name" 
            placeholder="Nome da nova automação..." 
            required
            className="px-3 py-1.5 text-sm outline-none w-56 bg-transparent"
          />
          <button 
            type="submit"
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(!automations || automations.length === 0) ? (
          <div className="col-span-full py-16 text-center text-[#64748B] border-2 border-dashed border-[rgba(59,130,246,0.15)] rounded-xl flex flex-col items-center">
            <div className="w-12 h-12 bg-[#0F1223] rounded-full flex items-center justify-center text-[#94A3B8] mb-4">
              <Workflow className="w-6 h-6" />
            </div>
            <p className="font-semibold text-[#F8FAFC] mb-1 text-lg">Nenhuma automação criada</p>
            <p className="text-sm max-w-sm">Dê um nome no campo acima e comece a montar o seu primeiro robô de atendimento.</p>
          </div>
        ) : (
          automations.map(auto => (
            <div key={auto.id} className="relative group">
              {/* Menu de Ações (Flutuante) */}
              <AutomationActions 
                id={auto.id} 
                name={auto.name} 
                status={auto.status} 
              />

              <Link 
                href={`/automacoes/${auto.id}/editar`} 
                className="glass-card p-6 hover:shadow-md hover:border-[#3B82F6] transition-all flex flex-col h-40 overflow-hidden"
              >
                <div className="flex-1 pr-12">
                  <h3 className="font-bold text-[#F8FAFC] text-lg leading-tight line-clamp-2">
                    {auto.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${auto.status === 'active' ? 'bg-[#31C48D]' : 'bg-[#F05252]'}`} />
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      {auto.status === 'active' ? 'Ligado' : auto.status === 'paused' ? 'Pausado' : 'Rascunho'}
                    </p>
                    {(auto.total_runs ?? 0) > 0 && (
                      <span className="text-xs text-[#94A3B8]">· {auto.total_runs} disparo{auto.total_runs !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-[#94A3B8] border-t border-[rgba(59,130,246,0.15)]">
                  <span>Ver Fluxo &rarr;</span>
                  <span>{new Date(auto.created_at!).toLocaleDateString('pt-BR')}</span>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
