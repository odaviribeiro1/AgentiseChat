import { createServiceClient } from '@/lib/supabase/server'
import { BuilderBoard } from '@/components/step-builder/BuilderBoard'
import { DmPreview } from '@/components/step-builder/DmPreview'

export default async function StepBuilderPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  console.log('[StepBuilderPage] Iniciando renderização...')

  try {
    const { id } = await params
    console.log('[StepBuilderPage] ID da automação:', id)

    if (!id || id.length < 10) {
      console.error('[StepBuilderPage] ID Inválido ou Malformado')
      throw new Error('ID Inválido')
    }

    // Verificar se a chave de serviço está presente (ajuda no diagnóstico do Vercel)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[StepBuilderPage] ERRO: Chave SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.')
    }

    const supabase = createServiceClient()

    // Buscar automação do banco
    const { data: automation, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (autoError || !automation) {
      console.warn('[StepBuilderPage] Automação não encontrada ou erro:', autoError)
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0] shadow-sm max-w-2xl mx-auto mt-20">
          <h2 className="text-xl font-bold text-[#E53E3E] mb-2">Ops! Automação não encontrada</h2>
          <p className="text-[#718096] mb-6">O fluxo que você está tentando editar pode ter sido excluído ou o link está incorreto.</p>
          <a href="/automacoes" className="text-[#2B7FFF] font-bold hover:underline">← Voltar para a lista</a>
        </div>
      )
    }

    // Buscar steps existentes
    const { data: steps } = await supabase
      .from('steps')
      .select('*')
      .eq('automation_id', id)
      .order('position', { ascending: true })

    const initialSteps = (steps || []).map(s => ({
      ...s,
      config: s.config as any, // Cast JSON -> StepConfig
    }))

    return (
      <div className="min-h-screen bg-[#F0F2F5] p-8 -m-8 flex flex-col">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A202C]">Editar Automação</h1>
            <p className="text-sm text-[#718096] mt-0.5">{automation.name}</p>
          </div>
          <a href="/automacoes" className="text-xs font-bold text-[#718096] hover:text-[#2B7FFF] transition-colors">
            ← Voltar para a Lista
          </a>
        </div>

      {/* Workspace de duas colunas principais */}
      <div className="flex gap-8 flex-1">
        {/* Board Principal (DND e Forms) */}
        <BuilderBoard
          automationId={id}
          initialSteps={initialSteps}
          initialTriggerType={automation.trigger_type}
          initialTriggerConfig={automation.trigger_config as any}
        />

        {/* Simulador (Preview) */}
        <div className="w-[350px] flex-shrink-0 border-l border-[#E2E8F0] pl-8">
          <DmPreview />
        </div>
      </div>
    </div>
    )
  } catch (err: any) {
    console.error('[StepBuilderPage] Erro fatal:', err)
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0] shadow-sm max-w-2xl mx-auto mt-20">
        <h2 className="text-xl font-bold text-[#E53E3E] mb-2">Erro ao carregar editor</h2>
        <p className="text-[#718096] mb-6">Ocorreu um problema técnico ao preparar sua automação. Por favor, tente atualizar a página.</p>
        <a href="/automacoes" className="text-[#2B7FFF] font-bold hover:underline">← Voltar para a lista</a>
      </div>
    )
  }
}
