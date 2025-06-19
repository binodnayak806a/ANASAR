import React from 'react'
import { useOffline } from '@/hooks/useOffline'
import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function OfflineStatusBar() {
  const { isOnline, isSyncing, pendingChanges, syncNow } = useOffline()

  // Don't show anything if online and no pending changes
  if (isOnline && pendingChanges === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-2 flex items-center justify-between",
        isOnline ? "bg-blue-50 text-blue-800 border-t border-blue-200" : "bg-red-50 text-red-800 border-t border-red-200"
      )}
    >
      <div className="flex items-center space-x-2 px-4">
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline 
            ? pendingChanges > 0 
              ? `Online - ${pendingChanges} changes pending sync` 
              : "Online"
            : "Offline - Changes will sync when connection is restored"}
        </span>
      </div>
      
      {isOnline && pendingChanges > 0 && (
        <Button 
          size="sm" 
          variant="outline" 
          className={cn(
            "mr-4 text-xs",
            "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
          )}
          onClick={syncNow}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      )}
    </div>
  )
}