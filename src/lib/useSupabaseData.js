import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

export function useSupabaseData(table, options = {}) {
  const { user, profile } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const { orderBy = 'created_at', ascending = false, showShared = false } = options

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      let query = supabase.from(table).select('*')

      if (showShared && profile?.partner_id) {
        query = query.or(`user_id.eq.${user.id},and(user_id.eq.${profile.partner_id},is_shared.eq.true)`)
      } else {
        query = query.eq('user_id', user.id)
      }

      if (orderBy) query = query.order(orderBy, { ascending })

      const { data: rows, error } = await query

      if (error) {
        console.error(`Error fetching ${table}:`, error)
        setData([])
      } else {
        setData(rows || [])
      }
    } catch (err) {
      console.error(`Unexpected error fetching ${table}:`, err)
      setData([])
    }
    setLoading(false)
  }, [user, profile, table, orderBy, ascending, showShared])

  useEffect(() => {
    fetchData()

    // Realtime subscription with unique channel name
    const channelName = `${table}-${user?.id || 'anon'}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
      }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, table, user?.id])

  const insert = async (row) => {
    try {
      const { data: newRow, error } = await supabase
        .from(table)
        .insert({ ...row, user_id: user.id })
        .select()
        .single()
      if (error) {
        console.error(`Error inserting into ${table}:`, error)
        return { data: null, error }
      }
      setData(prev => ascending ? [...prev, newRow] : [newRow, ...prev])
      return { data: newRow, error: null }
    } catch (err) {
      console.error(`Unexpected error inserting into ${table}:`, err)
      return { data: null, error: err }
    }
  }

  const update = async (id, changes) => {
    try {
      const { error } = await supabase.from(table).update(changes).eq('id', id)
      if (error) {
        console.error(`Error updating ${table}:`, error)
        return { error }
      }
      setData(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  const remove = async (id) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
        return { error }
      }
      setData(prev => prev.filter(r => r.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  return { data, loading, insert, update, remove, refetch: fetchData }
}
