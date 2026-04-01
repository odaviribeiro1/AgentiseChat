'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { TagStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  action: z.enum(['add', 'remove']),
  tag: z
    .string()
    .min(1, 'A tag não pode estar vazia')
    .regex(/^[a-z0-9\-]+$/i, 'Use apenas letras, números e hífens'),
})

interface TagStepFormProps {
  initialConfig: TagStepConfig
  onChange: (config: TagStepConfig) => void
}

export function TagStepForm({ initialConfig, onChange }: TagStepFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TagStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.action && value.tag !== undefined) {
        onChange(value as TagStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1A202C]">Ação</Label>
        <Select
          value={watch('action')}
          onValueChange={(v) => setValue('action', v as TagStepConfig['action'])}
        >
          <SelectTrigger className="w-full border-[#E2E8F0] focus:ring-[#2B7FFF]">
            <SelectValue placeholder="Selecionar ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Adicionar tag ao contato</SelectItem>
            <SelectItem value="remove">Remover tag do contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1A202C]">Nome da tag</Label>
        <Input
          {...register('tag')}
          placeholder="Ex: cliente-vip"
          className="border-[#E2E8F0] focus:ring-[#2B7FFF]"
        />
        {errors.tag && (
          <p className="text-xs text-[#E53E3E]">{errors.tag.message}</p>
        )}
        <p className="text-xs text-[#718096]">
          Use apenas letras, números e hífens. Ex: lead-frio, comprou-2024
        </p>
      </div>
    </div>
  )
}
