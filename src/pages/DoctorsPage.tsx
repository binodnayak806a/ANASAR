import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DoctorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Doctors
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage doctor profiles and schedules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Management</CardTitle>
          <CardDescription>
            This module will contain doctor registration, schedule management, and profile features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Doctor management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}