'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useStepBuilderStore } from '@/lib/stores/step-builder'
import type { StepLocal } from '@/lib/stores/step-builder'
import { StepCard } from './StepCard'
import { StepTypeSelector } from './StepTypeSelector'
import { Plus, Save } from 'lucide-react'
import { MessageStepForm } from './forms/MessageStepForm'
import { QuickReplyForm } from './forms/QuickReplyForm'
import { DelayStepForm } from './forms/DelayStepForm'
import { AiStepForm } from './forms/AiStepForm'
import { ConditionStepForm } from './forms/ConditionStepForm'
import { TagStepForm } from './forms/TagStepForm'
import { CtaButtonStepForm } from './forms/CtaButtonStepForm'
import type { ConditionStepConfig, TagStepConfig, CtaButtonStepConfig } from '@/lib/supabase/types'
import { saveAutomationSteps } from '@/app/actions/step-builder'
import { toast } from 'sonner'

interface BuilderBoardProps {
  automationId: string
  initialSteps: StepLocal[]
}

export function BuilderBoard({ automationId, initialSteps }: BuilderBoardProps) {
  const { 
    steps, setSteps, reorderSteps, addStep, 
    setAutomationId, selectedStepId, updateStepConfig,
    isSaving, setIsSaving 
  } = useStepBuilderStore()

  useEffect(() => {
    setAutomationId(automationId)
    setSteps(initialSteps)
  }, [automationId, initialSteps, setAutomationId, setSteps])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      reorderSteps(active.id as string, over.id as string)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const res = await saveAutomationSteps(automationId, steps)
      if (res.success) {
        toast.success('Automação salva com sucesso!')
      } else {
        toast.error(res.error || 'Erro ao salvar')
      }
    } catch (err) {
      toast.error('Erro de servidor')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedStep = steps.find(s => s.id === selectedStepId)

  return (
    <div className="flex-1 flex gap-6">
      {/* Coluna da Esquerda: Lista de Steps (DND) */}
      <div className="w-1/2 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[#1A202C]">Fluxo da Automação</h2>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-3">
            <SortableContext 
              items={steps.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {steps.map(step => (
                <StepCard key={step.id} step={step} />
              ))}
            </SortableContext>
          </div>
        </DndContext>

        <StepTypeSelector onSelect={(type) => addStep(type)}>
          <button className="flex items-center justify-center gap-2 w-full py-4 mt-2 border-2 border-dashed border-[#CBD5E0] bg-[#F8F9FB] hover:bg-white hover:border-[#2B7FFF] text-[#4A5568] hover:text-[#2B7FFF] transition-colors rounded-xl font-semibold">
            <Plus className="w-5 h-5" />
            Adicionar Passo
          </button>
        </StepTypeSelector>
      </div>

      {/* Coluna Central: Edição do Step Selecionado */}
      <div className="w-1/2">
        {selectedStep ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 sticky top-8">
            <h3 className="text-lg font-bold text-[#1A202C] mb-6 border-b border-[#E2E8F0] pb-4">
              Configurar Passo
            </h3>
            
            {/* Render form dynamically */}
            {selectedStep.type === 'message' && (
              <MessageStepForm 
                initialConfig={selectedStep.config as any} 
                onChange={(c) => updateStepConfig(selectedStep.id, c)} 
              />
            )}
            {selectedStep.type === 'quick_reply' && (
              <QuickReplyForm 
                initialConfig={selectedStep.config as any} 
                onChange={(c) => updateStepConfig(selectedStep.id, c)} 
              />
            )}
            {selectedStep.type === 'delay' && (
              <DelayStepForm 
                initialConfig={selectedStep.config as any} 
                onChange={(c) => updateStepConfig(selectedStep.id, c)} 
              />
            )}
            {selectedStep.type === 'ai' && (
              <AiStepForm 
                initialConfig={selectedStep.config as any} 
                onChange={(c) => updateStepConfig(selectedStep.id, c)} 
              />
            )}
            {selectedStep.type === 'condition' && (
              <ConditionStepForm
                initialConfig={selectedStep.config as ConditionStepConfig}
                onChange={(c) => updateStepConfig(selectedStep.id, c)}
              />
            )}
            {selectedStep.type === 'tag' && (
              <TagStepForm
                initialConfig={selectedStep.config as TagStepConfig}
                onChange={(c) => updateStepConfig(selectedStep.id, c)}
              />
            )}
            {selectedStep.type === 'cta_button' && (
              <CtaButtonStepForm
                initialConfig={selectedStep.config as CtaButtonStepConfig}
                onChange={(c) => updateStepConfig(selectedStep.id, c)}
              />
            )}
            {!['message', 'quick_reply', 'delay', 'ai', 'condition', 'tag', 'cta_button'].includes(selectedStep.type) && (
              <div className="text-sm text-[#718096]">
                Formulário para o tipo <strong>{selectedStep.type}</strong> não implementado.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#F8F9FB] rounded-xl border border-dashed border-[#E2E8F0] h-[300px] flex items-center justify-center text-[#A0AEC0] sticky top-8 font-medium">
            Selecione um passo para configurar
          </div>
        )}
      </div>
    </div>
  )
}
