import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TrendData {
  date: string
  revenue: number
  appointments: number
  day: string
}

interface TrendChartProps {
  data: TrendData[]
  title: string
  description?: string
  loading?: boolean
}

export default function TrendChart({ data, title, description, loading = false }: TrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-gray-200 rounded-lg"></div>
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue))
  const maxAppointments = Math.max(...data.map(d => d.appointments))
  
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalAppointments = data.reduce((sum, d) => sum + d.appointments, 0)
  
  const avgRevenue = totalRevenue / data.length
  const revenueGrowth = data.length > 1 
    ? ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100 
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={revenueGrowth >= 0 ? 'default' : 'destructive'}>
              {revenueGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(revenueGrowth).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Revenue</p>
              <p className="text-lg font-semibold">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Appointments</p>
              <p className="text-lg font-semibold">{totalAppointments}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 relative">
            <div className="absolute inset-0 flex items-end justify-between space-x-1">
              {data.map((item, index) => {
                const revenueHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                const appointmentHeight = maxAppointments > 0 ? (item.appointments / maxAppointments) * 100 : 0
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                    {/* Revenue Bar */}
                    <div className="w-full flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 relative group"
                        style={{ height: `${revenueHeight}%`, minHeight: '4px' }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ₹{item.revenue.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Appointments indicator */}
                      <div 
                        className="w-2 bg-green-500 rounded-full mt-1"
                        style={{ height: `${Math.max(appointmentHeight * 0.3, 2)}px` }}
                        title={`${item.appointments} appointments`}
                      />
                    </div>
                    
                    {/* Day label */}
                    <div className="text-xs text-gray-600 text-center">
                      {item.day}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Revenue</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Appointments</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}