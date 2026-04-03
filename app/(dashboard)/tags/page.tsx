import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Tag, Users } from 'lucide-react'
import { TagActions } from '@/components/tags/tag-actions'

export default async function TagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()
  const account = user
    ? await serviceClient
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
        .then(r => r.data)
    : null

  if (!account) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#718096]">Conecte uma conta Instagram para gerenciar tags.</p>
      </div>
    )
  }

  // Buscar todas as tags distintas com contagem
  const { data: contacts } = await serviceClient
    .from('contacts')
    .select('tags')
    .eq('account_id', account.id)

  // Contar ocorrências de cada tag
  const tagCounts = new Map<string, number>()
  for (const contact of contacts ?? []) {
    const tags = (contact.tags as string[]) ?? []
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Tags</h1>
          <p className="text-sm text-[#718096] mt-0.5">
            {sortedTags.length} tag{sortedTags.length !== 1 ? 's' : ''} em uso
          </p>
        </div>
      </div>

      {sortedTags.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
          <Tag className="w-8 h-8 text-[#A0AEC0] mx-auto mb-3" />
          <p className="text-sm text-[#718096]">Nenhuma tag criada ainda.</p>
          <p className="text-xs text-[#A0AEC0] mt-1">Tags são criadas automaticamente pelas automações.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
          {sortedTags.map(([tag, count]) => (
            <div key={tag} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#EBF3FF] text-[#2B7FFF] uppercase border border-[#2B7FFF]/20">
                  {tag}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#718096]">
                  <Users className="w-3.5 h-3.5" />
                  {count} contato{count !== 1 ? 's' : ''}
                </span>
              </div>
              <TagActions tag={tag} accountId={account.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
