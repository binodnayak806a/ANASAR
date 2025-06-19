import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Inventory
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage medical supplies and equipment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>
            This module will contain stock management, supplier tracking, and procurement features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Inventory management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}