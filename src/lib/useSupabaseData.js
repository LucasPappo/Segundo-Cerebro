import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

export function useSupabaseData(table, options = {}) {
  const { user, profile } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const { orderBy = 'created_at', ascending = false, showShared = false } = options

  const fetchData = useCallback(async () => {
    if (!user) return

    let query = supabase.from(table).select('*')

    if (showShared && profile?.partner_id) {
      // Get own + partner's shared items
      query = query.or(`user_id.eq.${user.id},and(user_id.eq.${profile.partner_id},is_shared.eq.true)`)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (orderBy) query = query.order(orderBy, { ascending })

    const { data: rows, error } = await query
    if (!error) setData(rows || [])
    setLoading(false)
  }, [user, profile, table, orderBy, ascending, showShared])

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchData, table])

  const insert = async (row) => {
    const { data: newRow, error } = await supabase
      .from(table)
      .insert({ ...row, user_id: user.id })
      .select()
      .single()
    if (!error) setData(prev => ascending ? [...prev, newRow] : [newRow, ...prev])
    return { data: newRow, error }
  }

  const update = async (id, changes) => {
    const { error } = await supabase.from(table).update(changes).eq('id', id)
    if (!error) setData(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) setData(prev => prev.filter(r => r.id !== id))
    return { error }
  }

  return { data, loading, insert, update, remove, refetch: fetchData }
}
