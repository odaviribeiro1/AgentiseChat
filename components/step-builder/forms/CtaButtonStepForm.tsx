'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import { Plus, Trash2, Tag, ExternalLink } from 'lucide-react'
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
})

type FormValues = z.infer<typeof schema>

interface CtaButtonStepFormProps {
  initialConfig: CtaButtonStepConfig
  onChange: (config: CtaButtonStepConfig) => void
}

function normalizeConfig(config: CtaButtonStepConfig): FormValues {
  // Retrocompat: converter formato antigo (singular) para array
  if (config.buttons?.length) {
    return { text: config.text, buttons: config.buttons }
  }
  if (config.button_title && config.url) {
    return { text: config.text, buttons: [{ title: config.button_title, url: config.url }] }
  }
  return { text: config.text || '', buttons: [{ title: '', url: '' }] }
}

export function CtaButtonStepForm({ initialConfig, onChange }: CtaButtonStepFormProps) {
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
        <Label className="text-sm font-medium text-[#1A202C]">Texto da Mensagem</Label>
        <Textarea
          {...register('text')}
          placeholder="Ex: Clique no botão abaixo para acessar o conteúdo!"
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm text-[#1A202C] bg-[#F8F9FB] placeholder:text-[#A0AEC0] focus:ring-[#2B7FFF] min-h-[100px] resize-y"
        />
        {errors.text && <p className="text-xs text-[#E53E3E]">{errors.text.message}</p>}
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium text-[#1A202C]">Botões com Link</Label>

        {fields.map((field, index) => (
          <div key={field.id} className="border border-[#E2E8F0] rounded-lg p-4 space-y-3 bg-white">
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096]">Título do Botão</Label>
                <div className="relative">
                  <Input
                    {...register(`buttons.${index}.title`)}
                    placeholder="Ex: Acessar Link"
                    maxLength={20}
                    className="bg-white border-[#E2E8F0] focus:border-[#2B7FFF] pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#A0AEC0]">
                    {(watch(`buttons.${index}.title`) || '').length}/20
                  </span>
                </div>
                {errors?.buttons?.[index]?.title && (
                  <p className="text-xs text-[#E53E3E]">{errors.buttons[index]?.title?.message}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                className="p-2.5 mt-5 text-[#E53E3E] hover:bg-[#FFF5F5] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096] flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> URL do Link
                </Label>
                <Input
                  {...register(`buttons.${index}.url`)}
                  placeholder="https://seulinkaqui.com"
                  type="url"
                  className="border-[#E2E8F0] focus:ring-[#2B7FFF]"
                />
                {errors?.buttons?.[index]?.url && (
                  <p className="text-xs text-[#E53E3E]">{errors.buttons[index]?.url?.message}</p>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#718096] flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tag ao Enviar (opcional)
                </Label>
                <Input
                  {...register(`buttons.${index}.apply_tag`)}
                  placeholder="Ex: clicou-link"
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
            onClick={() => append({ title: '', url: '', apply_tag: '' })}
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
