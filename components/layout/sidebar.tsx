'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  Megaphone,
  Users,
  Tag,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/automacoes',    label: 'Automações',    icon: Zap },
  { href: '/broadcast',     label: 'Broadcast',     icon: Megaphone },
  { href: '/contatos',      label: 'Contatos',      icon: Users },
  { href: '/tags',          label: 'Tags',          icon: Tag },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="glass-sidebar flex flex-col h-screen transition-all duration-200 flex-shrink-0 relative z-10"
      style={{ width: collapsed ? '64px' : '256px' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[rgba(59,130,246,0.08)]">
        <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L14 5.5V12.5L9 16L4 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
            <circle cx="9" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden">
            Agentise Chat
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] uppercase tracking-widest text-[#CBD5E1] font-medium">
            Menu
          </p>
        )}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[rgba(59,130,246,0.15)] text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[rgba(59,130,246,0.08)] hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Recolher */}
      <div className="px-2 pb-2 border-t border-[rgba(59,130,246,0.08)] pt-2">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#94A3B8] hover:bg-[rgba(59,130,246,0.08)] hover:text-white transition-colors"
        >
          <ChevronLeft
            size={18}
            className={`flex-shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>

      {/* Usuário + Logout */}
      <div className="px-2 pb-4 border-t border-[rgba(59,130,246,0.08)] pt-3">
        <div className={`flex items-center gap-3 px-3 py-2 mb-1 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {user.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <span className="text-xs text-[#94A3B8] truncate flex-1">
              {user.email}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#94A3B8] hover:bg-[rgba(59,130,246,0.08)] hover:text-red-400 transition-colors"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
