'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Bot, Image as ImageIcon, MessageCircle, MousePointerClick, Clock, ArrowRightLeft, Tag, Search, CornerDownRight } from 'lucide-react'
import type { StepType } from '@/lib/supabase/types'

interface StepTypeSelectorProps {
  onSelect: (type: StepType) => void
  children: React.ReactNode
}

const STEP_OPTIONS: { type: StepType; label: string; icon: any; description: string }[] = [
  { type: 'message', label: 'Mensagem de Texto', icon: MessageCircle, description: 'Envie um texto simples' },
  { type: 'image_message', label: 'Mensagem com Imagem', icon: ImageIcon, description: 'Envie uma imagem e texto' },
  { type: 'quick_reply', label: 'Respostas Rápidas', icon: CornerDownRight, description: 'Botões que o usuário clica e ramificam o fluxo' },
  { type: 'cta_button', label: 'Botão com Link', icon: MousePointerClick, description: 'Botão que abre um site externo' },
  { type: 'delay', label: 'Aguardar', icon: Clock, description: 'Pausa a automação por um tempo' },
  { type: 'condition', label: 'Condição (If/Else)', icon: ArrowRightLeft, description: 'Ramifica por tags ou atributos' },
  { type: 'tag', label: 'Adicionar/Remover Tag', icon: Tag, description: 'Gerencie tags do contato' },
  { type: 'ai', label: 'Agente de IA (GPT)', icon: Bot, description: 'Gera uma resposta com Inteligência Artificial' },
]

export function StepTypeSelector({ onSelect, children }: StepTypeSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (type: StepType) => {
    onSelect(type)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar novo passo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {STEP_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                className="flex items-start gap-4 p-4 rounded-xl border border-[rgba(59,130,246,0.15)] hover:bg-[#0F1223] transition-colors text-left group"
              >
                <div className="bg-[rgba(59,130,246,0.12)] p-2 rounded-lg text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#F8FAFC]">{option.label}</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
