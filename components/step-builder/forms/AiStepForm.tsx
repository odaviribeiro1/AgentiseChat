'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { AiStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  system_prompt: z.string().min(10, 'O prompt deve ser detalhado').max(2000, 'Prompt muito longo'),
  model: z.enum(['gpt-4.1', 'gpt-4.1-mini']),
  context_messages: z.coerce.number().min(1).max(20),
})

interface AiStepFormProps {
  initialConfig: AiStepConfig
  onChange: (config: AiStepConfig) => void
}

export function AiStepForm({ initialConfig, onChange }: AiStepFormProps) {
  const { register, watch, setValue, formState: { errors } } = useForm<AiStepConfig>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialConfig,
  })

  // Autoforward changes
  useEffect(() => {
    const subscription = watch((value) => {
      onChange(value as AiStepConfig)
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="system_prompt" className="text-sm font-medium text-[#F8FAFC]">
          System Prompt (Instruções para o Agente)
        </Label>
        <Textarea
          id="system_prompt"
          {...register('system_prompt')}
          placeholder="Ex: Você é um assistente da Agentise. Responda o lead de forma curta..."
          className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-4 py-3 text-sm text-[#F8FAFC] bg-[#0F1223] placeholder:text-[#64748B] focus:ring-[#3B82F6] min-h-[140px] resize-y"
        />
        {errors.system_prompt && <p className="text-xs text-[#EF4444]">{errors.system_prompt.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#F8FAFC]">Modelo de IA</Label>
          <Select 
            defaultValue={initialConfig.model} 
            onValueChange={(val: any) => setValue('model', val)}
          >
            <SelectTrigger className="w-full bg-[rgba(15,18,35,0.6)] border-[rgba(59,130,246,0.15)]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4.1-mini">GPT-4.1-Mini (Rápido & Barato)</SelectItem>
              <SelectItem value="gpt-4.1">GPT-4.1 (Avançado)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="context_messages" className="text-sm font-medium text-[#F8FAFC]">
            Lembrar das últimas (X) mensagens
          </Label>
          <input
            id="context_messages"
            type="number"
            {...register('context_messages')}
            className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-4 py-2 text-sm text-[#F8FAFC] bg-[rgba(15,18,35,0.6)] focus:border-[#3B82F6] h-10 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
