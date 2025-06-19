import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp,
  Users,
  Receipt,
  Bed,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Printer,
  Share,
  RefreshCw,
  Eye,
  Settings,
  Clock,
  DollarSign,
  UserCheck,
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { 
  patientService, 
  appointmentService, 
  billingService,
  ipdService,
  doctorService 
} from '@/services/supabaseClient'

// Types
interface ReportConfig {
  id: string
  name: string
  description: string
  category: 'financial' | 'clinical' | 'operational' | 'compliance'
  icon: React.ComponentType<{ className?: string }>
  parameters: ReportParameter[]
}

interface ReportParameter {
  name: string
  type: 'date' | 'daterange' | 'select' | 'multiselect'
  label: string
  required: boolean
  options?: { value: string; label: string }[]
}

interface GeneratedReport {
  id: string
  name: string
  generatedAt: string
  status: 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  size?: string
}

const reportConfigs: ReportConfig[] = [
  {
    id: 'patient-registration',
    name: 'Patient Registration Report',
    description: 'Detailed report of patient registrations with demographics',
    category: 'operational',
    icon: Users,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'department', type: 'select', label: 'Department', required: false },
      { name: 'payerType', type: 'select', label: 'Payer Type', required: false }
    ]
  },
  {
    id: 'appointment-summary',
    name: 'Appointment Summary',
    description: 'Summary of appointments by doctor, department, and status',
    category: 'operational',
    icon: Calendar,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'doctor', type: 'select', label: 'Doctor', required: false },
      { name: 'status', type: 'multiselect', label: 'Status', required: false }
    ]
  },
  {
    id: 'revenue-analysis',
    name: 'Revenue Analysis',
    description: 'Comprehensive revenue analysis with trends and breakdowns',
    category: 'financial',
    icon: DollarSign,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'billType', type: 'multiselect', label: 'Bill Type', required: false },
      { name: 'paymentStatus', type: 'select', label: 'Payment Status', required: false }
    ]
  },
  {
    id: 'bed-occupancy',
    name: 'Bed Occupancy Report',
    description: 'IPD bed occupancy rates and utilization statistics',
    category: 'operational',
    icon: Bed,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'ward', type: 'select', label: 'Ward', required: false },
      { name: 'bedType', type: 'select', label: 'Bed Type', required: false }
    ]
  },
  {
    id: 'doctor-performance',
    name: 'Doctor Performance',
    description: 'Doctor-wise patient load, revenue, and performance metrics',
    category: 'clinical',
    icon: UserCheck,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'department', type: 'select', label: 'Department', required: false },
      { name: 'doctor', type: 'select', label: 'Doctor', required: false }
    ]
  },
  {
    id: 'outstanding-dues',
    name: 'Outstanding Dues',
    description: 'Pending payments and outstanding amounts by patient',
    category: 'financial',
    icon: AlertCircle,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'amountRange', type: 'select', label: 'Amount Range', required: false },
      { name: 'agingPeriod', type: 'select', label: 'Aging Period', required: false }
    ]
  },
  {
    id: 'compliance-summary',
    name: 'Compliance Summary',
    description: 'Regulatory compliance and audit trail summary',
    category: 'compliance',
    icon: CheckCircle,
    parameters: [
      { name: 'dateRange', type: 'daterange', label: 'Date Range', required: true },
      { name: 'complianceType', type: 'multiselect', label: 'Compliance Type', required: false }
    ]
  },
  {
    id: 'inventory-status',
    name: 'Inventory Status',
    description: 'Current inventory levels and consumption patterns',
    category: 'operational',
    icon: Activity,
    parameters: [
      { name: 'category', type: 'select', label: 'Category', required: false },
      { name: 'lowStock', type: 'select', label: 'Low Stock Alert', required: false }
    ]
  }
]

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null)
  const [reportParameters, setReportParameters] = useState<{ [key: string]: any }>({})
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()

  // Load recent reports
  useEffect(() => {
    loadRecentReports()
  }, [])

  const loadRecentReports = async () => {
    // Mock recent reports - in real implementation, would load from database
    const mockReports: GeneratedReport[] = [
      {
        id: '1',
        name: 'Patient Registration Report',
        generatedAt: '2024-01-18T10:30:00Z',
        status: 'completed',
        downloadUrl: '#',
        size: '2.3 MB'
      },
      {
        id: '2',
        name: 'Revenue Analysis',
        generatedAt: '2024-01-18T09:15:00Z',
        status: 'completed',
        downloadUrl: '#',
        size: '1.8 MB'
      },
      {
        id: '3',
        name: 'Bed Occupancy Report',
        generatedAt: '2024-01-18T08:45:00Z',
        status: 'generating'
      }
    ]
    
    setGeneratedReports(mockReports)
  }

  const getFilteredReports = () => {
    if (selectedCategory === 'all') {
      return reportConfigs
    }
    return reportConfigs.filter(report => report.category === selectedCategory)
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setReportParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const generateReport = async () => {
    if (!selectedReport) return

    // Validate required parameters
    const missingParams = selectedReport.parameters
      .filter(param => param.required && !reportParameters[param.name])
      .map(param => param.label)

    if (missingParams.length > 0) {
      toast({
        title: "Missing Parameters",
        description: `Please provide: ${missingParams.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Mock report generation
      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        name: selectedReport.name,
        generatedAt: new Date().toISOString(),
        status: 'generating'
      }

      setGeneratedReports(prev => [newReport, ...prev])

      // Simulate report generation
      setTimeout(() => {
        setGeneratedReports(prev => 
          prev.map(report => 
            report.id === newReport.id 
              ? { ...report, status: 'completed', downloadUrl: '#', size: '1.5 MB' }
              : report
          )
        )
        
        toast({
          title: "Report Generated",
          description: `${selectedReport.name} has been generated successfully`,
          variant: "default",
        })
      }, 3000)

      toast({
        title: "Report Generation Started",
        description: `Generating ${selectedReport.name}...`,
        variant: "default",
      })

    } catch (error: any) {
      console.error('Error generating report:', error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReport = (report: GeneratedReport) => {
    // Mock download
    toast({
      title: "Download Started",
      description: `Downloading ${report.name}`,
      variant: "default",
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign
      case 'clinical': return UserCheck
      case 'operational': return Activity
      case 'compliance': return CheckCircle
      default: return FileText
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'text-green-600 bg-green-100'
      case 'clinical': return 'text-blue-600 bg-blue-100'
      case 'operational': return 'text-orange-600 bg-orange-100'
      case 'compliance': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'generating': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const renderParameterInput = (param: ReportParameter) => {
    switch (param.type) {
      case 'date':
        return (
          <Input
            type="date"
            value={reportParameters[param.name] || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
          />
        )
      
      case 'daterange':
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="From"
              value={reportParameters[`${param.name}_from`] || ''}
              onChange={(e) => handleParameterChange(`${param.name}_from`, e.target.value)}
            />
            <Input
              type="date"
              placeholder="To"
              value={reportParameters[`${param.name}_to`] || ''}
              onChange={(e) => handleParameterChange(`${param.name}_to`, e.target.value)}
            />
          </div>
        )
      
      case 'select':
        return (
          <Select
            value={reportParameters[param.name] || ''}
            onValueChange={(value) => handleParameterChange(param.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${param.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {param.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <Input
            value={reportParameters[param.name] || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.label}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generate comprehensive reports and analyze hospital data
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadRecentReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Report Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Categories & List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Category Filter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="w-5 h-5" />
                    <span>Report Categories</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All Reports
                    </Button>
                    <Button
                      variant={selectedCategory === 'financial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('financial')}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Financial
                    </Button>
                    <Button
                      variant={selectedCategory === 'clinical' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('clinical')}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Clinical
                    </Button>
                    <Button
                      variant={selectedCategory === 'operational' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('operational')}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Operational
                    </Button>
                    <Button
                      variant={selectedCategory === 'compliance' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('compliance')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Compliance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Available Reports */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Reports</CardTitle>
                  <CardDescription>
                    Select a report to configure and generate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredReports().map((report) => {
                      const Icon = report.icon
                      const isSelected = selectedReport?.id === report.id
                      
                      return (
                        <Card 
                          key={report.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-medical-500 bg-medical-50' : ''
                          }`}
                          onClick={() => setSelectedReport(report)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${getCategoryColor(report.category)}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {report.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {report.description}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className="mt-2 capitalize"
                                >
                                  {report.category}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Configuration */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Report Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Configure parameters for the selected report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedReport ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {selectedReport.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedReport.description}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        {selectedReport.parameters.map((param) => (
                          <div key={param.name}>
                            <Label htmlFor={param.name}>
                              {param.label}
                              {param.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {renderParameterInput(param)}
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <Button 
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Select a report from the list to configure and generate
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Reports</span>
              </CardTitle>
              <CardDescription>
                View and download recently generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {report.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Generated on {new Date(report.generatedAt).toLocaleString()}
                          {report.size && ` • ${report.size}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status === 'generating' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>

                      {report.status === 'completed' && (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Share className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {generatedReports.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No reports generated yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Analytics Cards */}
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">156</div>
                <div className="text-sm text-gray-600">Reports Generated</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">23%</div>
                <div className="text-sm text-gray-600">Growth This Month</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">1,247</div>
                <div className="text-sm text-gray-600">Total Patients</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">₹4.2L</div>
                <div className="text-sm text-gray-600">Monthly Revenue</div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Revenue chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Department chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}