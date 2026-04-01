'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { MessageStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  text: z.string().min(1, 'A mensagem não pode estar vazia').max(1000, 'Texto muito longo'),
})

interface MessageStepFormProps {
  initialConfig: MessageStepConfig
  onChange: (config: MessageStepConfig) => void
}

export function MessageStepForm({ initialConfig, onChange }: MessageStepFormProps) {
  const { register, watch, formState: { errors } } = useForm<MessageStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  // Autoforward changes
  useEffect(() => {
    const subscription = watch((value) => {
      // Only fire change if it's somewhat valid
      if (value.text !== undefined) {
        onChange(value as MessageStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text" className="text-sm font-medium text-[#1A202C]">
          Texto da Mensagem
        </Label>
        <Textarea
          id="text"
          {...register('text')}
          placeholder="Ex: Olá! {{contact.first_name}}, como posso ajudar?"
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm text-[#1A202C] bg-[#F8F9FB] placeholder:text-[#A0AEC0] focus:ring-[#2B7FFF] min-h-[140px] resize-y"
        />
        {errors.text && <p className="text-xs text-[#E53E3E]">{errors.text.message}</p>}
        <p className="text-xs text-[#718096]">
          Dica: Você pode usar variáveis como {'{{contact.username}}'}.
        </p>
      </div>
    </div>
  )
}
