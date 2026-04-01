import { createServiceClient } from '@/lib/supabase/server'
import { BuilderBoard } from '@/components/step-builder/BuilderBoard'
import { DmPreview } from '@/components/step-builder/DmPreview'

export default async function StepBuilderPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  // Buscar automação do banco
  const { data: automation } = await supabase
    .from('automations')
    .select('*')
    .eq('id', id)
    .single()

  if (!automation) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0]">
        <h2 className="text-xl font-bold text-[#E53E3E] mb-2">Automação não encontrada</h2>
        <p className="text-[#718096]">O ID fornecido não corresponde a nenhum fluxo em nosso sistema.</p>
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A202C]">Editar Automação</h1>
        <p className="text-sm text-[#718096] mt-0.5">{automation.name}</p>
      </div>

      {/* Workspace de duas colunas principais */}
      <div className="flex gap-8 flex-1">
        {/* Board Principal (DND e Forms) */}
        <BuilderBoard automationId={id} initialSteps={initialSteps} />

        {/* Simulador (Preview) */}
        <div className="w-[350px] flex-shrink-0 border-l border-[#E2E8F0] pl-8">
          <DmPreview />
        </div>
      </div>
    </div>
  )
}
