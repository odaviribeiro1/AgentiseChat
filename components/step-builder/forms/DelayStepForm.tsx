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
        <Label htmlFor="seconds" className="text-sm font-medium text-[#F8FAFC]">
          Tempo de Espera (em Segundos)
        </Label>
        <Input
          id="seconds"
          type="number"
          {...register('seconds')}
          className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-4 py-2 text-sm text-[#F8FAFC] bg-[rgba(15,18,35,0.6)] focus:border-[#3B82F6]"
        />
        {errors.seconds && <p className="text-xs text-[#EF4444]">{errors.seconds.message}</p>}
        <p className="text-xs text-[#94A3B8]">
          Exemplo: 60 = 1 minuto / 3600 = 1 hora
        </p>
      </div>
    </div>
  )
}
