'use client'

import { useState, useEffect } from 'react'
import { useStepBuilderStore } from '@/lib/stores/step-builder'

export function DmPreview() {
  const steps = useStepBuilderStore(s => s.steps)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return <div className="w-[350px] bg-white/50 rounded-xl animate-pulse h-[600px]" />

  return (
    <div className="bg-[#F0F2F5] rounded-xl border border-[#E2E8F0] p-4 flex flex-col h-[600px] overflow-hidden sticky top-8">
      {/* Header fake do Instagram */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-[#1A202C]">
              IG
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A202C]">Sua Conta</p>
            <p className="text-xs text-[#718096]">Bot de Automação</p>
          </div>
        </div>
      </div>

      {/* Content do chat */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 flex flex-col">
        {/* Placeholder inicial */}
        <div className="text-center text-[#A0AEC0] text-xs font-semibold uppercase tracking-wider my-4">
          Hoje 12:00
        </div>

        {/* User send trigger simulation */}
        <div className="self-end max-w-[70%] bg-[#EBF3FF] text-[#2B7FFF] rounded-2xl rounded-tr-md px-4 py-2 text-sm shadow-sm">
          [Comentário Gatilho]
        </div>

        {steps.map((step) => {
          if (step.type === 'message') {
            const config = step.config as any
            if (!config.text) return null
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-white text-[#1A202C] rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm border border-[#E2E8F0] whitespace-pre-wrap">
                {config.text || '...'}
              </div>
            )
          }

          if (step.type === 'image_message') {
            const config = step.config as any
            if (!config.image_url) return null
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E2E8F0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.image_url} alt="Envio" className="w-full h-auto object-cover max-h-[200px]" />
                {config.caption && (
                  <div className="p-3 text-sm text-[#1A202C]">{config.caption}</div>
                )}
              </div>
            )
          }

          if (step.type === 'quick_reply') {
            const config = step.config as any
            if (!config.text) return null
            return (
              <div key={step.id} className="self-start max-w-[85%] flex flex-col items-start gap-2">
                <div className="bg-white text-[#1A202C] rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm border border-[#E2E8F0]">
                  {config.text}
                </div>
                <div className="flex flex-wrap gap-2 w-full mt-1">
                  {config.buttons?.map((btn: any, idx: number) => (
                    <div key={idx} className="bg-white border border-[#2B7FFF] text-[#2B7FFF] px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer shadow-sm text-center">
                      {btn.title || 'Botão'}
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          if (step.type === 'delay') {
            const config = step.config as any
            return (
              <div key={step.id} className="self-center flex items-center gap-1.5 text-xs font-semibold text-[#A0AEC0] bg-white px-3 py-1 rounded-full border border-[#E2E8F0] shadow-sm">
                Aguardando {config.seconds}s...
              </div>
            )
          }

          if (step.type === 'ai') {
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-gradient-to-r from-[#2B7FFF] to-[#1A6FEF] text-white rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-white/70 uppercase">IA Generativa</span>
                <span>(Resposta será gerada dinamicamente)</span>
              </div>
            )
          }

          return null
        })}

        {steps.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#A0AEC0] text-center px-6">
            Adicione passos no construtor para visualizar como seu lead os verá.
          </div>
        )}
      </div>
      
      {/* Input de mensagem fake */}
      <div className="mt-2 bg-white rounded-full border border-[#E2E8F0] px-4 py-2.5 flex items-center gap-3 shadow-inner">
        <div className="w-6 h-6 rounded-full bg-[#EBF3FF] flex-shrink-0" />
        <div className="flex-1 text-[#A0AEC0] text-sm">Mensagem...</div>
      </div>
    </div>
  )
}
