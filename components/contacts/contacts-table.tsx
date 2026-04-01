'use client'

import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ContactRow } from '@/lib/supabase/types'
import { format, isFuture } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface ContactsTableProps {
  data: ContactRow[]
}

const columnHelper = createColumnHelper<ContactRow>()

const columns = [
  columnHelper.accessor('username', {
    header: 'Lead',
    cell: (info) => (
      <div className="flex items-center gap-3">
        {info.row.original.profile_pic_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.row.original.profile_pic_url}
            alt="Avatar"
            className="w-10 h-10 rounded-full bg-[#E2E8F0] object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center font-bold text-sm">
            {(info.getValue() ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="font-semibold text-[#1A202C]">@{info.getValue() ?? ''}</div>
      </div>
    ),
  }),
  columnHelper.accessor('window_expires_at', {
    header: 'Janela 24h',
    cell: (info) => {
      const expires = info.getValue()
      const inWindow = expires ? isFuture(new Date(expires)) : false

      return (
        <div className="flex items-center gap-2">
          {inWindow ? (
            <div className="px-2.5 py-1 bg-[#DEF7EC] text-[#03543F] rounded-full flex items-center gap-1.5 border border-[#31C48D]/20">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">Dentro da Janela</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 bg-[#F3F4F6] text-[#718096] rounded-full flex items-center gap-1.5 border border-[#E2E8F0]">
              <div className="h-2 w-2 rounded-full bg-[#CBD5E0]"></div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-[#94A3B8]">Janela Fechada</span>
            </div>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor('tags', {
    header: 'Tags Segmentação',
    cell: (info) => {
      const tags = info.getValue() || []
      return (
        <div className="flex gap-1 flex-wrap">
          {tags.length > 0 ? (
            tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E2E8F0] text-[#4A5568] uppercase"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#A0AEC0]">-</span>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor('created_at', {
    header: 'Capturado em',
    cell: (info) => (
      <span className="text-sm text-[#718096]">
        {format(new Date(info.getValue() || new Date()), "dd 'de' MMM, yyyy", {
          locale: ptBR,
        })}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    cell: (info) => (
      <Link
        href={`/contatos/${info.row.original.id}`}
        className="text-[#2B7FFF] font-semibold hover:text-[#1A6FEF] text-sm"
      >
        Ver Perfil
      </Link>
    ),
  }),
]

export function ContactsTable({ data }: ContactsTableProps) {
  const [search, setSearch] = useState('')
  const [windowFilter, setWindowFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [tagFilter, setTagFilter] = useState('')

  // Tags únicas de toda a base (não afetadas pelos filtros ativos)
  const allTags = useMemo(
    () => Array.from(new Set(data.flatMap((c) => c.tags ?? []))).sort(),
    [data]
  )

  const filteredData = useMemo(() => {
    return data.filter((contact) => {
      const matchesSearch =
        !search ||
        (contact.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (contact.full_name ?? '').toLowerCase().includes(search.toLowerCase())

      const isActive = contact.window_expires_at
        ? isFuture(new Date(contact.window_expires_at))
        : false

      const matchesWindow =
        windowFilter === 'all' ||
        (windowFilter === 'active' && isActive) ||
        (windowFilter === 'expired' && !isActive)

      const matchesTag =
        !tagFilter || (contact.tags ?? []).includes(tagFilter)

      return matchesSearch && matchesWindow && matchesTag
    })
  }, [data, search, windowFilter, tagFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Busca por username */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por @usuário..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] transition-all"
          />
        </div>

        {/* Filtro de janela */}
        <select
          value={windowFilter}
          onChange={(e) => setWindowFilter(e.target.value as typeof windowFilter)}
          className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#4A5568] outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] cursor-pointer"
        >
          <option value="all">Todas as janelas</option>
          <option value="active">Janela ativa</option>
          <option value="expired">Janela expirada</option>
        </select>

        {/* Filtro de tag */}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#4A5568] outline-none focus:ring-2 focus:ring-[#2B7FFF]/20 focus:border-[#2B7FFF] cursor-pointer"
          >
            <option value="">Todas as tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}

        {/* Contador de resultados */}
        <span className="text-xs text-[#718096] ml-auto shrink-0">
          Exibindo{' '}
          <strong className="text-[#1A202C]">{filteredData.length}</strong> de{' '}
          <strong className="text-[#1A202C]">{data.length}</strong> contatos
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FB] border-b border-[#E2E8F0]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-semibold text-[#718096] uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#E2E8F0] hover:bg-[#F8F9FB] transition-colors last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="p-12 text-center text-[#718096]">
              {data.length === 0
                ? 'Nenhum contato encontrado na sua base.'
                : 'Nenhum contato corresponde aos filtros aplicados.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
