'use client'

export default function AutomacaoEditorError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="p-8 text-center glass-card shadow-sm max-w-2xl mx-auto mt-20">
      <h2 className="text-xl font-bold text-[#EF4444] mb-2">Erro ao carregar editor</h2>
      <p className="text-[#94A3B8] mb-6">
        Algo inesperado aconteceu ao abrir esta automação. Tente recarregar a página.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Tentar novamente
        </button>
        <a
          href="/automacoes"
          className="border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.6)] hover:bg-[#0F1223] px-4 py-2 rounded-lg text-sm font-medium text-[#CBD5E1] transition-colors"
        >
          ← Voltar para a Lista
        </a>
      </div>
    </div>
  )
}
