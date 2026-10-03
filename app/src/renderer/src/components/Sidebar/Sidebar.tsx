import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/* ─── SVG icon helpers ──────────────────────────────────────── */
const IconBook = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
  </svg>
)

const IconLogin = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 17l5-5-5-5v3H3v4h7v3zm4-15H5a2 2 0 0 0-2 2v4h2V4h9v16H5v-4H3v4a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
  </svg>
)

const IconPeople = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
)

const IconProfile = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
)

const IconPower = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.28 1.09-4.3 2.58-5.42L6.17 5.17A8.932 8.932 0 0 0 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
  </svg>
)

const IconWrench = (): React.JSX.Element => (
  <svg className='w-6 h-6 shrink-0' viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

/* ─── Nav item definition ────────────────────────────────────── */
interface NavItem {
  label: string
  icon: React.JSX.Element
  route: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Campanhas', icon: <IconBook />, route: '/home' },
  { label: 'Acessar Sessão', icon: <IconLogin />, route: '/join-campaign' },
  { label: 'Sistemas RPG', icon: <IconWrench />, route: '/systems' },
  { label: 'Homebrew', icon: <IconBook />, route: '/homebrew' },
  { label: 'Amigos', icon: <IconPeople />, route: '/friends' },
]

const NAV_ITEMS_BOTTOM: NavItem[] = [
  { label: 'Perfil', icon: <IconProfile />, route: '/profile' },
  { label: 'Encerrar', icon: <IconPower />, route: '/' },
]

/* ─── Component ─────────────────────────────────────────────── */
export default function Sidebar(): React.JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = (): void => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`${expanded ? 'w-72' : 'w-20'} 
        min-h-screen shrink-0 select-none relative z-50
        transition-[width] duration-300 ease-in-out 
        bg-vtt-dark/70 backdrop-blur-md 
        shadow-[12px_0_30px_-4px_rgba(0,0,0,0.8)]`}
    >
      <section className='h-full flex flex-col justify-between py-8 px-3 transition-all duration-300'>
        {/* TOP: HEADER (TITLE + MINIMIZE/EXPAND BUTTON) */}
        <div className={`flex items-center ${expanded ? 'justify-between px-3' : 'justify-center'} w-full min-h-10`}>
          {expanded && (
            <span className='text-xl font-bold whitespace-nowrap text-vtt-golden tracking-wide'>
              Loot & Dice
            </span>
          )}
          <button
            type='button'
            onClick={() => setExpanded(prev => !prev)}
            className='flex items-center justify-center w-8 h-8 rounded-md hover:bg-vtt-dark-gray transition-colors text-vtt-light cursor-pointer'
            title={expanded ? 'Recolher menu' : 'Expandir menu'}
          >
            {expanded ? '«' : '»'}
          </button>
        </div>

        {/* MIDDLE: NAV ITEMS */}
        <div className='flex flex-col gap-1.5'>
          {NAV_ITEMS.map((item, index) => {
            const isActive = location.pathname === item.route
            return (
              <div
                key={index}
                onClick={() => navigate(item.route)}
                // Aplicada a borda em Y (em cima e em baixo) e trocado a cor ativa para borda dark-red
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-md cursor-pointer transition-colors border-y-2 border-x-0 ${isActive
                  ? 'bg-vtt-dark-gray/50 border-vtt-golden text-vtt-golden'
                  : 'border-transparent text-neutral-300 hover:bg-vtt-dark-gray/60 hover:text-vtt-light'
                  }`}
                title={!expanded ? item.label : undefined}
              >
                {item.icon}
                {expanded && <span className='text-sm font-medium whitespace-nowrap'>{item.label}</span>}
              </div>
            )
          })}
        </div>

        {/* BOTTOM: LOGOUT AND PROFILE BUTTONS */}
        <div className='flex flex-col gap-1.5'>
          <div
            onClick={() => navigate(NAV_ITEMS_BOTTOM[0].route)}
            className={`flex items-center gap-3.5 px-4 py-2.5 rounded-md cursor-pointer transition-colors border-y-2 border-x-0 ${location.pathname === NAV_ITEMS_BOTTOM[0].route
              ? 'bg-vtt-dark-gray/50 border-vtt-dark-red text-vtt-golden'
              : 'border-transparent text-neutral-300 hover:bg-vtt-dark-gray/60 hover:text-vtt-light'
              }`}
            title={!expanded ? NAV_ITEMS_BOTTOM[0].label : undefined}
          >
            {NAV_ITEMS_BOTTOM[0].icon}
            {expanded && <span className='text-sm font-medium whitespace-nowrap'>{NAV_ITEMS_BOTTOM[0].label}</span>}
          </div>

          <div
            onClick={handleLogout}
            className='flex items-center gap-3.5 px-4 py-2.5 rounded-md cursor-pointer transition-colors border-y-2 border-transparent text-neutral-300 hover:bg-vtt-red/20 hover:text-vtt-red'
            title={!expanded ? NAV_ITEMS_BOTTOM[1].label : undefined}
          >
            {NAV_ITEMS_BOTTOM[1].icon}
            {expanded && <span className='text-sm font-medium whitespace-nowrap'>{NAV_ITEMS_BOTTOM[1].label}</span>}
          </div>
        </div>
      </section>
    </aside>
  )
}