import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        // If table doesn't exist or other error, still let the app load
        setProfile(null)
      } else if (!data) {
        // Profile doesn't exist yet - create it manually
        console.log('Profile not found, creating...')
        const currentUser = (await supabase.auth.getUser()).data.user
        if (currentUser) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: currentUser.id,
              email: currentUser.email,
              display_name: currentUser.user_metadata?.display_name || currentUser.email.split('@')[0],
              partner_code: Math.random().toString(36).substring(2, 10),
            })
            .select()
            .maybeSingle()

          if (insertError) {
            console.error('Error creating profile:', insertError)
            setProfile(null)
          } else {
            setProfile(newProfile)
          }
        }
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setProfile(null)
    }
    setLoading(false)
  }

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const linkPartner = async (code) => {
    const { data, error } = await supabase.rpc('link_partner', { code })
    if (error) return { error }
    if (data?.error) return { error: { message: data.error } }
    await fetchProfile(user.id)
    return { data }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut, linkPartner, fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
