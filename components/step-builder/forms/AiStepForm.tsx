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
        <Label htmlFor="system_prompt" className="text-sm font-medium text-[#1A202C]">
          System Prompt (Instruções para o Agente)
        </Label>
        <Textarea
          id="system_prompt"
          {...register('system_prompt')}
          placeholder="Ex: Você é um assistente da Agentise. Responda o lead de forma curta..."
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm text-[#1A202C] bg-[#F8F9FB] placeholder:text-[#A0AEC0] focus:ring-[#2B7FFF] min-h-[140px] resize-y"
        />
        {errors.system_prompt && <p className="text-xs text-[#E53E3E]">{errors.system_prompt.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1A202C]">Modelo de IA</Label>
          <Select 
            defaultValue={initialConfig.model} 
            onValueChange={(val: any) => setValue('model', val)}
          >
            <SelectTrigger className="w-full bg-white border-[#E2E8F0]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4.1-mini">GPT-4.1-Mini (Rápido & Barato)</SelectItem>
              <SelectItem value="gpt-4.1">GPT-4.1 (Avançado)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="context_messages" className="text-sm font-medium text-[#1A202C]">
            Lembrar das últimas (X) mensagens
          </Label>
          <input
            id="context_messages"
            type="number"
            {...register('context_messages')}
            className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm text-[#1A202C] bg-white focus:border-[#2B7FFF] h-10 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
