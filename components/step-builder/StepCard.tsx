'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreVertical, Trash, Copy } from 'lucide-react'
import type { StepLocal } from '@/lib/stores/step-builder'
import { useStepBuilderStore } from '@/lib/stores/step-builder'

interface StepCardProps {
  step: StepLocal
}

export function StepCard({ step }: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id })
    
  const selectedStepId = useStepBuilderStore(s => s.selectedStepId)
  const selectStep = useStepBuilderStore(s => s.selectStep)
  const removeStep = useStepBuilderStore(s => s.removeStep)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isSelected = selectedStepId === step.id

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'message': return 'Mensagem de Texto'
      case 'image_message': return 'Mensagem com Imagem'
      case 'quick_reply': return 'Respostas Rápidas'
      case 'cta_button': return 'Botão com Link'
      case 'delay': return 'Aguardar'
      case 'condition': return 'Condição'
      case 'tag': return 'Ação de Tag'
      case 'ai': return 'Agente de IA'
      case 'end': return 'Fim do Fluxo'
      default: return 'Desconhecido'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-[rgba(15,18,35,0.6)] border ${isSelected ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-[rgba(59,130,246,0.15)]'} rounded-xl shadow-sm cursor-pointer transition-all duration-200 ${isDragging ? 'opacity-50 z-50' : ''}`}
      onClick={() => selectStep(step.id)}
    >
      <div className="flex items-stretch min-h-[72px]">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-1 border-r border-[rgba(59,130,246,0.15)] text-[#64748B] hover:text-[#CBD5E1] hover:bg-[#0F1223] rounded-l-xl cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(59,130,246,0.12)] text-[#3B82F6]">
                Passo {step.position + 1}
              </span>
              {step.isDraft && (
                <span className="text-[10px] text-[#F59E0B] font-medium px-2 py-0.5 bg-[rgba(245,158,11,0.12)] rounded-full">
                  Não salvo
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-[#F8FAFC] mt-1.5 flex items-center gap-2">
              {getTypeLabel(step.type)}
            </h3>
            {/* Simple preview text based on config */}
            <p className="text-xs text-[#94A3B8] mt-1 truncate max-w-[200px]">
              {step.type === 'message' && (step.config as any).text}
              {step.type === 'delay' && `Aguardar ${(step.config as any).seconds}s`}
              {step.type === 'ai' && 'Geração GPT'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              title="Duplicar"
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0F1223] rounded"
              onClick={(e) => {
                e.stopPropagation()
                // clonar step (simplificado)
              }}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              title="Excluir"
              className="p-1.5 text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] rounded"
              onClick={(e) => {
                e.stopPropagation()
                removeStep(step.id)
              }}
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
