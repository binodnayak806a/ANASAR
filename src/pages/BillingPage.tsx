import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Loader2,
  FileText,
  CreditCard
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { billingService } from '@/services/supabaseClient'

// Types
interface Bill {
  id: string
  bill_number: string
  bill_date: string
  bill_type: string
  total_amount: number
  payment_status: string
  patients?: {
    personal_info: any
  }
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('today')

  const { toast } = useToast()
  const { hospitalId } = useAuth()
  const navigate = useNavigate()

  // Load bills
  useEffect(() => {
    if (hospitalId) {
      loadBills()
    }
  }, [hospitalId])

  const loadBills = async () => {
    setLoading(true)
    try {
      const result = await billingService.getBills(hospitalId)
      if (result.success) {
        setBills(result.data || [])
      }
    } catch (error) {
      console.error('Error loading bills:', error)
      toast({
        title: "Error",
        description: "Failed to load bills",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter bills
  const getFilteredBills = () => {
    return bills.filter(bill => {
      const typeMatch = selectedType === 'all' || bill.bill_type === selectedType
      const statusMatch = selectedStatus === 'all' || bill.payment_status === selectedStatus
      
      const searchMatch = !searchQuery || 
        bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.patients?.personal_info?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.patients?.personal_info?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return typeMatch && statusMatch && searchMatch
    })
  }

  // Get billing statistics
  const getBillingStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayBills = bills.filter(bill => bill.bill_date === today)
    
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.total_amount, 0)
    const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.total_amount, 0)
    const pendingAmount = bills
      .filter(bill => bill.payment_status === 'pending')
      .reduce((sum, bill) => sum + bill.total_amount, 0)
    
    return {
      totalBills: bills.length,
      todayBills: todayBills.length,
      totalRevenue,
      todayRevenue,
      pendingAmount
    }
  }

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'partial':
        return 'bg-orange-100 text-orange-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Render bill row
  const renderBillRow = (bill: Bill) => (
    <tr key={bill.id} className="hover:bg-gray-50">
      <td className="px-4 py-3 border-b">
        <div>
          <p className="font-medium">{bill.bill_number}</p>
          <p className="text-sm text-gray-600">{new Date(bill.bill_date).toLocaleDateString()}</p>
        </div>
      </td>
      <td className="px-4 py-3 border-b">
        <Badge variant="outline" className="capitalize">
          {bill.bill_type}
        </Badge>
      </td>
      <td className="px-4 py-3 border-b">
        <div>
          <p className="font-medium">
            {bill.patients?.personal_info?.first_name} {bill.patients?.personal_info?.last_name}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 border-b text-right">
        <p className="font-medium">₹{bill.total_amount.toFixed(2)}</p>
      </td>
      <td className="px-4 py-3 border-b">
        <Badge className={getPaymentStatusColor(bill.payment_status)}>
          {bill.payment_status.toUpperCase()}
        </Badge>
      </td>
      <td className="px-4 py-3 border-b">
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Printer className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading billing data...</p>
        </div>
      </div>
    )
  }

  const filteredBills = getFilteredBills()
  const stats = getBillingStats()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Billing & Payments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage bills, invoices, and payment tracking
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/billing/opd')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New OPD Bill
          </Button>
          <Button
            onClick={() => navigate('/ipd/bed-board')}
            className="bg-medical-600 hover:bg-medical-700"
          >
            <Building2 className="w-4 h-4 mr-2" />
            IPD Billing
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalBills}</div>
            <div className="text-sm text-gray-600">Total Bills</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.todayBills}</div>
            <div className="text-sm text-gray-600">Today's Bills</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">₹{stats.totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">₹{stats.todayRevenue.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Today's Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">₹{stats.pendingAmount.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Pending Amount</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search bills, patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Bill Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Laboratory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="w-5 h-5" />
            <span>Bills & Invoices</span>
          </CardTitle>
          <CardDescription>
            {filteredBills.length} bill(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bills found matching the current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Bill Details</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Patient</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map(renderBillRow)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}