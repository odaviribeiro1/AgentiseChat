'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import { Plus, Trash2, Tag, ArrowRight } from 'lucide-react'
import type { QuickReplyStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

const schema = z.object({
  text: z.string().min(1, 'A mensagem principal é obrigatória').max(1000, 'Mensagem muito longa'),
  buttons: z.array(z.object({
    title: z.string().min(1, 'Título não pode estar vazio').max(20, 'Máximo 20 caracteres'),
    payload: z.string().min(1, 'Payload obrigatório'),
    next_step_id: z.string().optional(),
    apply_tag: z.string().optional(),
  })).max(3, 'O Instagram permite no máximo 3 botões de resposta rápida'),
})

interface AvailableStep {
  id: string
  type: string
  position: number
  label: string
}

interface QuickReplyFormProps {
  initialConfig: QuickReplyStepConfig
  onChange: (config: QuickReplyStepConfig) => void
  availableSteps?: AvailableStep[]
}

const STEP_TYPE_LABELS: Record<string, string> = {
  message: 'Mensagem',
  image_message: 'Imagem',
  quick_reply: 'Respostas Rápidas',
  cta_button: 'Botão com Link',
  delay: 'Delay',
  ai: 'IA',
  condition: 'Condição',
  tag: 'Tag',
  end: 'Fim',
}

export function QuickReplyForm({ initialConfig, onChange, availableSteps = [] }: QuickReplyFormProps) {
  const { register, control, watch, formState: { errors } } = useForm<QuickReplyStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'buttons',
  })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.text !== undefined && value.buttons) {
        onChange(value as QuickReplyStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text" className="text-sm font-medium text-[#1A202C]">
          Mensagem Principal
        </Label>
        <Textarea
          id="text"
          {...register('text')}
          placeholder="Escolha uma das opções abaixo:"
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm text-[#1A202C] bg-[#F8F9FB] placeholder:text-[#A0AEC0] focus:ring-[#2B7FFF] min-h-[100px] resize-y"
        />
        {errors.text && <p className="text-xs text-[#E53E3E]">{errors.text.message}</p>}
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium text-[#1A202C]">Botões de Resposta Rápida</Label>

        {fields.map((field, index) => (
          <div key={field.id} className="border border-[#E2E8F0] rounded-lg p-4 space-y-3 bg-white">
            {/* Linha 1: Título + Remover */}
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096]">Título do Botão</Label>
                <Input
                  {...register(`buttons.${index}.title` as const)}
                  placeholder="Ex: Sim, quero!"
                  maxLength={20}
                  className="bg-white border-[#E2E8F0] focus:border-[#2B7FFF]"
                />
                {errors?.buttons?.[index]?.title && (
                  <p className="text-xs text-[#E53E3E]">{errors.buttons[index]?.title?.message}</p>
                )}
              </div>

              {/* Payload (hidden — auto-gerado) */}
              <input type="hidden" {...register(`buttons.${index}.payload` as const)} />

              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2.5 mt-5 text-[#E53E3E] hover:bg-[#FFF5F5] rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Linha 2: Próximo step + Tag */}
            <div className="flex gap-3">
              {/* Próximo step */}
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096] flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Próximo Passo
                </Label>
                <select
                  {...register(`buttons.${index}.next_step_id` as const)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1A202C] bg-white focus:ring-[#2B7FFF] focus:border-[#2B7FFF]"
                >
                  <option value="">Nenhum (encerrar fluxo)</option>
                  {availableSteps.map(step => (
                    <option key={step.id} value={step.id}>
                      Passo {step.position + 1}: {step.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag ao clicar */}
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096] flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tag ao Clicar (opcional)
                </Label>
                <Input
                  {...register(`buttons.${index}.apply_tag` as const)}
                  placeholder="Ex: interessado"
                  className="bg-white border-[#E2E8F0] focus:border-[#2B7FFF]"
                />
              </div>
            </div>
          </div>
        ))}

        {errors.buttons && !Array.isArray(errors.buttons) && (
          <p className="text-xs text-[#E53E3E]">{errors.buttons.message}</p>
        )}

        {fields.length < 3 && (
          <button
            type="button"
            onClick={() => append({ title: '', payload: `PAYLOAD_${fields.length + 1}`, next_step_id: '', apply_tag: '' })}
            className="flex items-center gap-2 text-sm font-semibold text-[#2B7FFF] bg-[#EBF3FF] hover:bg-[#d6e5fa] px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Botão
          </button>
        )}
      </div>
    </div>
  )
}
