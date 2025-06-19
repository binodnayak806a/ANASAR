import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TestTube, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  Bell
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

// Types
interface LabStats {
  totalSamples: number
  pendingTests: number
  completedToday: number
  criticalResults: number
  avgTurnaroundTime: number
  samplesPending: number
  resultsReady: number
  equipmentAlerts: number
}

interface SampleStatus {
  id: string
  sampleId: string
  patientName: string
  testName: string
  status: 'collected' | 'processing' | 'completed' | 'verified'
  priority: 'routine' | 'urgent' | 'stat'
  collectedAt: string
  expectedCompletion: string
}

export default function LabDashboardPage() {
  const [stats, setStats] = useState<LabStats>({
    totalSamples: 0,
    pendingTests: 0,
    completedToday: 0,
    criticalResults: 0,
    avgTurnaroundTime: 0,
    samplesPending: 0,
    resultsReady: 0,
    equipmentAlerts: 0
  })
  
  const [recentSamples, setRecentSamples] = useState<SampleStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()
  const navigate = useNavigate()

  // Load dashboard data
  useEffect(() => {
    if (hospitalId) {
      loadLabData()
    }
  }, [hospitalId])

  const loadLabData = async () => {
    setLoading(true)
    try {
      // Mock data - in real implementation, would load from database
      const mockStats: LabStats = {
        totalSamples: 156,
        pendingTests: 23,
        completedToday: 45,
        criticalResults: 3,
        avgTurnaroundTime: 4.2,
        samplesPending: 18,
        resultsReady: 12,
        equipmentAlerts: 2
      }

      const mockSamples: SampleStatus[] = [
        {
          id: '1',
          sampleId: 'LAB001234',
          patientName: 'John Doe',
          testName: 'Complete Blood Count',
          status: 'processing',
          priority: 'routine',
          collectedAt: '2024-01-18T09:30:00Z',
          expectedCompletion: '2024-01-18T15:30:00Z'
        },
        {
          id: '2',
          sampleId: 'LAB001235',
          patientName: 'Jane Smith',
          testName: 'Liver Function Test',
          status: 'completed',
          priority: 'urgent',
          collectedAt: '2024-01-18T08:15:00Z',
          expectedCompletion: '2024-01-18T14:15:00Z'
        },
        {
          id: '3',
          sampleId: 'LAB001236',
          patientName: 'Mike Johnson',
          testName: 'Blood Sugar',
          status: 'verified',
          priority: 'stat',
          collectedAt: '2024-01-18T10:00:00Z',
          expectedCompletion: '2024-01-18T12:00:00Z'
        }
      ]

      setStats(mockStats)
      setRecentSamples(mockSamples)
    } catch (error) {
      console.error('Error loading lab data:', error)
      toast({
        title: "Error",
        description: "Failed to load lab data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadLabData()
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'verified': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800'
      case 'urgent': return 'bg-orange-100 text-orange-800'
      case 'routine': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lab dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Laboratory Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Laboratory Information Management System (LIMS)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={() => navigate('/lab/test-order')}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Order
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.criticalResults > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                {stats.criticalResults} critical result{stats.criticalResults !== 1 ? 's' : ''} require immediate attention
              </span>
              <Button size="sm" variant="outline" className="ml-auto">
                View Critical Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Samples
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalSamples}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Today
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <TestTube className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending Tests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.pendingTests}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  In progress
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completed Today
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.completedToday}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +12% from yesterday
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg TAT
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.avgTurnaroundTime}h
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Turnaround time
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Samples */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Samples</span>
            </CardTitle>
            <CardDescription>
              Latest sample processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSamples.map((sample) => (
                <div key={sample.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-100 rounded-full flex items-center justify-center">
                      <TestTube className="w-5 h-5 text-medical-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sample.sampleId}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {sample.patientName} • {sample.testName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Collected: {new Date(sample.collectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getStatusColor(sample.status)}>
                      {sample.status}
                    </Badge>
                    <Badge className={getPriorityColor(sample.priority)}>
                      {sample.priority}
                    </Badge>
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
              onClick={() => navigate('/lab/test-order')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test Order
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/lab/sample-collection')}
            >
              <TestTube className="w-4 h-4 mr-2" />
              Sample Collection
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/lab/results-entry')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Enter Results
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/lab/reports')}
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/lab/quality-control')}
            >
              <Activity className="w-4 h-4 mr-2" />
              Quality Control
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sample Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Collection</span>
                <Badge variant="outline">{stats.samplesPending}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Collected Today</span>
                <Badge variant="outline">{stats.totalSamples}</Badge>
              </div>
              <Button size="sm" className="w-full">
                View Collection Queue
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">In Progress</span>
                <Badge variant="outline">{stats.pendingTests}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Equipment Alerts</span>
                <Badge variant="destructive">{stats.equipmentAlerts}</Badge>
              </div>
              <Button size="sm" className="w-full">
                View Processing Queue
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ready for Review</span>
                <Badge variant="outline">{stats.resultsReady}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Critical Results</span>
                <Badge variant="destructive">{stats.criticalResults}</Badge>
              </div>
              <Button size="sm" className="w-full">
                Review Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}