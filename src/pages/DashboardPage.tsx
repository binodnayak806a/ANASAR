import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Calendar, 
  UserCheck, 
  Receipt,
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  Bed,
  Building2,
  DollarSign,
  FileText,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { 
  patientService, 
  appointmentService, 
  doctorService, 
  billingService,
  ipdService 
} from '@/services/supabaseClient'
import { supabase } from '@/lib/supabase'

// Types
interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  activeDoctors: number
  monthlyRevenue: number
  occupiedBeds: number
  pendingBills: number
  todayRevenue: number
  avgWaitTime: number
}

interface RecentActivity {
  id: string
  type: 'appointment' | 'patient' | 'billing' | 'admission'
  message: string
  time: string
  icon: React.ComponentType<{ className?: string }>
  status?: 'success' | 'warning' | 'error'
}

interface QuickMetric {
  label: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease'
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    activeDoctors: 0,
    monthlyRevenue: 0,
    occupiedBeds: 0,
    pendingBills: 0,
    todayRevenue: 0,
    avgWaitTime: 0
  })
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()

  // Load dashboard data
  useEffect(() => {
    if (hospitalId) {
      loadDashboardData()
    }
  }, [hospitalId, selectedPeriod])

  // Real-time updates
  useEffect(() => {
    if (!hospitalId) return

    const channels = [
      supabase.channel(`dashboard_appointments_${hospitalId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospitalId}`
        }, () => loadDashboardData()),
      
      supabase.channel(`dashboard_patients_${hospitalId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `hospital_id=eq.${hospitalId}`
        }, () => loadDashboardData()),
      
      supabase.channel(`dashboard_bills_${hospitalId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `hospital_id=eq.${hospitalId}`
        }, () => loadDashboardData())
    ]

    channels.forEach(channel => channel.subscribe())

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [hospitalId])

  const loadDashboardData = async () => {
    if (!hospitalId) return

    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadRecentActivities()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Load patients
      const patientsResult = await patientService.getPatients(hospitalId)
      const totalPatients = patientsResult.success ? patientsResult.data?.length || 0 : 0

      // Load today's appointments
      const appointmentsResult = await appointmentService.getAppointmentsByDate(today, hospitalId)
      const todayAppointments = appointmentsResult.success ? appointmentsResult.data?.length || 0 : 0

      // Load doctors
      const doctorsResult = await doctorService.getDoctors(hospitalId)
      const activeDoctors = doctorsResult.success ? 
        doctorsResult.data?.filter(d => d.is_active).length || 0 : 0

      // Load bills for revenue calculation
      const billsResult = await billingService.getBills(hospitalId)
      const bills = billsResult.success ? billsResult.data || [] : []
      
      const monthlyRevenue = bills
        .filter(bill => bill.bill_date >= startOfMonth)
        .reduce((sum, bill) => sum + bill.total_amount, 0)
      
      const todayRevenue = bills
        .filter(bill => bill.bill_date === today)
        .reduce((sum, bill) => sum + bill.total_amount, 0)

      const pendingBills = bills
        .filter(bill => bill.payment_status === 'pending').length

      // Load IPD data
      const ipdResult = await ipdService.getIPDRecords(hospitalId)
      const occupiedBeds = ipdResult.success ? 
        ipdResult.data?.filter(record => record.status === 'admitted').length || 0 : 0

      setStats({
        totalPatients,
        todayAppointments,
        activeDoctors,
        monthlyRevenue,
        occupiedBeds,
        pendingBills,
        todayRevenue,
        avgWaitTime: 15 // Mock data - would calculate from appointment times
      })

    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadRecentActivities = async () => {
    try {
      // Mock recent activities - in real implementation, would aggregate from audit logs
      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'appointment',
          message: 'New appointment scheduled with Dr. Sharma',
          time: '2 minutes ago',
          icon: Calendar,
          status: 'success'
        },
        {
          id: '2',
          type: 'patient',
          message: 'Patient registration completed - UHID: UH123456',
          time: '5 minutes ago',
          icon: Users,
          status: 'success'
        },
        {
          id: '3',
          type: 'billing',
          message: 'Payment received - Bill #OPD001234',
          time: '10 minutes ago',
          icon: Receipt,
          status: 'success'
        },
        {
          id: '4',
          type: 'admission',
          message: 'IPD admission - Room GA-101-A',
          time: '15 minutes ago',
          icon: Bed,
          status: 'warning'
        }
      ]

      setRecentActivities(activities)
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  // Quick metrics calculation
  const getQuickMetrics = (): QuickMetric[] => [
    {
      label: 'Today\'s Revenue',
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      change: 12.5,
      changeType: 'increase',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Bed Occupancy',
      value: `${stats.occupiedBeds}/50`,
      change: -5.2,
      changeType: 'decrease',
      icon: Bed,
      color: 'text-blue-600'
    },
    {
      label: 'Avg Wait Time',
      value: `${stats.avgWaitTime} min`,
      change: -8.1,
      changeType: 'decrease',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      label: 'Pending Bills',
      value: stats.pendingBills,
      change: 3.2,
      changeType: 'increase',
      icon: AlertCircle,
      color: 'text-red-600'
    }
  ]

  const getActivityIcon = (activity: RecentActivity) => {
    const Icon = activity.icon
    const statusColors = {
      success: 'text-green-600 bg-green-100',
      warning: 'text-orange-600 bg-orange-100',
      error: 'text-red-600 bg-red-100'
    }
    
    return (
      <div className={`p-2 rounded-full ${statusColors[activity.status || 'success']}`}>
        <Icon className="w-4 h-4" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const quickMetrics = getQuickMetrics()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back! Here's what's happening at your hospital today.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedPeriod === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('today')}
            >
              Today
            </Button>
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              Month
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Patients
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalPatients.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +12% from last month
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Appointments
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.todayAppointments}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +3 from yesterday
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Doctors
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.activeDoctors}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  All available
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Monthly Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{stats.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +8% from last month
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickMetrics.map((metric, index) => {
          const Icon = metric.icon
          const ChangeIcon = metric.changeType === 'increase' ? ArrowUp : ArrowDown
          const changeColor = metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                    <div className={`flex items-center text-sm ${changeColor}`}>
                      <ChangeIcon className="w-3 h-3 mr-1" />
                      {Math.abs(metric.change)}%
                    </div>
                  </div>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activities</span>
            </CardTitle>
            <CardDescription>
              Latest updates and activities in your hospital
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {getActivityIcon(activity)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/opd/register'}
            >
              <Users className="w-4 h-4 mr-2" />
              Register New Patient
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/appointments'}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/ipd/admission'}
            >
              <Bed className="w-4 h-4 mr-2" />
              IPD Admission
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/billing/opd'}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Create OPD Bill
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/reports'}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{((stats.occupiedBeds / 50) * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Bed Occupancy</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(stats.occupiedBeds / 50) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">98.5%</div>
              <div className="text-sm text-gray-600">System Uptime</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.avgWaitTime} min</div>
              <div className="text-sm text-gray-600">Avg Wait Time</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-5 h-5" />
            <span>System Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {stats.pendingBills} pending bills require attention
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Monthly compliance report due in 3 days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}