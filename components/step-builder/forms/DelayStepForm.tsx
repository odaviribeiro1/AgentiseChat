'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { DelayStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const schema = z.object({
  seconds: z.coerce.number().min(5, 'Mínimo de 5 segundos').max(86400, 'Máximo de 24 horas (86400s)'),
})

interface DelayStepFormProps {
  initialConfig: DelayStepConfig
  onChange: (config: DelayStepConfig) => void
}

export function DelayStepForm({ initialConfig, onChange }: DelayStepFormProps) {
  const { register, watch, formState: { errors } } = useForm<DelayStepConfig>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialConfig,
  })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.seconds !== undefined && !isNaN(value.seconds)) {
        onChange(value as DelayStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="seconds" className="text-sm font-medium text-[#1A202C]">
          Tempo de Espera (em Segundos)
        </Label>
        <Input
          id="seconds"
          type="number"
          {...register('seconds')}
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm text-[#1A202C] bg-white focus:border-[#2B7FFF]"
        />
        {errors.seconds && <p className="text-xs text-[#E53E3E]">{errors.seconds.message}</p>}
        <p className="text-xs text-[#718096]">
          Exemplo: 60 = 1 minuto / 3600 = 1 hora
        </p>
      </div>
    </div>
  )
}
