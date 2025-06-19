import React, { useState, useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Receipt, 
  User, 
  Calendar, 
  Building2, 
  Plus, 
  Trash2, 
  Save,
  Printer,
  Search,
  Calculator,
  Sparkles,
  CreditCard,
  Loader2,
  FileText,
  Download,
  Share
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { patientService, doctorService, departmentService, billingService } from '@/services/supabaseClient'
import html2pdf from 'html2pdf.js'

// Types
interface Patient {
  id: string
  patient_id: string
  uhid: string
  personal_info: any
  contact_info: any
}

interface Doctor {
  id: string
  employee_id: string
  personal_info: any
  users: {
    full_name: string
  }
  departments: {
    name: string
  }
}

interface Department {
  id: string
  name: string
  code: string
}

interface BillItem {
  service_code: string
  service_name: string
  doctor_id: string
  doctor_name: string
  unit: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total_amount: number
}

// Validation schema
const opdBillSchema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  billDate: z.string().min(1, 'Bill date is required'),
  departmentId: z.string().min(1, 'Department is required'),
  items: z.array(z.object({
    service_code: z.string().min(1, 'Service code is required'),
    service_name: z.string().min(1, 'Service name is required'),
    doctor_id: z.string().min(1, 'Doctor is required'),
    doctor_name: z.string().min(1, 'Doctor name is required'),
    unit: z.number().min(1, 'Unit must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be positive'),
    discount_percent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
    discount_amount: z.number().min(0),
    tax_percent: z.number().min(0).max(100, 'Tax cannot exceed 100%'),
    tax_amount: z.number().min(0),
    total_amount: z.number().min(0)
  })).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  total_discount: z.number().min(0),
  total_tax: z.number().min(0),
  grand_total: z.number().min(0),
  remarks: z.string().optional()
})

type OPDBillForm = z.infer<typeof opdBillSchema>

// Mock services data
const mockServices = [
  { code: 'CONS001', name: 'General Consultation', price: 500, cpt_code: '99213' },
  { code: 'CONS002', name: 'Specialist Consultation', price: 800, cpt_code: '99214' },
  { code: 'LAB001', name: 'Complete Blood Count', price: 300, cpt_code: '85025' },
  { code: 'LAB002', name: 'Blood Sugar Fasting', price: 150, cpt_code: '82947' },
  { code: 'RAD001', name: 'Chest X-Ray', price: 400, cpt_code: '71020' },
  { code: 'RAD002', name: 'ECG', price: 200, cpt_code: '93000' },
  { code: 'PROC001', name: 'Minor Procedure', price: 1000, cpt_code: '10060' },
  { code: 'PROC002', name: 'Injection', price: 100, cpt_code: '96372' }
]

