import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wifi, Database, RefreshCw } from 'lucide-react'
import OfflineSettings from '@/components/settings/OfflineSettings'
import SyncQueueManager from '@/components/settings/SyncQueueManager'

export default function OfflinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Offline Mode & Sync
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage offline capabilities, data synchronization, and cache settings
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Wifi className="w-4 h-4 mr-2" />
            Offline Settings
          </TabsTrigger>
          <TabsTrigger value="queue">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <OfflineSettings />
        </TabsContent>

        <TabsContent value="queue">
          <SyncQueueManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}