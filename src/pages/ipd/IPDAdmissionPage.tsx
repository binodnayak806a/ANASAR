import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Bed, 
  User, 
  Calendar, 
  MapPin, 
  UserCheck, 
  AlertTriangle,
  Save,
  Search,
  Plus,
  Loader2,
  Building,
  Stethoscope,
  Clock,
  FileText
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { patientService, doctorService, departmentService } from '@/services/supabaseClient'
import { supabase } from '@/lib/supabase'

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

interface Ward {
  id: string
  name: string
  floor: string
  department_id: string
}

interface Room {
  id: string
  room_number: string
  ward_id: string
  room_type: string
}

interface Bed {
  id: string
  bed_number: string
  room_id: string
  bed_type: string
  status: 'vacant' | 'occupied' | 'maintenance'
}

// Validation schema
const admissionSchema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  admissionDate: z.string().min(1, 'Admission date is required'),
  admissionTime: z.string().min(1, 'Admission time is required'),
  admissionType: z.enum(['Emergency', 'Planned', 'Transfer'], {
    required_error: 'Please select admission type'
  }),
  attendingDoctorId: z.string().min(1, 'Attending doctor is required'),
  departmentId: z.string().min(1, 'Department is required'),
  wardId: z.string().min(1, 'Ward selection is required'),
  roomId: z.string().min(1, 'Room selection is required'),
  bedId: z.string().min(1, 'Bed selection is required'),
  admissionReason: z.string().min(10, 'Admission reason must be at least 10 characters'),
  initialDiagnosis: z.string().min(5, 'Initial diagnosis is required'),
  estimatedStay: z.number().min(1, 'Estimated stay must be at least 1 day').max(365, 'Estimated stay cannot exceed 365 days'),
  isMlc: z.boolean().default(false),
  notes: z.string().optional()
})

type AdmissionForm = z.infer<typeof admissionSchema>

// Mock data for wards, rooms, and beds
const mockWards: Ward[] = [
  { id: '1', name: 'General Ward A', floor: 'Ground Floor', department_id: '1' },
  { id: '2', name: 'General Ward B', floor: 'First Floor', department_id: '1' },
  { id: '3', name: 'ICU Ward', floor: 'Second Floor', department_id: '2' },
  { id: '4', name: 'Pediatric Ward', floor: 'First Floor', department_id: '3' },
  { id: '5', name: 'Maternity Ward', floor: 'Ground Floor', department_id: '4' }
]

const mockRooms: Room[] = [
  { id: '1', room_number: 'GA-101', ward_id: '1', room_type: 'General' },
  { id: '2', room_number: 'GA-102', ward_id: '1', room_type: 'General' },
  { id: '3', room_number: 'GA-103', ward_id: '1', room_type: 'Private' },
  { id: '4', room_number: 'GB-201', ward_id: '2', room_type: 'General' },
  { id: '5', room_number: 'GB-202', ward_id: '2', room_type: 'Semi-Private' },
  { id: '6', room_number: 'ICU-301', ward_id: '3', room_type: 'ICU' },
  { id: '7', room_number: 'ICU-302', ward_id: '3', room_type: 'ICU' },
  { id: '8', room_number: 'PED-201', ward_id: '4', room_type: 'Pediatric' },
  { id: '9', room_number: 'MAT-101', ward_id: '5', room_type: 'Maternity' }
]

const mockBeds: Bed[] = [
  { id: '1', bed_number: 'GA-101-A', room_id: '1', bed_type: 'General', status: 'vacant' },
  { id: '2', bed_number: 'GA-101-B', room_id: '1', bed_type: 'General', status: 'occupied' },
  { id: '3', bed_number: 'GA-102-A', room_id: '2', bed_type: 'General', status: 'vacant' },
  { id: '4', bed_number: 'GA-102-B', room_id: '2', bed_type: 'General', status: 'vacant' },
  { id: '5', bed_number: 'GA-103-A', room_id: '3', bed_type: 'Private', status: 'vacant' },
  { id: '6', bed_number: 'GB-201-A', room_id: '4', bed_type: 'General', status: 'occupied' },
  { id: '7', bed_number: 'GB-201-B', room_id: '4', bed_type: 'General', status: 'vacant' },
  { id: '8', bed_number: 'GB-202-A', room_id: '5', bed_type: 'Semi-Private', status: 'vacant' },
  { id: '9', bed_number: 'ICU-301-A', room_id: '6', bed_type: 'ICU', status: 'maintenance' },
  { id: '10', bed_number: 'ICU-301-B', room_id: '6', bed_type: 'ICU', status: 'vacant' },
  { id: '11', bed_number: 'ICU-302-A', room_id: '7', bed_type: 'ICU', status: 'occupied' },
  { id: '12', bed_number: 'PED-201-A', room_id: '8', bed_type: 'Pediatric', status: 'vacant' },
  { id: '13', bed_number: 'PED-201-B', room_id: '8', bed_type: 'Pediatric', status: 'vacant' },
  { id: '14', bed_number: 'MAT-101-A', room_id: '9', bed_type: 'Maternity', status: 'vacant' }
]

