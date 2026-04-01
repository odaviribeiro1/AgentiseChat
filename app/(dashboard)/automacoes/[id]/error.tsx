'use client'

export default function AutomacaoEditorError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0] shadow-sm max-w-2xl mx-auto mt-20">
      <h2 className="text-xl font-bold text-[#E53E3E] mb-2">Erro ao carregar editor</h2>
      <p className="text-[#718096] mb-6">
        Algo inesperado aconteceu ao abrir esta automação. Tente recarregar a página.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Tentar novamente
        </button>
        <a
          href="/automacoes"
          className="border border-[#E2E8F0] bg-white hover:bg-[#F8F9FB] px-4 py-2 rounded-lg text-sm font-medium text-[#4A5568] transition-colors"
        >
          ← Voltar para a Lista
        </a>
      </div>
    </div>
  )
}
