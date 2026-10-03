import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Campaign, CreateCampaignPayload, UpdateCampaignPayload, RpgSystem } from '../../../preload/index.d'
import { useAuth } from './AuthContext'

interface CampaignContextValue {
  campaigns: Campaign[]
  systems: RpgSystem[]
  isLoading: boolean
  fetchMyCampaigns: () => Promise<void>
  fetchSystems: () => Promise<void>
  createCampaign: (payload: CreateCampaignPayload) => Promise<string | null>
  updateCampaign: (payload: UpdateCampaignPayload) => Promise<string | null>
  deleteCampaign: (id: number) => Promise<string | null>
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [systems, setSystems] = useState<RpgSystem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMyCampaigns = useCallback(async () => {
    if (!user) {
      setCampaigns([])
      return
    }
    setIsLoading(true)
    const result = await window.api.campaigns.getByUser(user.id)
    setCampaigns(result)
    setIsLoading(false)
  }, [user])

  const fetchSystems = useCallback(async () => {
    if (!user) {
      setSystems([])
      return
    }
    try {
      const result = await window.api.campaigns.getSystems()
      setSystems(result)
    } catch (err) {
      console.error('Error fetching systems:', err)
    }
  }, [user])

  // Load campaigns and RPG systems whenever the logged-in user changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyCampaigns()
    fetchSystems()
  }, [fetchMyCampaigns, fetchSystems])

  const createCampaign = useCallback(async (payload: CreateCampaignPayload): Promise<string | null> => {
    const result = await window.api.campaigns.create(payload)
    if (!result.success || !result.campaign)
      return result.error ?? 'Falha ao criar campanha.'
    setCampaigns(prev => [result.campaign!, ...prev])
    return null
  }, [])

  const updateCampaign = useCallback(async (payload: UpdateCampaignPayload): Promise<string | null> => {
    const result = await window.api.campaigns.update(payload)
    if (!result.success || !result.campaign)
      return result.error ?? 'Falha ao atualizar campanha.'
    setCampaigns(prev => prev.map(c => (c.id === payload.id ? { ...c, ...result.campaign } : c)))
    return null
  }, [])

  const deleteCampaign = useCallback(async (id: number): Promise<string | null> => {
    const result = await window.api.campaigns.delete(id)
    if (!result.success)
      return result.error ?? 'Falha ao excluir campanha.'
    setCampaigns(prev => prev.filter(c => c.id !== id))
    return null
  }, [])

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        systems,
        isLoading,
        fetchMyCampaigns,
        fetchSystems,
        createCampaign,
        updateCampaign,
        deleteCampaign
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCampaigns(): CampaignContextValue {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaigns must be used inside <CampaignProvider>')
  return ctx
}
