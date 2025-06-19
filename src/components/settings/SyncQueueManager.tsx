import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Loader2
} from 'lucide-react'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useOffline } from '@/hooks/useOffline'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'

export default function SyncQueueManager() {
  const { queueItems, loading, stats, loadQueueItems, removeQueueItem, clearQueue, updateItemPriority } = useSyncQueue()
  const { syncNow, isOnline, isSyncing } = useOffline()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // View item details
  const viewItemDetails = (item: any) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  // Get operation color
  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3:
        return 'High'
      case 2:
        return 'Medium'
      case 1:
        return 'Low'
      default:
        return 'Normal'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return 'bg-red-100 text-red-800'
      case 2:
        return 'bg-orange-100 text-orange-800'
      case 1:
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Increase priority
  const increasePriority = async (id: string, currentPriority: number) => {
    if (currentPriority < 3) {
      await updateItemPriority(id, currentPriority + 1)
    }
  }

  // Decrease priority
  const decreasePriority = async (id: string, currentPriority: number) => {
    if (currentPriority > 0) {
      await updateItemPriority(id, currentPriority - 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Sync Queue Manager</span>
          </CardTitle>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadQueueItems}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearQueue}
              disabled={loading || queueItems.length === 0}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Queue
            </Button>
            <Button 
              size="sm"
              onClick={syncNow}
              disabled={!isOnline || isSyncing || queueItems.length === 0}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Manage pending changes waiting to be synchronized
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Items</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">By Operation</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.byOperation).map(([operation, count]) => (
                <Badge key={operation} className={getOperationColor(operation)}>
                  {operation}: {count}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">By Table</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.byTable).map(([table, count]) => (
                <Badge key={table} variant="outline">
                  {table}: {count}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">By Priority</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.byPriority).map(([priority, count]) => (
                <Badge key={priority} className={getPriorityColor(parseInt(priority))}>
                  {getPriorityLabel(parseInt(priority))}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Queue Items Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : queueItems.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">Sync queue is empty. All changes are synchronized.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Badge className={getOperationColor(item.operation)}>
                        {item.operation}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.table}</TableCell>
                    <TableCell>
                      {item.data?.id ? item.data.id.substring(0, 8) + '...' : 'N/A'}
                    </TableCell>
                    <TableCell>{formatTimestamp(item.timestamp)}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(item.priority)}>
                        {getPriorityLabel(item.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.retryCount > 0 ? (
                        <Badge variant="outline\" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          {item.retryCount}
                        </Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewItemDetails(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => increasePriority(item.id, item.priority)}
                          disabled={item.priority >= 3}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => decreasePriority(item.id, item.priority)}
                          disabled={item.priority <= 0}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeQueueItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Error Items */}
        {queueItems.some(item => item.retryCount > 0) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-medium">Sync Errors</h3>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Some items have failed to sync. You can increase their priority or remove them from the queue.
            </p>
            <div className="space-y-2">
              {queueItems
                .filter(item => item.retryCount > 0)
                .map(item => (
                  <div key={item.id} className="p-3 bg-white border border-yellow-200 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getOperationColor(item.operation)}>
                            {item.operation}
                          </Badge>
                          <span className="font-medium">{item.table}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.error || 'Unknown error'}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => increasePriority(item.id, item.priority)}
                          disabled={item.priority >= 3}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeQueueItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Item Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Queue Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected sync queue item
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Operation</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    <Badge className={getOperationColor(selectedItem.operation)}>
                      {selectedItem.operation}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Table</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedItem.table}
                  </div>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {new Date(selectedItem.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    <Badge className={getPriorityColor(selectedItem.priority)}>
                      {getPriorityLabel(selectedItem.priority)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Retry Count</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedItem.retryCount}
                  </div>
                </div>
                <div>
                  <Label>Error</Label>
                  <div className="p-2 bg-gray-50 rounded border mt-1">
                    {selectedItem.error || 'None'}
                  </div>
                </div>
              </div>

              <div>
                <Label>Data</Label>
                <pre className="p-2 bg-gray-50 rounded border mt-1 overflow-x-auto text-xs">
                  {JSON.stringify(selectedItem.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Label component
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
    </div>
  )
}

// CheckCircle component
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}