import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Campaign, CreateCampaignPayload, RpgSystem } from '../../../preload/index.d'
import { useAuth } from './AuthContext'

interface CampaignContextValue {
  campaigns: Campaign[]
  systems: RpgSystem[]
  isLoading: boolean
  fetchMyCampaigns: () => Promise<void>
  fetchSystems: () => Promise<void>
  createCampaign: (payload: CreateCampaignPayload) => Promise<string | null>
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [systems, setSystems] = useState<RpgSystem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMyCampaigns = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const result = await window.api.campaigns.getByUser(user.id)
    setCampaigns(result)
    setIsLoading(false)
  }, [user])

  const fetchSystems = useCallback(async () => {
    try {
      const result = await window.api.campaigns.getSystems()
      setSystems(result)
    } catch (err) {
      console.error('Error fetching systems:', err)
    }
  }, [])

  // Load campaigns and RPG systems whenever the logged-in user changes
  useEffect(() => {
    if (!user) {
      setCampaigns([])
      setSystems([])
      return
    }
    fetchMyCampaigns()
    fetchSystems()
  }, [user, fetchMyCampaigns, fetchSystems])

  const createCampaign = useCallback(async (payload: CreateCampaignPayload): Promise<string | null> => {
    const result = await window.api.campaigns.create(payload)
    if (!result.success || !result.campaign)
      return result.error ?? 'Falha ao criar campanha.'
    setCampaigns(prev => [result.campaign!, ...prev])
    return null
  }, [])

  return (
    <CampaignContext.Provider value={{ campaigns, systems, isLoading, fetchMyCampaigns, fetchSystems, createCampaign }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaigns(): CampaignContextValue {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaigns must be used inside <CampaignProvider>')
  return ctx
}
