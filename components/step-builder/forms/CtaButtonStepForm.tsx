'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import { Plus, Trash2, Tag, ExternalLink, ArrowRight } from 'lucide-react'
import type { CtaButtonStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  text: z.string().min(1, 'A mensagem não pode estar vazia').max(1000, 'Texto muito longo'),
  buttons: z.array(z.object({
    title: z.string().min(1, 'Título obrigatório').max(20, 'Máximo 20 caracteres'),
    url: z.string().url('URL inválida — inclua https://'),
    apply_tag: z.string().optional(),
  })).min(1, 'Adicione pelo menos 1 botão').max(3, 'Máximo 3 botões (limite Meta API)'),
  next_step_id: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AvailableStep {
  id: string
  type: string
  position: number
  label: string
}

interface CtaButtonStepFormProps {
  initialConfig: CtaButtonStepConfig
  onChange: (config: CtaButtonStepConfig) => void
  availableSteps?: AvailableStep[]
}

function normalizeConfig(config: CtaButtonStepConfig): FormValues {
  // Retrocompat: converter formato antigo (singular) para array
  if (config.buttons?.length) {
    return { text: config.text, buttons: config.buttons, next_step_id: config.next_step_id || '' }
  }
  if (config.button_title && config.url) {
    return { text: config.text, buttons: [{ title: config.button_title, url: config.url }], next_step_id: config.next_step_id || '' }
  }
  return { text: config.text || '', buttons: [{ title: '', url: '' }], next_step_id: config.next_step_id || '' }
}

export function CtaButtonStepForm({ initialConfig, onChange, availableSteps = [] }: CtaButtonStepFormProps) {
  const { register, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: normalizeConfig(initialConfig),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'buttons' })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.text !== undefined && value.buttons) {
        onChange(value as CtaButtonStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC]">Texto da Mensagem</Label>
        <Textarea
          {...register('text')}
          placeholder="Ex: Clique no botão abaixo para acessar o conteúdo!"
          className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-4 py-3 text-sm text-[#F8FAFC] bg-[#0F1223] placeholder:text-[#64748B] focus:ring-[#3B82F6] min-h-[100px] resize-y"
        />
        {errors.text && <p className="text-xs text-[#EF4444]">{errors.text.message}</p>}
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium text-[#F8FAFC]">Botões com Link</Label>

        {fields.map((field, index) => (
          <div key={field.id} className="border border-[rgba(59,130,246,0.15)] rounded-lg p-4 space-y-3 bg-[rgba(15,18,35,0.6)]">
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#94A3B8]">Título do Botão</Label>
                <div className="relative">
                  <Input
                    {...register(`buttons.${index}.title`)}
                    placeholder="Ex: Acessar Link"
                    maxLength={20}
                    className="bg-[rgba(15,18,35,0.6)] border-[rgba(59,130,246,0.15)] focus:border-[#3B82F6] pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B]">
                    {(watch(`buttons.${index}.title`) || '').length}/20
                  </span>
                </div>
                {errors?.buttons?.[index]?.title && (
                  <p className="text-xs text-[#EF4444]">{errors.buttons[index]?.title?.message}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                className="p-2.5 mt-5 text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#94A3B8] flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> URL do Link
                </Label>
                <Input
                  {...register(`buttons.${index}.url`)}
                  placeholder="https://seulinkaqui.com"
                  type="url"
                  className="border-[rgba(59,130,246,0.15)] focus:ring-[#3B82F6]"
                />
                {errors?.buttons?.[index]?.url && (
                  <p className="text-xs text-[#EF4444]">{errors.buttons[index]?.url?.message}</p>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#94A3B8] flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tag ao Enviar (opcional)
                </Label>
                <Input
                  {...register(`buttons.${index}.apply_tag`)}
                  placeholder="Ex: clicou-link"
                  className="bg-[rgba(15,18,35,0.6)] border-[rgba(59,130,246,0.15)] focus:border-[#3B82F6]"
                />
              </div>
            </div>
          </div>
        ))}

        {errors.buttons && !Array.isArray(errors.buttons) && (
          <p className="text-xs text-[#EF4444]">{errors.buttons.message}</p>
        )}

        {fields.length < 3 && (
          <button
            type="button"
            onClick={() => append({ title: '', url: '', apply_tag: '' })}
            className="flex items-center gap-2 text-sm font-semibold text-[#3B82F6] bg-[rgba(59,130,246,0.12)] hover:bg-[rgba(59,130,246,0.2)] px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Botão
          </button>
        )}
      </div>

      {/* Próximo Passo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC] flex items-center gap-1.5">
          <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
          Próximo Passo
        </Label>
        <p className="text-xs text-[#94A3B8]">
          Após enviar o CTA, o fluxo avança automaticamente para o passo selecionado.
        </p>
        <select
          {...register('next_step_id')}
          className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] bg-[rgba(15,18,35,0.6)] focus:ring-[#3B82F6] focus:border-[#3B82F6]"
        >
          <option value="">Nenhum (encerrar fluxo)</option>
          {availableSteps.map(step => (
            <option key={step.id} value={step.id}>
              Passo {step.position + 1}: {step.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
