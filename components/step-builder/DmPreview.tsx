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
    <div className="bg-[#0A0A0F] rounded-xl border border-[rgba(59,130,246,0.15)] p-4 flex flex-col h-[600px] overflow-hidden sticky top-8">
      {/* Header fake do Instagram */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(59,130,246,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
            <div className="w-full h-full bg-[rgba(15,18,35,0.6)] rounded-full flex items-center justify-center text-[10px] font-bold text-[#F8FAFC]">
              IG
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#F8FAFC]">Sua Conta</p>
            <p className="text-xs text-[#94A3B8]">Bot de Automação</p>
          </div>
        </div>
      </div>

      {/* Content do chat */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 flex flex-col">
        {/* Placeholder inicial */}
        <div className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider my-4">
          Hoje 12:00
        </div>

        {/* User send trigger simulation */}
        <div className="self-end max-w-[70%] bg-[rgba(59,130,246,0.12)] text-[#3B82F6] rounded-2xl rounded-tr-md px-4 py-2 text-sm shadow-sm">
          [Comentário Gatilho]
        </div>

        {steps.map((step) => {
          if (step.type === 'message') {
            const config = step.config as any
            if (!config.text) return null
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-[rgba(15,18,35,0.6)] text-[#F8FAFC] rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm border border-[rgba(59,130,246,0.15)] whitespace-pre-wrap">
                {config.text || '...'}
              </div>
            )
          }

          if (step.type === 'image_message') {
            const config = step.config as any
            if (!config.image_url) return null
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-[rgba(15,18,35,0.6)] rounded-2xl overflow-hidden shadow-sm border border-[rgba(59,130,246,0.15)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.image_url} alt="Envio" className="w-full h-auto object-cover max-h-[200px]" />
                {config.caption && (
                  <div className="p-3 text-sm text-[#F8FAFC]">{config.caption}</div>
                )}
              </div>
            )
          }

          if (step.type === 'quick_reply') {
            const config = step.config as any
            if (!config.text) return null
            return (
              <div key={step.id} className="self-start max-w-[85%] flex flex-col items-start gap-2">
                <div className="bg-[rgba(15,18,35,0.6)] text-[#F8FAFC] rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm border border-[rgba(59,130,246,0.15)]">
                  {config.text}
                </div>
                <div className="flex flex-wrap gap-2 w-full mt-1">
                  {config.buttons?.map((btn: any, idx: number) => (
                    <div key={idx} className="bg-[rgba(15,18,35,0.6)] border border-[#3B82F6] text-[#3B82F6] px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer shadow-sm text-center">
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
              <div key={step.id} className="self-center flex items-center gap-1.5 text-xs font-semibold text-[#64748B] bg-[rgba(15,18,35,0.6)] px-3 py-1 rounded-full border border-[rgba(59,130,246,0.15)] shadow-sm">
                Aguardando {config.seconds}s...
              </div>
            )
          }

          if (step.type === 'ai') {
            return (
              <div key={step.id} className="self-start max-w-[75%] bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-2xl rounded-tl-md px-4 py-2 text-sm shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-white/70 uppercase">IA Generativa</span>
                <span>(Resposta será gerada dinamicamente)</span>
              </div>
            )
          }

          return null
        })}

        {steps.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#64748B] text-center px-6">
            Adicione passos no construtor para visualizar como seu lead os verá.
          </div>
        )}
      </div>
      
      {/* Input de mensagem fake */}
      <div className="mt-2 bg-[rgba(15,18,35,0.6)] rounded-full border border-[rgba(59,130,246,0.15)] px-4 py-2.5 flex items-center gap-3 shadow-inner">
        <div className="w-6 h-6 rounded-full bg-[rgba(59,130,246,0.12)] flex-shrink-0" />
        <div className="flex-1 text-[#64748B] text-sm">Mensagem...</div>
      </div>
    </div>
  )
}
