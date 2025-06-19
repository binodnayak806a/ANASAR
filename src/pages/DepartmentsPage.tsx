import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Departments
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage hospital departments and services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Management</CardTitle>
          <CardDescription>
            This module will contain department setup, service management, and organizational features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Department management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}