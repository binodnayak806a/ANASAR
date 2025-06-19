import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  Trash2, 
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  HardDrive,
  FileWarning,
  Users
} from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'

export default function OfflineSettings() {
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  const { 
    isOnline, 
    isSyncing, 
    lastSyncTime, 
    pendingChanges, 
    conflicts,
    syncNow, 
    cacheEssentialData,
    getCacheStats,
    cleanExpiredCache
  } = useOffline()
  
  const { stats: queueStats, loadQueueItems } = useSyncQueue()
  const { hospitalId } = useAuth()

  // Load cache stats on mount
  useEffect(() => {
    loadCacheStats()
  }, [])

  // Load cache statistics
  const loadCacheStats = async () => {
    setIsLoadingStats(true)
    try {
      const stats = await getCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Error loading cache stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Handle cache essential data
  const handleCacheData = async () => {
    if (!hospitalId) return
    await cacheEssentialData()
    await loadCacheStats()
  }

  // Handle clean cache
  const handleCleanCache = async () => {
    await cleanExpiredCache()
    await loadCacheStats()
  }

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never'
    return formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <span>Offline Mode Settings</span>
        </CardTitle>
        <CardDescription>
          Configure offline capabilities and synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            {isOnline ? (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div>
              <h3 className="font-medium">
                {isOnline ? 'Online Mode' : 'Offline Mode'}
              </h3>
              <p className="text-sm text-gray-500">
                {isOnline 
                  ? 'Connected to server. Changes are saved in real-time.' 
                  : 'Working offline. Changes will sync when connection is restored.'}
              </p>
            </div>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Sync Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Synchronization</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncNow}
              disabled={!isOnline || isSyncing}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Last Sync</span>
              </div>
              <p className="text-lg">{formatLastSync()}</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Pending Changes</span>
              </div>
              <p className="text-lg">{pendingChanges}</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileWarning className="w-4 h-4 text-red-500" />
                <span className="font-medium">Conflicts</span>
              </div>
              <p className="text-lg">{conflicts}</p>
            </div>
          </div>

          {pendingChanges > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
                  You have {pendingChanges} pending changes to sync
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {isOnline 
                  ? 'Click "Sync Now" to upload your changes to the server.' 
                  : 'Changes will automatically sync when you\'re back online.'}
              </p>
            </div>
          )}

          {conflicts > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <FileWarning className="w-4 h-4" />
                <span className="font-medium">
                  {conflicts} data conflicts detected
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Please review and resolve conflicts in the Sync Management section.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
              >
                Resolve Conflicts
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Offline Cache */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Offline Cache</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCacheData}
                disabled={!isOnline || isSyncing}
              >
                <Download className="w-4 h-4 mr-2" />
                Cache Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCleanCache}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Cache
              </Button>
            </div>
          </div>

          {isLoadingStats ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : cacheStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Patients</span>
                  </div>
                  <p className="text-lg">{cacheStats.patients}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileWarning className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Consultations</span>
                  </div>
                  <p className="text-lg">{cacheStats.consultations}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileWarning className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Prescriptions</span>
                  </div>
                  <p className="text-lg">{cacheStats.prescriptions}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Total Size</span>
                  </div>
                  <p className="text-lg">{cacheStats.totalSize}</p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Storage Usage</h4>
                <Progress value={Math.min(cacheStats.patients / 2, 100)} className="h-2 mb-1" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              No cache statistics available
            </div>
          )}
        </div>

        <Separator />

        {/* Offline Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">Automatic Sync</Label>
                <p className="text-sm text-gray-500">
                  Automatically sync changes when online
                </p>
              </div>
              <Switch id="auto-sync" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="background-sync">Background Sync</Label>
                <p className="text-sm text-gray-500">
                  Sync in the background even when app is closed
                </p>
              </div>
              <Switch id="background-sync" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-cache">Auto-Cache Patients</Label>
                <p className="text-sm text-gray-500">
                  Automatically cache patient data when viewed
                </p>
              </div>
              <Switch id="auto-cache" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="offline-notifications">Offline Notifications</Label>
                <p className="text-sm text-gray-500">
                  Show notifications when working offline
                </p>
              </div>
              <Switch id="offline-notifications" defaultChecked />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}