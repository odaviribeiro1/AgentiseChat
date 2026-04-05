'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { ConditionStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z
  .object({
    field: z.enum(['tag', 'window_active', 'opted_out']),
    operator: z.enum(['has', 'not_has', 'is', 'is_not']),
    value: z.string(),
  })
  .refine((data) => data.field !== 'tag' || data.value.length > 0, {
    message: 'A tag não pode estar vazia',
    path: ['value'],
  })

interface ConditionStepFormProps {
  initialConfig: ConditionStepConfig
  onChange: (config: ConditionStepConfig) => void
}

export function ConditionStepForm({ initialConfig, onChange }: ConditionStepFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConditionStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  const field = watch('field')

  // Ao mudar o campo, resetar o operador para um valor válido
  useEffect(() => {
    if (field === 'tag') {
      setValue('operator', 'has')
    } else {
      setValue('operator', 'is')
    }
  }, [field, setValue])

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.field) {
        onChange(value as ConditionStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC]">Verificar campo</Label>
        <Select
          value={watch('field')}
          onValueChange={(v) => setValue('field', v as ConditionStepConfig['field'])}
        >
          <SelectTrigger className="w-full border-[rgba(59,130,246,0.15)] focus:ring-[#3B82F6]">
            <SelectValue placeholder="Selecionar campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tag">Tag do contato</SelectItem>
            <SelectItem value="window_active">Janela 24h ativa</SelectItem>
            <SelectItem value="opted_out">Contato fez opt-out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC]">Condição</Label>
        <Select
          value={watch('operator')}
          onValueChange={(v) => setValue('operator', v as ConditionStepConfig['operator'])}
        >
          <SelectTrigger className="w-full border-[rgba(59,130,246,0.15)] focus:ring-[#3B82F6]">
            <SelectValue placeholder="Selecionar condição" />
          </SelectTrigger>
          <SelectContent>
            {field === 'tag' ? (
              <>
                <SelectItem value="has">possui a tag</SelectItem>
                <SelectItem value="not_has">não possui a tag</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="is">é verdadeiro</SelectItem>
                <SelectItem value="is_not">é falso</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {field === 'tag' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#F8FAFC]">Nome da tag</Label>
          <Input
            {...register('value')}
            placeholder="Ex: cliente-vip"
            className="border-[rgba(59,130,246,0.15)] focus:ring-[#3B82F6]"
          />
          {errors.value && (
            <p className="text-xs text-[#EF4444]">{errors.value.message}</p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-[rgba(59,130,246,0.12)] p-3">
        <p className="text-xs text-[#CBD5E1]">
          Configure uma condição para bifurcar o fluxo. O ramo verdadeiro ou falso
          será seguido com base no resultado da verificação.
        </p>
      </div>
    </div>
  )
}
