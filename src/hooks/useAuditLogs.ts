import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  hospital_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  old_values: any
  new_values: any
  ip_address: string
  user_agent: string
  data_category?: string
  is_sensitive?: boolean
  purpose?: string
  retention_period?: string
  created_at: string
}

interface AuditLogFilters {
  resourceType?: string
  resourceId?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  isSensitive?: boolean
  dataCategory?: string
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  const { hospitalId } = useAuth()

  // Load audit logs with pagination and filters
  const loadAuditLogs = async (
    page = 1, 
    pageSize = 20, 
    filters?: AuditLogFilters
  ) => {
    if (!hospitalId) return
    
    setLoading(true)
    try {
      // Calculate pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      
      // Start building the query
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .range(from, to)
      
      // Apply filters if provided
      if (filters) {
        if (filters.resourceType) {
          query = query.eq('resource_type', filters.resourceType)
        }
        
        if (filters.resourceId) {
          query = query.eq('resource_id', filters.resourceId)
        }
        
        if (filters.action) {
          query = query.eq('action', filters.action)
        }
        
        if (filters.userId) {
          query = query.eq('user_id', filters.userId)
        }
        
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom)
        }
        
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo)
        }
        
        if (filters.isSensitive !== undefined) {
          query = query.eq('is_sensitive', filters.isSensitive)
        }
        
        if (filters.dataCategory) {
          query = query.eq('data_category', filters.dataCategory)
        }
      }
      
      // Execute the query
      const { data, error, count } = await query
      
      if (error) throw error
      
      setLogs(data || [])
      setTotalCount(count || 0)
      setPage(page)
      setPageSize(pageSize)
    } catch (error: any) {
      console.error('Error loading audit logs:', error)
      toast.error("Failed to load audit logs", {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // Search audit logs
  const searchAuditLogs = async (searchTerm: string) => {
    if (!hospitalId || !searchTerm) return
    
    setLoading(true)
    try {
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .or(`resource_id.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%,resource_type.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(pageSize)
      
      if (error) throw error
      
      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Error searching audit logs:', error)
      toast.error("Failed to search audit logs", {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // Export audit logs
  const exportAuditLogs = async (filters?: AuditLogFilters) => {
    if (!hospitalId) return
    
    setLoading(true)
    try {
      // Start building the query
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
      
      // Apply filters if provided
      if (filters) {
        if (filters.resourceType) {
          query = query.eq('resource_type', filters.resourceType)
        }
        
        if (filters.resourceId) {
          query = query.eq('resource_id', filters.resourceId)
        }
        
        if (filters.action) {
          query = query.eq('action', filters.action)
        }
        
        if (filters.userId) {
          query = query.eq('user_id', filters.userId)
        }
        
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom)
        }
        
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo)
        }
      }
      
      // Execute the query
      const { data, error } = await query
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast("No Data", {
          description: "No audit logs found to export"
        })
        return
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]).filter(key => 
        !['old_values', 'new_values'].includes(key)
      )
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            }
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          }).join(',')
        )
      ].join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Export Successful", {
        description: `Exported ${data.length} audit log records`
      })
    } catch (error: any) {
      console.error('Error exporting audit logs:', error)
      toast.error("Export Failed", {
        description: `Failed to export audit logs: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  // Load logs on initial render
  useEffect(() => {
    if (hospitalId) {
      loadAuditLogs()
    }
  }, [hospitalId])

  return {
    logs,
    loading,
    totalCount,
    page,
    pageSize,
    loadAuditLogs,
    searchAuditLogs,
    exportAuditLogs,
    setPage,
    setPageSize
  }
}