export default function IPDAdmissionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<AdmissionForm>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      admissionDate: new Date().toISOString().split('T')[0],
      admissionTime: new Date().toTimeString().slice(0, 5),
      admissionType: 'Planned',
      estimatedStay: 3,
      isMlc: false
    }
  })

  const watchedDepartmentId = watch('departmentId')
  const watchedWardId = watch('wardId')
  const watchedRoomId = watch('roomId')

  // Load initial data
  useEffect(() => {
    if (hospitalId) {
      loadInitialData()
    }
  }, [hospitalId])

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
        description: "Failed to load admission data",
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

  // Filter functions
  const getFilteredWards = () => {
    if (!watchedDepartmentId) return []
    return mockWards.filter(ward => ward.department_id === watchedDepartmentId)
  }

  const getFilteredRooms = () => {
    if (!watchedWardId) return []
    return mockRooms.filter(room => room.ward_id === watchedWardId)
  }

  const getFilteredBeds = () => {
    if (!watchedRoomId) return []
    return mockBeds.filter(bed => bed.room_id === watchedRoomId && bed.status === 'vacant')
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

  // Generate admission number
  const generateAdmissionNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `ADM${timestamp}${random}`
  }

  // Submit admission form
  const onSubmit = async (data: AdmissionForm) => {
    if (!hospitalId || !user) {
      toast({
        title: "Error",
        description: "Hospital ID or user not found",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedBed = mockBeds.find(bed => bed.id === data.bedId)
      const selectedRoom = mockRooms.find(room => room.id === data.roomId)
      const selectedWard = mockWards.find(ward => ward.id === data.wardId)
      const selectedPatient = patients.find(p => p.id === data.patientId)
      const selectedDoctor = doctors.find(d => d.id === data.attendingDoctorId)

      if (!selectedBed || !selectedRoom || !selectedWard || !selectedPatient || !selectedDoctor) {
        throw new Error('Selected bed, room, ward, patient, or doctor not found')
      }

      const admissionNumber = generateAdmissionNumber()

      const ipdData = {
        admission_number: admissionNumber,
        patient_id: data.patientId,
        admission_date: `${data.admissionDate}T${data.admissionTime}:00`,
        attending_doctor_id: data.attendingDoctorId,
        department_id: data.departmentId,
        room_number: selectedRoom.room_number,
        bed_number: selectedBed.bed_number,
        admission_type: data.admissionType.toLowerCase(),
        admission_reason: data.admissionReason,
        diagnosis: [data.initialDiagnosis],
        treatment_plan: {
          estimated_stay_days: data.estimatedStay,
          notes: data.notes || ''
        },
        daily_notes: [],
        status: 'admitted',
        total_charges: 0,
        created_by: user.id
      }

      // Save IPD record
      const { data: ipdRecord, error } = await supabase
        .from('ipd_records')
        .insert({
          ...ipdData,
          hospital_id: hospitalId
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Update bed status to occupied (in real implementation)
      // await updateBedStatus(data.bedId, 'occupied', ipdRecord.id)

      toast({
        title: "Admission Successful!",
        description: `Patient admitted with admission number: ${admissionNumber}`,
        variant: "default",
      })

      // Reset form
      reset()
      setSelectedPatient(null)
      setPatientSearchQuery('')

      // Navigate to bed board or IPD list
      setTimeout(() => {
        navigate('/ipd/bed-board')
      }, 2000)

    } catch (error: any) {
      console.error('Admission error:', error)
      toast({
        title: "Admission Failed",
        description: error.message || "An unexpected error occurred during admission",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admission data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          IPD Admission
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Admit patient to inpatient department
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Patient Selection</span>
            </CardTitle>
            <CardDescription>
              Search and select patient for admission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setValue('patientId', patient.id)
                          setSelectedPatient(patient)
                          setPatientSearchQuery(`${patient.personal_info?.first_name} ${patient.personal_info?.last_name} (${patient.uhid})`)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {patient.personal_info?.first_name} {patient.personal_info?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
                            <p className="text-sm text-gray-500">
                              {patient.personal_info?.age} years, {patient.personal_info?.gender}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {patient.personal_info?.blood_group || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <div className="p-3 bg-medical-50 border border-medical-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-medical-800">
                          Selected: {selectedPatient.personal_info?.first_name} {selectedPatient.personal_info?.last_name}
                        </p>
                        <p className="text-sm text-medical-600">UHID: {selectedPatient.uhid}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(null)
                          setPatientSearchQuery('')
                          setValue('patientId', '')
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {errors.patientId && (
                <p className="text-sm text-red-600 mt-1">{errors.patientId.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admission Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Admission Details</span>
            </CardTitle>
            <CardDescription>
              Date, time, and type of admission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="admissionDate">Admission Date *</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  {...register('admissionDate')}
                />
                {errors.admissionDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.admissionDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="admissionTime">Admission Time *</Label>
                <Input
                  id="admissionTime"
                  type="time"
                  {...register('admissionTime')}
                />
                {errors.admissionTime && (
                  <p className="text-sm text-red-600 mt-1">{errors.admissionTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="admissionType">Admission Type *</Label>
                <Controller
                  name="admissionType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select admission type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.admissionType && (
                  <p className="text-sm text-red-600 mt-1">{errors.admissionType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attendingDoctorId">Attending Doctor *</Label>
                <Controller
                  name="attendingDoctorId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select attending doctor" />
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
                {errors.attendingDoctorId && (
                  <p className="text-sm text-red-600 mt-1">{errors.attendingDoctorId.message}</p>
                )}
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
            </div>
          </CardContent>
        </Card>

        {/* Bed Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bed className="w-5 h-5" />
              <span>Bed Assignment</span>
            </CardTitle>
            <CardDescription>
              Select ward, room, and bed for the patient
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="wardId">Ward *</Label>
                <Controller
                  name="wardId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredWards().map((ward) => (
                          <SelectItem key={ward.id} value={ward.id}>
                            {ward.name} ({ward.floor})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.wardId && (
                  <p className="text-sm text-red-600 mt-1">{errors.wardId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="roomId">Room *</Label>
                <Controller
                  name="roomId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredRooms().map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.room_number} ({room.room_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roomId && (
                  <p className="text-sm text-red-600 mt-1">{errors.roomId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bedId">Bed *</Label>
                <Controller
                  name="bedId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bed" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredBeds().map((bed) => (
                          <SelectItem key={bed.id} value={bed.id}>
                            {bed.bed_number} ({bed.bed_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bedId && (
                  <p className="text-sm text-red-600 mt-1">{errors.bedId.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5" />
              <span>Medical Information</span>
            </CardTitle>
            <CardDescription>
              Admission reason, diagnosis, and treatment plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="admissionReason">Admission Reason *</Label>
              <Textarea
                id="admissionReason"
                {...register('admissionReason')}
                placeholder="Describe the reason for admission"
                rows={3}
              />
              {errors.admissionReason && (
                <p className="text-sm text-red-600 mt-1">{errors.admissionReason.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="initialDiagnosis">Initial Diagnosis *</Label>
              <Textarea
                id="initialDiagnosis"
                {...register('initialDiagnosis')}
                placeholder="Enter initial diagnosis"
                rows={2}
              />
              {errors.initialDiagnosis && (
                <p className="text-sm text-red-600 mt-1">{errors.initialDiagnosis.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedStay">Estimated Stay (Days) *</Label>
                <Input
                  id="estimatedStay"
                  type="number"
                  min="1"
                  max="365"
                  {...register('estimatedStay', { valueAsNumber: true })}
                  placeholder="Enter estimated stay in days"
                />
                {errors.estimatedStay && (
                  <p className="text-sm text-red-600 mt-1">{errors.estimatedStay.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-6">
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
                <Label htmlFor="isMlc" className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>Medical Legal Case (MLC)</span>
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Enter any additional notes or instructions"
                rows={3}
              />
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
            Reset Form
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-medical-600 hover:bg-medical-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Admitting...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Admit Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}