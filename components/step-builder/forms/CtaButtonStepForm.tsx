'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { CtaButtonStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  text: z
    .string()
    .min(1, 'A mensagem não pode estar vazia')
    .max(1000, 'Texto muito longo'),
  button_title: z
    .string()
    .min(1, 'O título do botão é obrigatório')
    .max(20, 'Máximo de 20 caracteres — restrição Meta API'),
  url: z.string().url('URL inválida — inclua https://'),
})

interface CtaButtonStepFormProps {
  initialConfig: CtaButtonStepConfig
  onChange: (config: CtaButtonStepConfig) => void
}

export function CtaButtonStepForm({ initialConfig, onChange }: CtaButtonStepFormProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<CtaButtonStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.text !== undefined) {
        onChange(value as CtaButtonStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  const buttonTitle = watch('button_title') || ''

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1A202C]">Texto da Mensagem</Label>
        <Textarea
          {...register('text')}
          placeholder="Ex: Clique no botão abaixo para acessar o conteúdo!"
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm text-[#1A202C] bg-[#F8F9FB] placeholder:text-[#A0AEC0] focus:ring-[#2B7FFF] min-h-[100px] resize-y"
        />
        {errors.text && (
          <p className="text-xs text-[#E53E3E]">{errors.text.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-[#1A202C]">Título do Botão</Label>
          <span
            className={`text-xs ${
              buttonTitle.length > 20 ? 'text-[#E53E3E]' : 'text-[#A0AEC0]'
            }`}
          >
            {buttonTitle.length}/20
          </span>
        </div>
        <Input
          {...register('button_title')}
          placeholder="Ex: Acessar Link"
          maxLength={20}
          className="border-[#E2E8F0] focus:ring-[#2B7FFF]"
        />
        {errors.button_title && (
          <p className="text-xs text-[#E53E3E]">{errors.button_title.message}</p>
        )}
        <p className="text-xs text-[#718096]">
          Limite de 20 caracteres — restrição da Meta API.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1A202C]">URL do Link</Label>
        <Input
          {...register('url')}
          placeholder="https://seulinkaqui.com"
          type="url"
          className="border-[#E2E8F0] focus:ring-[#2B7FFF]"
        />
        {errors.url && (
          <p className="text-xs text-[#E53E3E]">{errors.url.message}</p>
        )}
      </div>
    </div>
  )
}
