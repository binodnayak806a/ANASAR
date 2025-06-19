import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { User as AppUser } from '@/types'
import { toast } from 'sonner'

interface AuthState {
  user: AppUser | null
  session: Session | null
  hospitalId: string | null
  role: string | null
  loading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (data: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>
}

export function useAuth(): AuthState & AuthActions {
  const {
    user,
    session,
    hospitalId,
    loading,
    isAuthenticated,
    signOut: storeSignOut,
    updateProfile: storeUpdateProfile,
    setUser,
    setSession,
    setLoading,
    initialize
  } = useAuthStore()

  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isInitialized) {
        await initialize()
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [initialize, isInitialized])

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setLoading(true)
        setSession(session)

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // Fetch user profile from our users table
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!error && userProfile) {
              setUser(userProfile)
              
              // Update last login timestamp
              await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', session.user.id)
            } else {
              console.error('Failed to fetch user profile:', error)
              setUser(null)
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Optionally refresh user profile on token refresh
            const { data: userProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (userProfile) {
              setUser(userProfile)
            }
          }
        } catch (error) {
          console.error('Error handling auth state change:', error)
          setUser(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setSession, setLoading])

  // Enhanced sign out function
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await storeSignOut()
      
      // Clear any cached data
      localStorage.removeItem('auth-storage')
      
      // Redirect to login page
      window.location.href = '/login'
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }, [storeSignOut, setLoading])

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        await signOut()
        return
      }

      if (session?.user) {
        // Fetch updated user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profileError && userProfile) {
          setUser(userProfile)
          setSession(session)
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error)
      await signOut()
    } finally {
      setLoading(false)
    }
  }, [setUser, setSession, setLoading, signOut])

  // Update profile function
  const updateProfile = useCallback(async (data: Partial<AppUser>) => {
    return await storeUpdateProfile(data)
  }, [storeUpdateProfile])

  // Auto-refresh session periodically
  useEffect(() => {
    if (!isAuthenticated || !session) return

    const refreshInterval = setInterval(async () => {
      const now = new Date().getTime()
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      
      // Refresh if session expires in the next 5 minutes
      if (expiresAt - now < 5 * 60 * 1000) {
        await refreshSession()
      }
    }, 60 * 1000) // Check every minute

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated, session, refreshSession])

  return {
    user,
    session,
    hospitalId,
    role: user?.role || null,
    loading: loading || !isInitialized,
    isAuthenticated,
    signOut,
    refreshSession,
    updateProfile
  }
}