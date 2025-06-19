import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Receipt, 
  User, 
  Calendar, 
  Bed, 
  CreditCard,
  Plus, 
  Trash2, 
  Save,
  Printer,
  Calculator,
  Sparkles,
  Loader2,
  FileText,
  Download,
  Share,
  History,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { ipdService, billingService } from '@/services/supabaseClient'
import html2pdf from 'html2pdf.js'

// Types
interface IPDRecord {
  id: string
  admission_number: string
  patient_id: string
  admission_date: string
  room_number: string
  bed_number: string
  status: string
  total_charges: number
  patients?: {
    personal_info: any
    contact_info: any
    insurance_info: any
  }
  doctors?: {
    users: {
      full_name: string
    }
  }
}

interface DepositRecord {
  id: string
  amount: number
  payment_mode: string
  payment_date: string
  reference_number: string
  remarks: string
}

interface ChargeItem {
  service_code: string
  service_name: string
  date: string
  quantity: number
  unit_price: number
  total_amount: number
  category: string
}

// Validation schema
const ipdBillSchema = z.object({
  depositAmount: z.number().min(0, 'Deposit amount must be positive'),
  paymentMode: z.enum(['cash', 'card', 'upi', 'bank_transfer'], {
    required_error: 'Please select payment mode'
  }),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
  insuranceClaim: z.boolean().default(false),
  claimNumber: z.string().optional(),
  claimAmount: z.number().min(0).optional()
})

type IPDBillForm = z.infer<typeof ipdBillSchema>

// Mock data
const mockCharges: ChargeItem[] = [
  { service_code: 'BED001', service_name: 'General Bed Charges', date: '2024-01-15', quantity: 3, unit_price: 1500, total_amount: 4500, category: 'Accommodation' },
  { service_code: 'CONS001', service_name: 'Doctor Consultation', date: '2024-01-15', quantity: 1, unit_price: 800, total_amount: 800, category: 'Professional' },
  { service_code: 'LAB001', service_name: 'Blood Tests', date: '2024-01-16', quantity: 1, unit_price: 1200, total_amount: 1200, category: 'Diagnostics' },
  { service_code: 'MED001', service_name: 'Medications', date: '2024-01-16', quantity: 1, unit_price: 2500, total_amount: 2500, category: 'Pharmacy' },
  { service_code: 'PROC001', service_name: 'Minor Procedure', date: '2024-01-17', quantity: 1, unit_price: 3000, total_amount: 3000, category: 'Procedures' }
]

const mockDeposits: DepositRecord[] = [
  { id: '1', amount: 10000, payment_mode: 'cash', payment_date: '2024-01-15', reference_number: 'DEP001', remarks: 'Initial deposit' },
  { id: '2', amount: 5000, payment_mode: 'card', payment_date: '2024-01-16', reference_number: 'DEP002', remarks: 'Additional deposit' }
]

