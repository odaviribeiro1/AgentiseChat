import { create } from 'zustand'
import type { StepConfig, StepRow, StepType } from '@/lib/supabase/types'

export type StepLocal = Omit<StepRow, 'config'> & {
  config: StepConfig
  isDraft?: boolean // true para steps criados no frontend, ainda não persistidos
}

interface StepBuilderState {
  automationId: string | null
  steps: StepLocal[]
  selectedStepId: string | null
  isSaving: boolean

  setAutomationId: (id: string) => void
  setSteps: (steps: StepLocal[]) => void
  addStep: (type: StepType, parent_step_id?: string | null, branch_value?: string | null) => void
  updateStepConfig: (id: string, config: StepConfig) => void
  removeStep: (id: string) => void
  reorderSteps: (activeId: string, overId: string) => void
  selectStep: (id: string | null) => void
  setIsSaving: (saving: boolean) => void
}

const getDefaultConfig = (type: StepType): StepConfig => {
  switch (type) {
    case 'message':
      return { text: '' }
    case 'image_message':
      return { image_url: '' }
    case 'quick_reply':
      return { text: '', buttons: [] }
    case 'cta_button':
      return { text: '', button_title: '', url: '' }
    case 'delay':
      return { seconds: 60 }
    case 'ai':
      return { system_prompt: '', model: 'gpt-4.1-mini', context_messages: 5 }
    case 'condition':
      return { field: 'tag', operator: 'has', value: '' }
    case 'tag':
      return { action: 'add', tag: '' }
    case 'end':
      return { notify_operator: false }
    default:
      return { text: '' } as any
  }
}

export const useStepBuilderStore = create<StepBuilderState>((set) => ({
  automationId: null,
  steps: [],
  selectedStepId: null,
  isSaving: false,

  setAutomationId: (id) => set({ automationId: id }),
  setSteps: (steps) => set({ steps }),
  
  addStep: (type, parent_step_id = null, branch_value = null) => set((state) => {
    // Definir a posição com base no número de irmãos
    const siblings = state.steps.filter(s => s.parent_step_id === parent_step_id)
    const position = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0

    const newStep: StepLocal = {
      id: crypto.randomUUID(),
      automation_id: state.automationId || '',
      parent_step_id,
      branch_value,
      position,
      type,
      config: getDefaultConfig(type),
      created_at: new Date().toISOString(),
      isDraft: true,
    }

    return { 
      steps: [...state.steps, newStep],
      selectedStepId: newStep.id // Auto-seleciona ao criar
    }
  }),

  updateStepConfig: (id, config) => set((state) => ({
    steps: state.steps.map(s => s.id === id ? { ...s, config } : s)
  })),

  removeStep: (id) => set((state) => {
    // Se remover um parent, remover filhos tbm (em memória, simplificado)
    const descendants = [id]
    // Apenas de forma rasa. Se tivéssemos árvore profunda, seria uma função recursiva.
    state.steps.forEach(s => {
      if (s.parent_step_id === id) descendants.push(s.id)
    })
    
    return {
      steps: state.steps.filter(s => !descendants.includes(s.id)),
      selectedStepId: state.selectedStepId === id ? null : state.selectedStepId
    }
  }),

  reorderSteps: (activeId, overId) => set((state) => {
    const oldIndex = state.steps.findIndex(s => s.id === activeId)
    const newIndex = state.steps.findIndex(s => s.id === overId)
    
    if (oldIndex === -1 || newIndex === -1) return state

    const newSteps = [...state.steps]
    const [moved] = newSteps.splice(oldIndex, 1)
    newSteps.splice(newIndex, 0, moved)

    // Reatualizar posições apenas para steps com mesmo parent
    const parentId = moved.parent_step_id
    let newPosition = 0
    const finalSteps = newSteps.map(s => {
      if (s.parent_step_id === parentId) {
        return { ...s, position: newPosition++ }
      }
      return s
    })

    return { steps: finalSteps }
  }),

  selectStep: (id) => set({ selectedStepId: id }),
  setIsSaving: (saving) => set({ isSaving: saving }),
}))
