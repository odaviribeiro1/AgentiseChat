'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import type { ImageMessageStepConfig } from '@/lib/supabase/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  image_url: z.string().url('URL inválida — inclua https://'),
  caption: z.string().max(1000, 'Legenda muito longa').optional(),
})

interface ImageMessageStepFormProps {
  initialConfig: ImageMessageStepConfig
  onChange: (config: ImageMessageStepConfig) => void
}

export function ImageMessageStepForm({ initialConfig, onChange }: ImageMessageStepFormProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<ImageMessageStepConfig>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig,
  })

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.image_url !== undefined) {
        onChange(value as ImageMessageStepConfig)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC]">URL da Imagem</Label>
        <Input
          {...register('image_url')}
          placeholder="https://exemplo.com/imagem.jpg"
          type="url"
          className="border-[rgba(59,130,246,0.15)] focus:ring-[#3B82F6]"
        />
        {errors.image_url && (
          <p className="text-xs text-[#EF4444]">{errors.image_url.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#F8FAFC]">Legenda (opcional)</Label>
        <Textarea
          {...register('caption')}
          placeholder="Ex: Confira nossa oferta especial!"
          className="w-full border border-[rgba(59,130,246,0.15)] rounded-lg px-4 py-3 text-sm text-[#F8FAFC] bg-[#0F1223] placeholder:text-[#64748B] focus:ring-[#3B82F6] min-h-[80px] resize-y"
        />
        {errors.caption && (
          <p className="text-xs text-[#EF4444]">{errors.caption.message}</p>
        )}
      </div>
    </div>
  )
}