export default function IPDBillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [ipdRecord, setIpdRecord] = useState<IPDRecord | null>(null)
  const [charges, setCharges] = useState<ChargeItem[]>(mockCharges)
  const [deposits, setDeposits] = useState<DepositRecord[]>(mockDeposits)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showBillPreview, setShowBillPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()
  const navigate = useNavigate()
  const { ipdId } = useParams()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<IPDBillForm>({
    resolver: zodResolver(ipdBillSchema),
    defaultValues: {
      depositAmount: 0,
      paymentMode: 'cash',
      insuranceClaim: false,
      claimAmount: 0
    }
  })

  const watchedInsuranceClaim = watch('insuranceClaim')

  // Load IPD record
  useEffect(() => {
    if (ipdId && hospitalId) {
      loadIPDRecord()
    }
  }, [ipdId, hospitalId])

  const loadIPDRecord = async () => {
    if (!ipdId || !hospitalId) return

    setIsLoading(true)
    try {
      const result = await ipdService.getIPDRecordById(ipdId, hospitalId)
      if (result.success) {
        setIpdRecord(result.data)
      } else {
        throw new Error(result.error || 'Failed to load IPD record')
      }
    } catch (error: any) {
      console.error('Error loading IPD record:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load IPD record",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    const totalCharges = charges.reduce((sum, charge) => sum + charge.total_amount, 0)
    const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.amount, 0)
    const dueAmount = totalCharges - totalDeposits
    const gstAmount = totalCharges * 0.18
    const grandTotal = totalCharges + gstAmount

    return {
      totalCharges,
      totalDeposits,
      dueAmount,
      gstAmount,
      grandTotal
    }
  }

  // Group charges by category
  const getChargesByCategory = () => {
    const grouped: { [category: string]: ChargeItem[] } = {}
    charges.forEach(charge => {
      if (!grouped[charge.category]) {
        grouped[charge.category] = []
      }
      grouped[charge.category].push(charge)
    })
    return grouped
  }

  // Add deposit
  const onSubmitDeposit = async (data: IPDBillForm) => {
    try {
      const newDeposit: DepositRecord = {
        id: Date.now().toString(),
        amount: data.depositAmount,
        payment_mode: data.paymentMode,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: data.referenceNumber || `DEP${Date.now()}`,
        remarks: data.remarks || ''
      }

      setDeposits([...deposits, newDeposit])
      setShowPaymentModal(false)
      reset()

      toast({
        title: "Deposit Added",
        description: `₹${data.depositAmount} deposit added successfully`,
        variant: "default",
      })
    } catch (error: any) {
      console.error('Error adding deposit:', error)
      toast({
        title: "Error",
        description: "Failed to add deposit",
        variant: "destructive",
      })
    }
  }

  // Generate final bill
  const generateFinalBill = async () => {
    if (!ipdRecord || !hospitalId || !user) return

    try {
      const totals = calculateTotals()
      const billNumber = `IPD${Date.now().toString().slice(-6)}`

      const billData = {
        bill_number: billNumber,
        bill_date: new Date().toISOString().split('T')[0],
        bill_type: 'ipd',
        patient_id: ipdRecord.patient_id,
        ipd_record_id: ipdRecord.id,
        items: charges.map(charge => ({
          service_code: charge.service_code,
          service_name: charge.service_name,
          quantity: charge.quantity,
          unit_price: charge.unit_price,
          total_amount: charge.total_amount,
          category: charge.category,
          date: charge.date
        })),
        subtotal: totals.totalCharges,
        tax_amount: totals.gstAmount,
        discount_amount: 0,
        total_amount: totals.grandTotal,
        payment_status: totals.dueAmount <= 0 ? 'paid' : 'partial',
        created_by: user.id
      }

      const result = await billingService.addBill(billData, hospitalId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate bill')
      }

      toast({
        title: "Bill Generated",
        description: `Final bill ${billNumber} generated successfully`,
        variant: "default",
      })

      setShowBillPreview(true)

    } catch (error: any) {
      console.error('Error generating bill:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate bill",
        variant: "destructive",
      })
    }
  }

  // Generate PDF
  const generatePDF = () => {
    const element = document.getElementById('ipd-bill-preview')
    if (!element) return

    const opt = {
      margin: 1,
      filename: `IPD_Bill_${ipdRecord?.admission_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }

    html2pdf().set(opt).from(element).save()
  }

  // Payment Modal Component
  const PaymentModal = () => (
    <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Deposit</DialogTitle>
          <DialogDescription>
            Record a new deposit payment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitDeposit)} className="space-y-4">
          <div>
            <Label htmlFor="depositAmount">Deposit Amount *</Label>
            <Input
              id="depositAmount"
              type="number"
              min="0"
              step="0.01"
              {...register('depositAmount', { valueAsNumber: true })}
              placeholder="Enter amount"
            />
            {errors.depositAmount && (
              <p className="text-sm text-red-600 mt-1">{errors.depositAmount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="paymentMode">Payment Mode *</Label>
            <Controller
              name="paymentMode"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentMode && (
              <p className="text-sm text-red-600 mt-1">{errors.paymentMode.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              {...register('referenceNumber')}
              placeholder="Transaction/Reference number"
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              {...register('remarks')}
              placeholder="Enter remarks"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Deposit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  // Bill Preview Component
  const BillPreview = () => {
    const totals = calculateTotals()
    const chargesByCategory = getChargesByCategory()

    return (
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>IPD Final Bill</DialogTitle>
            <DialogDescription>
              Complete billing summary for IPD patient
            </DialogDescription>
          </DialogHeader>

          <div id="ipd-bill-preview" className="bg-white p-8 text-black">
            {/* Hospital Header */}
            <div className="text-center mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold">Apollo Medical Center</h1>
              <p className="text-gray-600">123 Medical Street, Healthcare City</p>
              <p className="text-gray-600">Phone: +91 98765 43210 | Email: info@apollo.com</p>
            </div>

            {/* Bill Header */}
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">IPD FINAL BILL</h2>
                <p>Admission No: {ipdRecord?.admission_number}</p>
                <p>Bill Date: {new Date().toLocaleDateString()}</p>
                <p>Room/Bed: {ipdRecord?.room_number}/{ipdRecord?.bed_number}</p>
              </div>
              <div className="text-right">
                <p><strong>Patient Details:</strong></p>
                <p>Name: {ipdRecord?.patients?.personal_info?.first_name} {ipdRecord?.patients?.personal_info?.last_name}</p>
                <p>Admission Date: {ipdRecord?.admission_date ? new Date(ipdRecord.admission_date).toLocaleDateString() : ''}</p>
                <p>Doctor: {ipdRecord?.doctors?.users?.full_name}</p>
              </div>
            </div>

            {/* Charges by Category */}
            {Object.entries(chargesByCategory).map(([category, categoryCharges]) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2">{category}</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Date</th>
                      <th className="border border-gray-300 p-2 text-left">Service</th>
                      <th className="border border-gray-300 p-2 text-center">Qty</th>
                      <th className="border border-gray-300 p-2 text-right">Rate</th>
                      <th className="border border-gray-300 p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryCharges.map((charge, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{new Date(charge.date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 p-2">{charge.service_name}</td>
                        <td className="border border-gray-300 p-2 text-center">{charge.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right">₹{charge.unit_price}</td>
                        <td className="border border-gray-300 p-2 text-right">₹{charge.total_amount}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="border border-gray-300 p-2 text-right">{category} Total:</td>
                      <td className="border border-gray-300 p-2 text-right">
                        ₹{categoryCharges.reduce((sum, charge) => sum + charge.total_amount, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Deposit History */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 bg-gray-100 p-2">Deposit History</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Date</th>
                    <th className="border border-gray-300 p-2 text-left">Mode</th>
                    <th className="border border-gray-300 p-2 text-left">Reference</th>
                    <th className="border border-gray-300 p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td className="border border-gray-300 p-2">{new Date(deposit.payment_date).toLocaleDateString()}</td>
                      <td className="border border-gray-300 p-2 capitalize">{deposit.payment_mode}</td>
                      <td className="border border-gray-300 p-2">{deposit.reference_number}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{deposit.amount}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="border border-gray-300 p-2 text-right">Total Deposits:</td>
                    <td className="border border-gray-300 p-2 text-right">₹{totals.totalDeposits}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Final Totals */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between py-1">
                    <span>Total Charges:</span>
                    <span>₹{totals.totalCharges}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>GST (18%):</span>
                    <span>₹{totals.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t font-semibold">
                    <span>Grand Total:</span>
                    <span>₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Total Deposits:</span>
                    <span>₹{totals.totalDeposits}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold text-lg">
                    <span>Amount Due:</span>
                    <span className={totals.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                      ₹{Math.abs(totals.dueAmount).toFixed(2)}
                      {totals.dueAmount < 0 && ' (Refund)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>Thank you for choosing our services!</p>
              <p>This is a computer generated bill.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={generatePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading IPD billing data...</p>
        </div>
      </div>
    )
  }

  if (!ipdRecord) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p>IPD record not found</p>
          <Button onClick={() => navigate('/ipd/bed-board')} className="mt-4">
            Back to Bed Board
          </Button>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()
  const chargesByCategory = getChargesByCategory()

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          IPD Billing
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage inpatient department billing and payments
        </p>
      </div>

      {/* Patient Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-medical-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-medical-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {ipdRecord.patients?.personal_info?.first_name} {ipdRecord.patients?.personal_info?.last_name}
                </h2>
                <p className="text-gray-600">
                  Admission No: {ipdRecord.admission_number} | Room: {ipdRecord.room_number}/{ipdRecord.bed_number}
                </p>
                <p className="text-gray-600">
                  Admitted: {new Date(ipdRecord.admission_date).toLocaleDateString()} | 
                  Doctor: {ipdRecord.doctors?.users?.full_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-medical-600">
                ₹{totals.dueAmount > 0 ? totals.dueAmount.toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-600">Amount Due</div>
              {totals.dueAmount <= 0 && (
                <Badge className="mt-1 bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Fully Paid
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">₹{totals.totalCharges}</div>
            <div className="text-sm text-gray-600">Total Charges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">₹{totals.totalDeposits}</div>
            <div className="text-sm text-gray-600">Total Deposits</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">₹{totals.gstAmount.toFixed(2)}</div>
            <div className="text-sm text-gray-600">GST (18%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${totals.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{Math.abs(totals.dueAmount).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {totals.dueAmount > 0 ? 'Due Amount' : totals.dueAmount < 0 ? 'Refund Due' : 'Paid'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charges by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Charges Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(chargesByCategory).map(([category, categoryCharges]) => {
                  const categoryTotal = categoryCharges.reduce((sum, charge) => sum + charge.total_amount, 0)
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-gray-600">{categoryCharges.length} item(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{categoryTotal}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Deposits */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deposits.slice(-3).map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">₹{deposit.amount}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(deposit.payment_date).toLocaleDateString()} | {deposit.payment_mode.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant="outline">{deposit.reference_number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detailed Charges</span>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Charge
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Date</th>
                      <th className="border border-gray-300 p-3 text-left">Service</th>
                      <th className="border border-gray-300 p-3 text-left">Category</th>
                      <th className="border border-gray-300 p-3 text-center">Qty</th>
                      <th className="border border-gray-300 p-3 text-right">Rate</th>
                      <th className="border border-gray-300 p-3 text-right">Amount</th>
                      <th className="border border-gray-300 p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((charge, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-3">{new Date(charge.date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 p-3">{charge.service_name}</td>
                        <td className="border border-gray-300 p-3">
                          <Badge variant="outline">{charge.category}</Badge>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">{charge.quantity}</td>
                        <td className="border border-gray-300 p-3 text-right">₹{charge.unit_price}</td>
                        <td className="border border-gray-300 p-3 text-right font-medium">₹{charge.total_amount}</td>
                        <td className="border border-gray-300 p-3 text-center">
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Deposit History</span>
                <Button onClick={() => setShowPaymentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deposit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Date</th>
                      <th className="border border-gray-300 p-3 text-left">Payment Mode</th>
                      <th className="border border-gray-300 p-3 text-left">Reference</th>
                      <th className="border border-gray-300 p-3 text-right">Amount</th>
                      <th className="border border-gray-300 p-3 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit) => (
                      <tr key={deposit.id}>
                        <td className="border border-gray-300 p-3">{new Date(deposit.payment_date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 p-3">
                          <Badge variant="outline" className="capitalize">{deposit.payment_mode}</Badge>
                        </td>
                        <td className="border border-gray-300 p-3">{deposit.reference_number}</td>
                        <td className="border border-gray-300 p-3 text-right font-medium">₹{deposit.amount}</td>
                        <td className="border border-gray-300 p-3">{deposit.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Insurance Information</h4>
                    <Badge variant="outline">
                      {ipdRecord.patients?.insurance_info?.payer_type || 'Self Pay'}
                    </Badge>
                  </div>
                  
                  {ipdRecord.patients?.insurance_info && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Payer:</strong> {ipdRecord.patients.insurance_info.payer_name}</p>
                        <p><strong>Policy:</strong> {ipdRecord.patients.insurance_info.card_number}</p>
                      </div>
                      <div>
                        <p><strong>Valid From:</strong> {ipdRecord.patients.insurance_info.valid_from}</p>
                        <p><strong>Valid To:</strong> {ipdRecord.patients.insurance_info.valid_to}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">Claim Processing</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Pre-Authorization
                    </Button>
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Submit Claim
                    </Button>
                    <Button variant="outline" className="w-full">
                      <History className="w-4 h-4 mr-2" />
                      Track Claim Status
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="outline" onClick={() => navigate('/ipd/bed-board')}>
          Back to Bed Board
        </Button>
        <Button onClick={generateFinalBill} className="bg-medical-600 hover:bg-medical-700">
          <Receipt className="w-4 h-4 mr-2" />
          Generate Final Bill
        </Button>
      </div>

      {/* Payment Modal */}
      <PaymentModal />

      {/* Bill Preview */}
      <BillPreview />
    </div>
  )
}