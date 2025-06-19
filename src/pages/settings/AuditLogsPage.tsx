import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  Calendar,
  Loader2
} from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { 
    logs, 
    loading, 
    totalCount, 
    page, 
    pageSize, 
    loadAuditLogs, 
    searchAuditLogs, 
    exportAuditLogs,
    setPage
  } = useAuditLogs()

  // Apply filters
  const applyFilters = () => {
    const filters: any = {}
    
    if (selectedAction !== 'all') {
      filters.action = selectedAction
    }
    
    if (selectedResourceType !== 'all') {
      filters.resourceType = selectedResourceType
    }
    
    if (selectedCategory !== 'all') {
      filters.dataCategory = selectedCategory
    }
    
    if (dateFrom) {
      filters.dateFrom = dateFrom
    }
    
    if (dateTo) {
      filters.dateTo = dateTo
    }
    
    loadAuditLogs(1, pageSize, filters)
  }

  // Reset filters
  const resetFilters = () => {
    setSelectedAction('all')
    setSelectedResourceType('all')
    setSelectedCategory('all')
    setDateFrom('')
    setDateTo('')
    loadAuditLogs(1, pageSize)
  }

  // Handle search
  const handleSearch = () => {
    if (searchQuery) {
      searchAuditLogs(searchQuery)
    } else {
      loadAuditLogs(page, pageSize)
    }
  }

  // View log details
  const viewLogDetails = (log: any) => {
    setSelectedLog(log)
    setIsDialogOpen(true)
  }

  // Get unique resource types from logs
  const getUniqueResourceTypes = () => {
    const types = new Set(logs.map(log => log.resource_type))
    return Array.from(types)
  }

  // Get unique actions from logs
  const getUniqueActions = () => {
    const actions = new Set(logs.map(log => log.action))
    return Array.from(actions)
  }

  // Get unique data categories from logs
  const getUniqueCategories = () => {
    const categories = new Set(logs.map(log => log.data_category || 'general'))
    return Array.from(categories)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      case 'NOTIFICATION_SENT':
        return 'bg-purple-100 text-purple-800'
      case 'DSAR_GENERATED':
        return 'bg-orange-100 text-orange-800'
      case 'ERASURE_REQUEST':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'patient_data':
        return 'bg-blue-100 text-blue-800'
      case 'medical_data':
        return 'bg-purple-100 text-purple-800'
      case 'financial_data':
        return 'bg-green-100 text-green-800'
      case 'operational_data':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Audit Logs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and search audit logs for compliance and security monitoring
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div>
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resource Type</Label>
              <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getUniqueResourceTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date From</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Date To</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Audit Logs</span>
            </CardTitle>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => loadAuditLogs(page, pageSize)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportAuditLogs()}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <CardDescription>
            {totalCount} total records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-medical-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {formatTimestamp(log.created_at)}
                        </TableCell>
                        <TableCell>
                          {log.user_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.resource_type}/{log.resource_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(log.data_category || 'general')}>
                            {log.data_category || 'general'}
                          </Badge>
                          {log.is_sensitive && (
                            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                              Sensitive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewLogDetails(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * pageSize >= totalCount || loading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected audit log
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {formatTimestamp(selectedLog.created_at)}
                  </div>
                </div>
                <div>
                  <Label>Action</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    <Badge className={getActionColor(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>User ID</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedLog.user_id}
                  </div>
                </div>
                <div>
                  <Label>Resource</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedLog.resource_type}/{selectedLog.resource_id}
                  </div>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedLog.ip_address}
                  </div>
                </div>
                <div>
                  <Label>Data Category</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    <Badge className={getCategoryColor(selectedLog.data_category || 'general')}>
                      {selectedLog.data_category || 'general'}
                    </Badge>
                    {selectedLog.is_sensitive && (
                      <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                        Sensitive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <Label>Previous Values</Label>
                  <pre className="p-2 bg-gray-50 rounded border mt-1 overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <Label>New Values</Label>
                  <pre className="p-2 bg-gray-50 rounded border mt-1 overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <Label>User Agent</Label>
                <div className="p-2 bg-gray-50 rounded border mt-1 text-xs break-all">
                  {selectedLog.user_agent}
                </div>
              </div>

              {selectedLog.purpose && (
                <div>
                  <Label>Purpose</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedLog.purpose}
                  </div>
                </div>
              )}

              {selectedLog.retention_period && (
                <div>
                  <Label>Retention Period</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedLog.retention_period}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}