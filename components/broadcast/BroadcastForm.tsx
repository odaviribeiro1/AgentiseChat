'use client'

import { useState } from 'react'
import { ArrowLeft, Save, Send, AlertCircle, ImageIcon, MessageSquare, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createBroadcast } from '@/app/actions/broadcasts'

interface BroadcastFormProps {
  accountId: string
}

type MessageType = 'text' | 'image' | 'cta_button'

const MESSAGE_TYPES: { value: MessageType; label: string; icon: React.ReactNode }[] = [
  { value: 'text',       label: 'Texto',     icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'image',      label: 'Imagem',    icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'cta_button', label: 'Botão CTA', icon: <ExternalLink className="w-4 h-4" /> },
]

export function BroadcastForm({ accountId }: BroadcastFormProps) {
  const [messageType, setMessageType] = useState<MessageType>('text')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/broadcast"
          className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-[#718096] hover:text-[#1A202C] hover:bg-[#F8F9FB] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Novo Disparo</h1>
          <p className="text-sm text-[#718096] mt-1">
            Configure o filtro e o conteúdo da mensagem a ser enviada.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <form action={createBroadcast} className="p-8 space-y-6">
          {/* Campos ocultos */}
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="message_type" value={messageType} />

          {/* Nome da campanha */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-[#1A202C]">
              Nome da Campanha Interna
            </label>
            <input
              required
              name="name"
              id="name"
              placeholder="Ex: Black Friday 2024 - Base Ativa"
              className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
            />
          </div>

          {/* Segmentação */}
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium text-[#1A202C]">
              Segmentação por Tags{' '}
              <span className="font-normal text-[#718096]">(separadas por vírgula)</span>
            </label>
            <input
              name="tags"
              id="tags"
              placeholder="Ex: lead-frio, cliente-vip"
              className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
            />
            <p className="text-xs text-[#A0AEC0]">
              Deixe em branco para enviar a todos os contatos na janela de 24h.
            </p>
          </div>

          {/* Seletor de tipo de mensagem */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium text-[#1A202C]">Tipo de Mensagem</label>
            <div className="flex gap-2">
              {MESSAGE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setMessageType(t.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    messageType === t.value
                      ? 'bg-[#EBF3FF] text-[#2B7FFF] border-[#2B7FFF]'
                      : 'bg-white text-[#4A5568] border-[#E2E8F0] hover:bg-[#F8F9FB]'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos por tipo */}
          {messageType === 'text' && (
            <div className="space-y-2">
              <label htmlFor="text" className="text-sm font-medium text-[#1A202C]">
                Texto da Mensagem DM
              </label>
              <textarea
                required
                name="text"
                id="text"
                rows={5}
                placeholder="Olá {{contact.first_name}}! Temos uma promoção..."
                className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all resize-y"
              />
            </div>
          )}

          {messageType === 'image' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="image_url" className="text-sm font-medium text-[#1A202C]">
                  URL da Imagem
                </label>
                <input
                  required
                  name="image_url"
                  id="image_url"
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="caption" className="text-sm font-medium text-[#1A202C]">
                  Legenda{' '}
                  <span className="font-normal text-[#718096]">(opcional)</span>
                </label>
                <textarea
                  name="caption"
                  id="caption"
                  rows={3}
                  placeholder="Descrição da imagem..."
                  className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all resize-y"
                />
              </div>
            </div>
          )}

          {messageType === 'cta_button' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="cta-text" className="text-sm font-medium text-[#1A202C]">
                  Texto da Mensagem
                </label>
                <textarea
                  required
                  name="text"
                  id="cta-text"
                  rows={3}
                  placeholder="Clique no botão abaixo para acessar..."
                  className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all resize-y"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="button_title" className="text-sm font-medium text-[#1A202C]">
                  Título do Botão{' '}
                  <span className="font-normal text-[#718096]">(máx. 20 caracteres)</span>
                </label>
                <input
                  required
                  name="button_title"
                  id="button_title"
                  maxLength={20}
                  placeholder="Ex: Acessar Link"
                  className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="button_url" className="text-sm font-medium text-[#1A202C]">
                  URL do Link
                </label>
                <input
                  required
                  name="button_url"
                  id="button_url"
                  type="url"
                  placeholder="https://seulinkaqui.com"
                  className="w-full bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
                />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="submit"
              name="action"
              value="draft"
              className="px-5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#F8F9FB] text-[#4A5568] rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar como Rascunho
            </button>
            <button
              type="submit"
              name="action"
              value="send"
              className="px-5 py-2.5 bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              Programar Disparo
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#EBF3FF] border border-[#2B7FFF]/20 rounded-xl p-4 flex gap-3">
        <div className="text-[#2B7FFF] mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#1A202C]">Lembrete da Janela de 24 horas</h4>
          <p className="text-xs text-[#718096] mt-1">
            Apenas os leads que enviaram uma mensagem para a sua conta nas últimas 24 horas
            receberão este envio. Essa é uma restrição da Meta API para evitar spam.
          </p>
        </div>
      </div>
    </div>
  )
}
