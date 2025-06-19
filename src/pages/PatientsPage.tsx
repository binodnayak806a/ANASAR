import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Patients
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage patient records and information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Management</CardTitle>
          <CardDescription>
            This module will contain patient registration, search, and management features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Patient management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}