export default function OPDBillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [generatedBillNumber, setGeneratedBillNumber] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<OPDBillForm>({
    resolver: zodResolver(opdBillSchema),
    defaultValues: {
      billDate: new Date().toISOString().split('T')[0],
      items: [{
        service_code: '',
        service_name: '',
        doctor_id: '',
        doctor_name: '',
        unit: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 18,
        tax_amount: 0,
        total_amount: 0
      }],
      subtotal: 0,
      total_discount: 0,
      total_tax: 0,
      grand_total: 0
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedItems = watch('items')

  // Load initial data
  useEffect(() => {
    if (hospitalId) {
      loadInitialData()
    }
  }, [hospitalId])

  // Auto-populate from appointment if provided
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId')
    if (appointmentId) {
      loadAppointmentData(appointmentId)
    }
  }, [searchParams])

  // Calculate totals when items change
  useEffect(() => {
    calculateTotals()
  }, [watchedItems])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadPatients(),
        loadDoctors(),
        loadDepartments()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPatients = async () => {
    if (!hospitalId) return

    try {
      const result = await patientService.getPatients(hospitalId)
      if (result.success) {
        setPatients(result.data || [])
      }
    } catch (error) {
      console.error('Error loading patients:', error)
    }
  }

  const loadDoctors = async () => {
    if (!hospitalId) return

    try {
      const result = await doctorService.getDoctors(hospitalId)
      if (result.success) {
        setDoctors(result.data || [])
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
    }
  }

  const loadDepartments = async () => {
    if (!hospitalId) return

    try {
      const result = await departmentService.getDepartments(hospitalId)
      if (result.success) {
        setDepartments(result.data || [])
      }
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const loadAppointmentData = async (appointmentId: string) => {
    // Load appointment data and pre-populate form
    // This would fetch appointment details and auto-fill patient, doctor, services
    console.log('Loading appointment data for:', appointmentId)
  }

  // Search patients
  const searchPatients = (query: string) => {
    if (!query.trim()) return patients.slice(0, 10)
    
    return patients.filter(patient => {
      const personalInfo = patient.personal_info || {}
      const fullName = `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.toLowerCase()
      const searchTerm = query.toLowerCase()
      
      return (
        patient.patient_id.toLowerCase().includes(searchTerm) ||
        patient.uhid.toLowerCase().includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        (personalInfo.mobile && personalInfo.mobile.includes(query))
      )
    }).slice(0, 10)
  }

  // Calculate item totals
  const calculateItemTotal = (index: number) => {
    const item = watchedItems[index]
    if (!item) return

    const baseAmount = item.unit * item.unit_price
    const discountAmount = (baseAmount * item.discount_percent) / 100
    const taxableAmount = baseAmount - discountAmount
    const taxAmount = (taxableAmount * item.tax_percent) / 100
    const totalAmount = taxableAmount + taxAmount

    setValue(`items.${index}.discount_amount`, discountAmount)
    setValue(`items.${index}.tax_amount`, taxAmount)
    setValue(`items.${index}.total_amount`, totalAmount)
  }

  // Calculate grand totals
  const calculateTotals = () => {
    const items = watchedItems || []
    
    const subtotal = items.reduce((sum, item) => sum + (item.unit * item.unit_price), 0)
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
    const totalTax = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const grandTotal = subtotal - totalDiscount + totalTax

    setValue('subtotal', subtotal)
    setValue('total_discount', totalDiscount)
    setValue('total_tax', totalTax)
    setValue('grand_total', grandTotal)
  }

  // Add service from AI suggestion
  const addServiceFromAI = (service: any) => {
    const newItem: BillItem = {
      service_code: service.code,
      service_name: service.name,
      doctor_id: '',
      doctor_name: '',
      unit: 1,
      unit_price: service.price,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 18,
      tax_amount: 0,
      total_amount: service.price * 1.18
    }

    append(newItem)
    setIsAIAssistantOpen(false)
  }

  // Generate bill number
  const generateBillNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `OPD${timestamp}${random}`
  }

  // Submit bill
  const onSubmit = async (data: OPDBillForm) => {
    if (!hospitalId || !user) {
      toast({
        title: "Error",
        description: "Hospital ID or user not found",
        variant: "destructive",
      })
      return
    }

    try {
      const billNumber = generateBillNumber()

      const billData = {
        bill_number: billNumber,
        bill_date: data.billDate,
        bill_type: 'opd',
        patient_id: data.patientId,
        items: data.items,
        subtotal: data.subtotal,
        tax_amount: data.total_tax,
        discount_amount: data.total_discount,
        total_amount: data.grand_total,
        payment_status: 'pending',
        created_by: user.id
      }

      const result = await billingService.addBill(billData, hospitalId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create bill')
      }

      setGeneratedBillNumber(billNumber)
      
      toast({
        title: "Bill Created Successfully!",
        description: `Bill number: ${billNumber}`,
        variant: "default",
      })

      // Show preview
      setShowPreview(true)

    } catch (error: any) {
      console.error('Billing error:', error)
      toast({
        title: "Billing Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  // Generate PDF
  const generatePDF = () => {
    const element = document.getElementById('bill-preview')
    if (!element) return

    const opt = {
      margin: 1,
      filename: `OPD_Bill_${generatedBillNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }

    html2pdf().set(opt).from(element).save()
  }

  // AI Assistant Component
  const AIAssistant = () => (
    <Dialog open={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Billing Assistant</span>
          </DialogTitle>
          <DialogDescription>
            Get CPT code suggestions and service recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Describe the service or procedure</Label>
            <Textarea
              placeholder="e.g., General consultation for diabetes follow-up"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Specialty</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Medicine</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Procedure Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="therapeutic">Therapeutic</SelectItem>
                  <SelectItem value="surgical">Surgical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Get AI Suggestions
          </Button>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Suggested Services:</h4>
            <div className="space-y-2">
              {mockServices.slice(0, 3).map((service) => (
                <div key={service.code} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">CPT: {service.cpt_code} | ₹{service.price}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addServiceFromAI(service)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Bill Preview Component
  const BillPreview = () => (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Preview</DialogTitle>
          <DialogDescription>
            Review and print the generated bill
          </DialogDescription>
        </DialogHeader>

        <div id="bill-preview" className="bg-white p-8 text-black">
          {/* Hospital Header */}
          <div className="text-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">Apollo Medical Center</h1>
            <p className="text-gray-600">123 Medical Street, Healthcare City</p>
            <p className="text-gray-600">Phone: +91 98765 43210 | Email: info@apollo.com</p>
          </div>

          {/* Bill Header */}
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">OPD BILL</h2>
              <p>Bill No: {generatedBillNumber}</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p><strong>Patient Details:</strong></p>
              <p>UHID: {selectedPatient?.uhid}</p>
              <p>Name: {selectedPatient?.personal_info?.first_name} {selectedPatient?.personal_info?.last_name}</p>
              <p>Mobile: {selectedPatient?.personal_info?.mobile}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Service</th>
                <th className="border border-gray-300 p-2 text-left">Doctor</th>
                <th className="border border-gray-300 p-2 text-center">Qty</th>
                <th className="border border-gray-300 p-2 text-right">Rate</th>
                <th className="border border-gray-300 p-2 text-right">Discount</th>
                <th className="border border-gray-300 p-2 text-right">Tax</th>
                <th className="border border-gray-300 p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {watchedItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.service_name}</td>
                  <td className="border border-gray-300 p-2">{item.doctor_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.unit_price}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.discount_amount}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.tax_amount}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-1">
                <span>Subtotal:</span>
                <span>₹{watch('subtotal')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Discount:</span>
                <span>₹{watch('total_discount')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Tax:</span>
                <span>₹{watch('total_tax')}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Grand Total:</span>
                <span>₹{watch('grand_total')}</span>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading billing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          OPD Billing
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and manage outpatient department bills
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Patient Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientSearch">Patient *</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search by UHID, Name, or Mobile"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                  />
                  
                  {patientSearchQuery && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {searchPatients(patientSearchQuery).map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setValue('patientId', patient.id)
                            setSelectedPatient(patient)
                            setPatientSearchQuery(`${patient.personal_info?.first_name} ${patient.personal_info?.last_name} (${patient.uhid})`)
                          }}
                        >
                          <p className="font-medium">
                            {patient.personal_info?.first_name} {patient.personal_info?.last_name}
                          </p>
                          <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.patientId && (
                  <p className="text-sm text-red-600 mt-1">{errors.patientId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="billDate">Bill Date *</Label>
                <Input
                  id="billDate"
                  type="date"
                  {...register('billDate')}
                />
                {errors.billDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.billDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="departmentId">Department *</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && (
                <p className="text-sm text-red-600 mt-1">{errors.departmentId.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Bill Items</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAIAssistantOpen(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    service_code: '',
                    service_name: '',
                    doctor_id: '',
                    doctor_name: '',
                    unit: 1,
                    unit_price: 0,
                    discount_percent: 0,
                    discount_amount: 0,
                    tax_percent: 18,
                    tax_amount: 0,
                    total_amount: 0
                  })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <Label>Service Code</Label>
                      <Controller
                        name={`items.${index}.service_code`}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(value) => {
                            field.onChange(value)
                            const service = mockServices.find(s => s.code === value)
                            if (service) {
                              setValue(`items.${index}.service_name`, service.name)
                              setValue(`items.${index}.unit_price`, service.price)
                              calculateItemTotal(index)
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockServices.map((service) => (
                                <SelectItem key={service.code} value={service.code}>
                                  {service.code} - {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label>Service Name</Label>
                      <Input
                        {...register(`items.${index}.service_name`)}
                        placeholder="Service name"
                      />
                    </div>

                    <div>
                      <Label>Doctor</Label>
                      <Controller
                        name={`items.${index}.doctor_id`}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(value) => {
                            field.onChange(value)
                            const doctor = doctors.find(d => d.id === value)
                            if (doctor) {
                              setValue(`items.${index}.doctor_name`, doctor.users?.full_name || '')
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {doctors.map((doctor) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  Dr. {doctor.users?.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label>Unit</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`items.${index}.unit`, { 
                          valueAsNumber: true,
                          onChange: () => calculateItemTotal(index)
                        })}
                      />
                    </div>

                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`items.${index}.unit_price`, { 
                          valueAsNumber: true,
                          onChange: () => calculateItemTotal(index)
                        })}
                      />
                    </div>

                    <div>
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...register(`items.${index}.discount_percent`, { 
                          valueAsNumber: true,
                          onChange: () => calculateItemTotal(index)
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Discount Amount</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.discount_amount`, { valueAsNumber: true })}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <Label>Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...register(`items.${index}.tax_percent`, { 
                          valueAsNumber: true,
                          onChange: () => calculateItemTotal(index)
                        })}
                      />
                    </div>

                    <div>
                      <Label>Tax Amount</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.tax_amount`, { valueAsNumber: true })}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <Label>Total Amount</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.total_amount`, { valueAsNumber: true })}
                        readOnly
                        className="bg-gray-50 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5" />
              <span>Bill Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  {...register('remarks')}
                  placeholder="Enter any remarks or notes"
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{watch('subtotal')?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discount:</span>
                  <span className="font-medium text-red-600">₹{watch('total_discount')?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span className="font-medium">₹{watch('total_tax')?.toFixed(2) || '0.00'}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>₹{watch('grand_total')?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-medical-600 hover:bg-medical-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Bill...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save & Print
              </>
            )}
          </Button>
        </div>
      </form>

      {/* AI Assistant Dialog */}
      <AIAssistant />

      {/* Bill Preview Dialog */}
      <BillPreview />
    </div>
  )
}