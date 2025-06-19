import React, { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Users,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { appointmentService, patientService, doctorService, departmentService } from '@/services/supabaseClient'
import { supabase } from '@/lib/supabase'

// Types
interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  department_id: string
  appointment_date: string
  appointment_time: string
  duration: number
  type: string
  status: string
  reason: string
  notes?: string
  consultation_fee: number
  payment_status: string
  patients?: {
    id: string
    patient_id: string
    uhid: string
    personal_info: any
  }
  doctors?: {
    id: string
    employee_id: string
    personal_info: any
    users: {
      full_name: string
    }
  }
}

interface Doctor {
  id: string
  employee_id: string
  personal_info: any
  consultation_fee: number
  users: {
    full_name: string
  }
  departments: {
    name: string
  }
}

interface Patient {
  id: string
  patient_id: string
  uhid: string
  personal_info: any
}

// Validation schema for walk-in appointment
const walkInSchema = z.object({
  organization: z.string().min(1, 'Organization is required'),
  doctorId: z.string().min(1, 'Doctor selection is required'),
  appointmentDate: z.string().min(1, 'Date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  patientId: z.string().min(1, 'Patient selection is required'),
  provider: z.string().optional(),
  referral: z.string().optional(),
  appointmentReason: z.enum(['New', 'Investigation', 'Follow-Up', 'Other'], {
    required_error: 'Please select appointment reason'
  }),
  reasonDetails: z.string().min(5, 'Please provide reason details (minimum 5 characters)'),
  isNewborn: z.boolean().default(false),
  createBill: z.boolean().default(true),
  isMlc: z.boolean().default(false)
})

type WalkInForm = z.infer<typeof walkInSchema>

// Time slots configuration
const generateTimeSlots = (startHour: number = 9, endHour: number = 18, duration: number = 30) => {
  const slots = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += duration) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

export default function AppointmentsPage() {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [slotDuration, setSlotDuration] = useState(30)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()

  // Form handling
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<WalkInForm>({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      organization: 'OPD',
      appointmentDate: new Date().toISOString().split('T')[0],
      isNewborn: false,
      createBill: true,
      isMlc: false,
      appointmentReason: 'New'
    }
  })

  const watchedDoctorId = watch('doctorId')
  const watchedDate = watch('appointmentDate')

  // Load initial data
  useEffect(() => {
    if (hospitalId) {
      loadInitialData()
    }
  }, [hospitalId])

  // Real-time subscription
  useEffect(() => {
    if (!hospitalId) return

    const subscription = supabase
      .channel(`appointments_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospitalId}`
        },
        (payload) => {
          console.log('Real-time appointment update:', payload)
          loadAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [hospitalId])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        refreshData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshing])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAppointments(),
        loadDoctors(),
        loadPatients(),
        loadDepartments()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: "Error",
        description: "Failed to load appointment data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async () => {
    if (!hospitalId) return

    try {
      const result = await appointmentService.getAppointments(hospitalId)
      if (result.success) {
        setAppointments(result.data || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
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

  const refreshData = async () => {
    setRefreshing(true)
    await loadAppointments()
    setRefreshing(false)
  }

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filter appointments by current view
  const getFilteredAppointments = () => {
    const dateStr = currentDate.toISOString().split('T')[0]
    
    return appointments.filter(apt => {
      const aptDate = apt.appointment_date
      const doctorMatch = selectedDoctor === 'all' || apt.doctor_id === selectedDoctor
      
      if (viewMode === 'day') {
        return aptDate === dateStr && doctorMatch
      } else {
        // Week view logic
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        
        const aptDateObj = new Date(aptDate)
        return aptDateObj >= startOfWeek && aptDateObj <= endOfWeek && doctorMatch
      }
    })
  }

  // Get appointment counts by status
  const getAppointmentCounts = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = appointments.filter(apt => apt.appointment_date === today)
    
    return {
      today: todayAppointments.length,
      waiting: todayAppointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed').length,
      engaged: todayAppointments.filter(apt => apt.status === 'in_progress').length,
      done: todayAppointments.filter(apt => apt.status === 'completed').length
    }
  }

  // Get available time slots for selected doctor and date
  const getAvailableTimeSlots = () => {
    if (!watchedDoctorId || !watchedDate) return []
    
    const allSlots = generateTimeSlots(9, 18, slotDuration)
    const bookedSlots = appointments
      .filter(apt => 
        apt.doctor_id === watchedDoctorId && 
        apt.appointment_date === watchedDate &&
        apt.status !== 'cancelled'
      )
      .map(apt => apt.appointment_time.slice(0, 5)) // Remove seconds
    
    return allSlots.filter(slot => !bookedSlots.includes(slot))
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

  // Submit walk-in appointment
  const onSubmitWalkIn = async (data: WalkInForm) => {
    if (!hospitalId || !user) {
      toast({
        title: "Error",
        description: "Hospital ID or user not found",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedDoctor = doctors.find(d => d.id === data.doctorId)
      const selectedPatient = patients.find(p => p.id === data.patientId)
      
      if (!selectedDoctor || !selectedPatient) {
        throw new Error('Selected doctor or patient not found')
      }

      const appointmentData = {
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        department_id: selectedDoctor.departments?.id || departments[0]?.id,
        appointment_date: data.appointmentDate,
        appointment_time: `${data.timeSlot}:00`,
        duration: slotDuration,
        type: data.appointmentReason.toLowerCase(),
        status: 'scheduled',
        reason: data.reasonDetails,
        notes: `Provider: ${data.provider || 'N/A'}, Referral: ${data.referral || 'N/A'}`,
        consultation_fee: selectedDoctor.consultation_fee || 0,
        payment_status: data.createBill ? 'pending' : 'not_applicable',
        created_by: user.id
      }

      const result = await appointmentService.addAppointment(appointmentData, hospitalId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create appointment')
      }

      // Trigger SMS/WhatsApp notification via Edge Function
      try {
        const notificationData = {
          type: 'appointment_created',
          patient: selectedPatient,
          doctor: selectedDoctor,
          appointment: {
            date: data.appointmentDate,
            time: data.timeSlot,
            reason: data.reasonDetails
          }
        }

        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationData)
        })
      } catch (notificationError) {
        console.error('Notification error:', notificationError)
        // Don't fail the appointment creation if notification fails
      }

      toast({
        title: "Appointment Created",
        description: `Walk-in appointment scheduled for ${selectedPatient.personal_info?.first_name} ${selectedPatient.personal_info?.last_name}`,
        variant: "default",
      })

      setIsWalkInModalOpen(false)
      reset()
      await loadAppointments()

    } catch (error: any) {
      console.error('Error creating appointment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      })
    }
  }

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    if (!hospitalId) return

    try {
      const result = await appointmentService.updateAppointment(
        appointmentId,
        { status: newStatus },
        hospitalId
      )

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Appointment status changed to ${newStatus}`,
          variant: "default",
        })
        await loadAppointments()
      }
    } catch (error) {
      console.error('Error updating appointment status:', error)
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      })
    }
  }

  // Render appointment card
  const renderAppointmentCard = (appointment: Appointment) => {
    const patient = appointment.patients
    const doctor = appointment.doctors
    const patientName = patient ? `${patient.personal_info?.first_name || ''} ${patient.personal_info?.last_name || ''}` : 'Unknown Patient'
    const doctorName = doctor?.users?.full_name || 'Unknown Doctor'

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'scheduled': return 'bg-blue-100 text-blue-800'
        case 'confirmed': return 'bg-green-100 text-green-800'
        case 'in_progress': return 'bg-yellow-100 text-yellow-800'
        case 'completed': return 'bg-gray-100 text-gray-800'
        case 'cancelled': return 'bg-red-100 text-red-800'
        case 'no_show': return 'bg-orange-100 text-orange-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    return (
      <Card key={appointment.id} className="mb-3 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-sm font-medium">{appointment.appointment_time.slice(0, 5)}</span>
                <span className="text-sm text-gray-500">({appointment.duration} min)</span>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium">{patientName}</p>
                <p className="text-sm text-gray-600">UHID: {patient?.uhid}</p>
                <p className="text-sm text-gray-600">Dr. {doctorName}</p>
                <p className="text-sm text-gray-500">{appointment.reason}</p>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              {appointment.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Check In
                </Button>
              )}
              
              {appointment.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
              
              {appointment.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}

              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading appointments...</p>
        </div>
      </div>
    )
  }

  const filteredAppointments = getFilteredAppointments()
  const counts = getAppointmentCounts()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Appointments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage patient appointments and schedules
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

          <Dialog open={isWalkInModalOpen} onOpenChange={setIsWalkInModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-medical-600 hover:bg-medical-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Walk-In
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Walk-In Appointment</DialogTitle>
                <DialogDescription>
                  Create a new walk-in appointment for immediate or scheduled consultation
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmitWalkIn)} className="space-y-4">
                {/* Organization and Doctor Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">Organization *</Label>
                    <Controller
                      name="organization"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPD">OPD</SelectItem>
                            <SelectItem value="Emergency">Emergency</SelectItem>
                            <SelectItem value="Specialist">Specialist</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.organization && (
                      <p className="text-sm text-red-600 mt-1">{errors.organization.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="doctorId">Doctor *</Label>
                    <Controller
                      name="doctorId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                Dr. {doctor.users?.full_name} - {doctor.departments?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.doctorId && (
                      <p className="text-sm text-red-600 mt-1">{errors.doctorId.message}</p>
                    )}
                  </div>
                </div>

                {/* Date and Time Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appointmentDate">Date *</Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      {...register('appointmentDate')}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.appointmentDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.appointmentDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="timeSlot">Time Slot *</Label>
                    <Controller
                      name="timeSlot"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimeSlots().map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.timeSlot && (
                      <p className="text-sm text-red-600 mt-1">{errors.timeSlot.message}</p>
                    )}
                  </div>
                </div>

                {/* Patient Selection */}
                <div>
                  <Label htmlFor="patientSearch">Patient *</Label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Search by UHID, Name, or Mobile"
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPatientModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Patient
                      </Button>
                    </div>
                    
                    {patientSearchQuery && (
                      <div className="border rounded-md max-h-40 overflow-y-auto">
                        {searchPatients(patientSearchQuery).map((patient) => (
                          <div
                            key={patient.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setValue('patientId', patient.id)
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

                {/* Provider and Referral */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider"
                      {...register('provider')}
                      placeholder="Enter provider name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="referral">Referral</Label>
                    <Input
                      id="referral"
                      {...register('referral')}
                      placeholder="Enter referral source"
                    />
                  </div>
                </div>

                {/* Appointment Reason */}
                <div>
                  <Label htmlFor="appointmentReason">Appointment Reason *</Label>
                  <Controller
                    name="appointmentReason"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New Consultation</SelectItem>
                          <SelectItem value="Investigation">Investigation</SelectItem>
                          <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.appointmentReason && (
                    <p className="text-sm text-red-600 mt-1">{errors.appointmentReason.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reasonDetails">Reason Details *</Label>
                  <Textarea
                    id="reasonDetails"
                    {...register('reasonDetails')}
                    placeholder="Describe the reason for appointment"
                    rows={3}
                  />
                  {errors.reasonDetails && (
                    <p className="text-sm text-red-600 mt-1">{errors.reasonDetails.message}</p>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isNewborn"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isNewborn"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isNewborn">Newborn Booking</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="createBill"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="createBill"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="createBill">Create Bill</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isMlc"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isMlc"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isMlc">MLC Flag</Label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWalkInModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-medical-600 hover:bg-medical-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Appointment'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{counts.today}</div>
            <div className="text-sm text-gray-600">Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{counts.waiting}</div>
            <div className="text-sm text-gray-600">Waiting</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{counts.engaged}</div>
            <div className="text-sm text-gray-600">Engaged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{counts.done}</div>
            <div className="text-sm text-gray-600">Done</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label>View:</Label>
                <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label>Duration:</Label>
                <Select value={slotDuration.toString()} onValueChange={(value) => setSlotDuration(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="45">45m</SelectItem>
                    <SelectItem value="60">60m</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label>Doctor:</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.users?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No appointments scheduled for this {viewMode}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map(renderAppointmentCard)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}