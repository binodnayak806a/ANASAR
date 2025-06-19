import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, auth } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
  hospitalId: string | null
  isAuthenticated: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData: any) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: any) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      hospitalId: null,
      isAuthenticated: false,

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true })
          
          const { data, error } = await auth.signIn(email, password)
          
          if (error) {
            return { success: false, error: error.message }
          }

          if (data.user) {
            // Fetch user profile from our users table
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profileError) {
              return { success: false, error: 'Failed to fetch user profile' }
            }

            set({
              user: userProfile,
              session: data.session,
              hospitalId: userProfile.hospital_id,
              isAuthenticated: true,
              loading: false
            })

            // Update last login
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', data.user.id)

            return { success: true }
          }

          return { success: false, error: 'Authentication failed' }
        } catch (error: any) {
          set({ loading: false })
          return { success: false, error: error.message }
        }
      },

      signUp: async (email: string, password: string, userData: any) => {
        try {
          set({ loading: true })
          
          const { data, error } = await auth.signUp(email, password, userData)
          
          if (error) {
            return { success: false, error: error.message }
          }

          if (data.user) {
            // Create user profile in our users table
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                full_name: userData.full_name,
                role: userData.role,
                hospital_id: userData.hospital_id,
                department_id: userData.department_id,
                employee_id: userData.employee_id,
                phone: userData.phone,
                is_active: true
              })

            if (profileError) {
              return { success: false, error: 'Failed to create user profile' }
            }

            return { success: true }
          }

          return { success: false, error: 'Registration failed' }
        } catch (error: any) {
          set({ loading: false })
          return { success: false, error: error.message }
        }
      },

      signOut: async () => {
        try {
          await auth.signOut()
          set({
            user: null,
            session: null,
            hospitalId: null,
            isAuthenticated: false,
            loading: false
          })
        } catch (error) {
          console.error('Sign out error:', error)
        }
      },

      resetPassword: async (email: string) => {
        try {
          const { error } = await auth.resetPassword(email)
          
          if (error) {
            return { success: false, error: error.message }
          }

          return { success: true }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const { user } = get()
          if (!user) return { success: false, error: 'No user logged in' }

          const { data: updatedUser, error } = await supabase
            .from('users')
            .update(data)
            .eq('id', user.id)
            .select()
            .single()

          if (error) {
            return { success: false, error: error.message }
          }

          set({ user: updatedUser })
          return { success: true }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      },

      initialize: async () => {
        try {
          set({ loading: true })
          
          const { data: { session } } = await auth.getSession()
          
          if (session?.user) {
            // Fetch user profile
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!error && userProfile) {
              set({
                user: userProfile,
                session,
                hospitalId: userProfile.hospital_id,
                isAuthenticated: true
              })
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
        } finally {
          set({ loading: false })
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          hospitalId: user?.hospital_id || null,
          isAuthenticated: !!user 
        })
      },

      setSession: (session: any) => {
        set({ session })
      },

      setLoading: (loading: boolean) => {
        set({ loading })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        hospitalId: state.hospitalId,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Listen to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const { setUser, setSession, setLoading } = useAuthStore.getState()
  
  setLoading(true)
  setSession(session)

  if (event === 'SIGNED_IN' && session?.user) {
    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (userProfile) {
      setUser(userProfile)
    }
  } else if (event === 'SIGNED_OUT') {
    setUser(null)
  }
  
  setLoading(false)
})