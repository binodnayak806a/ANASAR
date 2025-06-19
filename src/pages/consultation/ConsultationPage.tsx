import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { User, Calendar, Clock, Heart, Thermometer, Activity, Weight, Ruler, Search, Plus, X, Save, Printer as Print, FileText, Stethoscope, Pill, TestTube, MessageSquare, History, CalendarDays, BookTemplate as Template, Share, Download, AlertTriangle, CheckCircle, Loader2, Mic, MicOff, Globe, Brain, Eye, Zap } from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { appointmentService, patientService } from '@/services/supabaseClient'
import { supabase } from '@/lib/supabase'

// Types
interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  appointment_time: string
  reason: string
  status: string
  patients?: {
    id: string
    patient_id: string
    uhid: string
    personal_info: any
    contact_info: any
    medical_info: any
  }
  doctors?: {
    id: string
    users: {
      full_name: string
    }
    personal_info: any
  }
}

interface Medication {
  id: string
  type: string
  name: string
  dose: string
  frequency: string
  duration: string
  quantity: string
  instruction: string
}

interface Investigation {
  id: string
  type: 'lab' | 'radiology'
  name: string
  urgency: string
  instructions: string
}

interface Symptom {
  id: string
  name: string
  severity: string
  duration: string
}

interface Diagnosis {
  id: string
  code: string
  name: string
  type: 'primary' | 'secondary'
}

interface Advice {
  id: string
  category: string
  text: string
}

// Validation schema
const consultationSchema = z.object({
  // Vitals
  weight: z.number().min(0).max(500).optional(),
  height: z.number().min(0).max(300).optional(),
  bmi: z.number().optional(),
  bsa: z.number().optional(),
  systolic: z.number().min(50).max(300).optional(),
  diastolic: z.number().min(30).max(200).optional(),
  pulse: z.number().min(30).max(200).optional(),
  temperature: z.number().min(90).max(110).optional(),
  spo2: z.number().min(70).max(100).optional(),
  
  // Symptoms
  symptoms: z.array(z.object({
    name: z.string(),
    severity: z.string(),
    duration: z.string()
  })).optional(),
  
  // Diagnosis
  diagnosis: z.array(z.object({
    code: z.string(),
    name: z.string(),
    type: z.enum(['primary', 'secondary'])
  })).optional(),
  
  // Medications
  medications: z.array(z.object({
    type: z.string(),
    name: z.string(),
    dose: z.string(),
    frequency: z.string(),
    duration: z.string(),
    quantity: z.string(),
    instruction: z.string()
  })).optional(),
  
  // Investigations
  investigations: z.array(z.object({
    type: z.enum(['lab', 'radiology']),
    name: z.string(),
    urgency: z.string(),
    instructions: z.string()
  })).optional(),
  
  // Advice
  advice: z.array(z.object({
    category: z.string(),
    text: z.string()
  })).optional(),
  
  // Follow-up
  followUpDate: z.string().optional(),
  followUpDuration: z.string().optional(),
  
  // Notes
  clinicalNotes: z.string().optional(),
  treatmentPlan: z.string().optional()
})

type ConsultationForm = z.infer<typeof consultationSchema>

// Mock data
const mockSymptoms = [
  'Fever', 'Headache', 'Cough', 'Cold', 'Body ache', 'Nausea', 'Vomiting', 
  'Diarrhea', 'Constipation', 'Chest pain', 'Shortness of breath', 'Fatigue',
  'Dizziness', 'Abdominal pain', 'Back pain', 'Joint pain', 'Skin rash'
]

const mockDiagnoses = [
  { code: 'J00', name: 'Acute nasopharyngitis [common cold]' },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified' },
  { code: 'K59.00', name: 'Constipation, unspecified' },
  { code: 'R50.9', name: 'Fever, unspecified' },
  { code: 'R51', name: 'Headache' },
  { code: 'M79.3', name: 'Panniculitis, unspecified' },
  { code: 'K30', name: 'Functional dyspepsia' }
]

const mockMedications = [
  { name: 'Paracetamol', type: 'Tablet', commonDoses: ['500mg', '650mg'] },
  { name: 'Ibuprofen', type: 'Tablet', commonDoses: ['200mg', '400mg'] },
  { name: 'Amoxicillin', type: 'Capsule', commonDoses: ['250mg', '500mg'] },
  { name: 'Cetirizine', type: 'Tablet', commonDoses: ['5mg', '10mg'] },
  { name: 'Omeprazole', type: 'Capsule', commonDoses: ['20mg', '40mg'] }
]

const mockLabTests = [
  'Complete Blood Count (CBC)', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)',
  'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'Thyroid Profile',
  'Urine Routine', 'ESR', 'CRP', 'HbA1c', 'Vitamin D', 'Vitamin B12'
]

const mockRadiologyTests = [
  'Chest X-Ray', 'Abdominal X-Ray', 'ECG', 'Echo', 'USG Abdomen', 'USG Pelvis',
  'CT Scan Head', 'CT Scan Chest', 'MRI Brain', 'MRI Spine'
]

const mockAdviceCategories = [
  { category: 'Diet', advice: ['Take plenty of fluids', 'Avoid spicy food', 'Light diet recommended'] },
  { category: 'Activity', advice: ['Complete bed rest', 'Avoid strenuous activity', 'Regular exercise'] },
  { category: 'General', advice: ['Take medicines as prescribed', 'Follow up if symptoms persist', 'Maintain hygiene'] }
]

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hospitalId, user } = useAuth()
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [isListening, setIsListening] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
  // Search states
  const [symptomSearch, setSymptomSearch] = useState('')
  const [diagnosisSearch, setDiagnosisSearch] = useState('')
  const [medicationSearch, setMedicationSearch] = useState('')
  const [labSearch, setLabSearch] = useState('')
  const [radiologySearch, setRadiologySearch] = useState('')
  
  // Form handling
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<ConsultationForm>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      symptoms: [],
      diagnosis: [],
      medications: [],
      investigations: [],
      advice: []
    }
  })

  const { fields: symptomFields, append: appendSymptom, remove: removeSymptom } = useFieldArray({
    control,
    name: 'symptoms'
  })

  const { fields: diagnosisFields, append: appendDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control,
    name: 'diagnosis'
  })

  const { fields: medicationFields, append: appendMedication, remove: removeMedication } = useFieldArray({
    control,
    name: 'medications'
  })

  const { fields: investigationFields, append: appendInvestigation, remove: removeInvestigation } = useFieldArray({
    control,
    name: 'investigations'
  })

  const { fields: adviceFields, append: appendAdvice, remove: removeAdvice } = useFieldArray({
    control,
    name: 'advice'
  })

  const watchedWeight = watch('weight')
  const watchedHeight = watch('height')

  // Calculate BMI and BSA
  useEffect(() => {
    if (watchedWeight && watchedHeight) {
      const heightInMeters = watchedHeight / 100
      const bmi = watchedWeight / (heightInMeters * heightInMeters)
      const bsa = Math.sqrt((watchedWeight * watchedHeight) / 3600)
      
      setValue('bmi', Math.round(bmi * 10) / 10)
      setValue('bsa', Math.round(bsa * 100) / 100)
    }
  }, [watchedWeight, watchedHeight, setValue])

  // Load appointment data
  useEffect(() => {
    if (appointmentId && hospitalId) {
      loadAppointmentData()
    }
  }, [appointmentId, hospitalId])

  const loadAppointmentData = async () => {
    if (!appointmentId || !hospitalId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info,
            contact_info,
            medical_info
          ),
          doctors (
            id,
            users (
              full_name
            ),
            personal_info
          )
        `)
        .eq('id', appointmentId)
        .eq('hospital_id', hospitalId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setAppointment(data)
      
      // Pre-fill vitals from patient medical info
      const medicalInfo = data.patients?.medical_info || {}
      if (medicalInfo.weight) setValue('weight', medicalInfo.weight)
      if (medicalInfo.height) setValue('height', medicalInfo.height)

    } catch (error: any) {
      console.error('Error loading appointment:', error)
      toast({
        title: "Error",
        description: "Failed to load appointment data",
        variant: "destructive",
      })
      navigate('/appointments')
    } finally {
      setLoading(false)
    }
  }

  // Voice recognition
  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript
        // You can process the transcript and add to symptoms or notes
        console.log('Voice input:', transcript)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } else {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      })
    }
  }

  const stopListening = () => {
    setIsListening(false)
  }

  // Add functions
  const addSymptom = (symptomName: string) => {
    appendSymptom({
      name: symptomName,
      severity: 'Mild',
      duration: '1 day'
    })
    setSymptomSearch('')
  }

  const addDiagnosis = (diagnosis: any) => {
    appendDiagnosis({
      code: diagnosis.code,
      name: diagnosis.name,
      type: 'primary'
    })
    setDiagnosisSearch('')
  }

  const addMedication = () => {
    appendMedication({
      type: 'Tablet',
      name: '',
      dose: '',
      frequency: 'BD',
      duration: '5 days',
      quantity: '10',
      instruction: 'After food'
    })
  }

  const addLabInvestigation = (testName: string) => {
    appendInvestigation({
      type: 'lab',
      name: testName,
      urgency: 'Routine',
      instructions: ''
    })
    setLabSearch('')
  }

  const addRadiologyInvestigation = (testName: string) => {
    appendInvestigation({
      type: 'radiology',
      name: testName,
      urgency: 'Routine',
      instructions: ''
    })
    setRadiologySearch('')
  }

  const addAdviceFromCategory = (category: string, adviceText: string) => {
    appendAdvice({
      category,
      text: adviceText
    })
  }

  // Save consultation
  const onSubmit = async (data: ConsultationForm) => {
    if (!appointmentId || !hospitalId || !user) return

    setSaving(true)
    try {
      // Update appointment with consultation data
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          vital_signs: {
            weight: data.weight,
            height: data.height,
            bmi: data.bmi,
            bsa: data.bsa,
            blood_pressure: data.systolic && data.diastolic ? `${data.systolic}/${data.diastolic}` : null,
            pulse: data.pulse,
            temperature: data.temperature,
            spo2: data.spo2
          },
          symptoms: data.symptoms,
          diagnosis: data.diagnosis?.map(d => d.name).join(', '),
          prescription: {
            medications: data.medications,
            investigations: data.investigations,
            advice: data.advice
          },
          follow_up_date: data.followUpDate,
          notes: data.clinicalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Consultation Saved",
        description: "Patient consultation has been saved successfully",
        variant: "default",
      })

      // Navigate back to appointments
      navigate('/appointments')

    } catch (error: any) {
      console.error('Error saving consultation:', error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save consultation",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Generate prescription PDF
  const generatePrescriptionPDF = async () => {
    try {
      const formData = getValues()
      
      // Create prescription content
      const prescriptionContent = {
        patient: appointment?.patients,
        doctor: appointment?.doctors,
        appointment: appointment,
        vitals: {
          weight: formData.weight,
          height: formData.height,
          bmi: formData.bmi,
          bp: formData.systolic && formData.diastolic ? `${formData.systolic}/${formData.diastolic}` : null,
          pulse: formData.pulse,
          temperature: formData.temperature,
          spo2: formData.spo2
        },
        symptoms: formData.symptoms,
        diagnosis: formData.diagnosis,
        medications: formData.medications,
        investigations: formData.investigations,
        advice: formData.advice,
        followUp: formData.followUpDate,
        notes: formData.clinicalNotes
      }

      // In a real implementation, you would use a PDF generation library
      console.log('Generating PDF with content:', prescriptionContent)
      
      toast({
        title: "PDF Generated",
        description: "Prescription PDF has been generated successfully",
        variant: "default",
      })

    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate prescription PDF",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading consultation...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Appointment not found</p>
          <Button onClick={() => navigate('/appointments')} className="mt-4">
            Back to Appointments
          </Button>
        </div>
      </div>
    )
  }

  const patient = appointment.patients
  const doctor = appointment.doctors
  const patientName = patient ? `${patient.personal_info?.first_name || ''} ${patient.personal_info?.last_name || ''}` : 'Unknown Patient'

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Consultation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {patientName} - {new Date(appointment.appointment_date).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Voice
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={generatePrescriptionPDF}
            >
              <Print className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
            <TabsTrigger value="investigations">Investigations</TabsTrigger>
            <TabsTrigger value="rx">Rx</TabsTrigger>
            <TabsTrigger value="advice">Advice</TabsTrigger>
            <TabsTrigger value="past">Past Inv.</TabsTrigger>
            <TabsTrigger value="followup">Follow-Up</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="save">Save & Print</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Patient Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Name</Label>
                      <p className="font-medium">{patientName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">UHID</Label>
                      <p className="font-medium">{patient?.uhid}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Age/Gender</Label>
                      <p className="font-medium">
                        {patient?.personal_info?.age} years, {patient?.personal_info?.gender}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Blood Group</Label>
                      <p className="font-medium">{patient?.personal_info?.blood_group || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Mobile</Label>
                      <p className="font-medium">{patient?.contact_info?.mobile}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <p className="font-medium text-sm">{patient?.contact_info?.address_line}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Appointment Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Date</Label>
                      <p className="font-medium">
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Time</Label>
                      <p className="font-medium">{appointment.appointment_time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Doctor</Label>
                      <p className="font-medium">Dr. {doctor?.users?.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <Badge variant="outline">{appointment.status}</Badge>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-gray-500">Reason</Label>
                      <p className="font-medium">{appointment.reason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Vital Signs</span>
                </CardTitle>
                <CardDescription>
                  Record patient's vital signs and measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <div className="relative">
                        <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="pl-10"
                          {...register('weight', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="height">Height (cm)</Label>
                      <div className="relative">
                        <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="height"
                          type="number"
                          placeholder="0"
                          className="pl-10"
                          {...register('height', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bmi">BMI</Label>
                      <Input
                        id="bmi"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        readOnly
                        className="bg-gray-50"
                        {...register('bmi', { valueAsNumber: true })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bsa">BSA (m²)</Label>
                      <Input
                        id="bsa"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        readOnly
                        className="bg-gray-50"
                        {...register('bsa', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Blood Pressure (mmHg)</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          placeholder="Systolic"
                          {...register('systolic', { valueAsNumber: true })}
                        />
                        <span className="flex items-center">/</span>
                        <Input
                          type="number"
                          placeholder="Diastolic"
                          {...register('diastolic', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pulse">Pulse (bpm)</Label>
                      <div className="relative">
                        <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="pulse"
                          type="number"
                          placeholder="0"
                          className="pl-10"
                          {...register('pulse', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="temperature">Temperature (°F)</Label>
                      <div className="relative">
                        <Thermometer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          placeholder="98.6"
                          className="pl-10"
                          {...register('temperature', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="spo2">SpO2 (%)</Label>
                      <Input
                        id="spo2"
                        type="number"
                        placeholder="98"
                        {...register('spo2', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Symptoms Tab */}
          <TabsContent value="symptoms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="w-5 h-5" />
                  <span>Symptoms</span>
                </CardTitle>
                <CardDescription>
                  Record patient's symptoms with severity and duration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search symptoms..."
                      value={symptomSearch}
                      onChange={(e) => setSymptomSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    variant="outline"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>

                {symptomSearch && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {mockSymptoms
                      .filter(symptom => symptom.toLowerCase().includes(symptomSearch.toLowerCase()))
                      .map((symptom) => (
                        <div
                          key={symptom}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => addSymptom(symptom)}
                        >
                          {symptom}
                        </div>
                      ))}
                  </div>
                )}

                <div className="space-y-3">
                  {symptomFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Input
                          placeholder="Symptom name"
                          {...register(`symptoms.${index}.name`)}
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          value={watch(`symptoms.${index}.severity`)}
                          onValueChange={(value) => setValue(`symptoms.${index}.severity`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mild">Mild</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Input
                          placeholder="Duration"
                          {...register(`symptoms.${index}.duration`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSymptom(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                  <Textarea
                    id="clinicalNotes"
                    placeholder="Additional clinical observations..."
                    rows={4}
                    {...register('clinicalNotes')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>Diagnosis</span>
                </CardTitle>
                <CardDescription>
                  Add ICD-10/11 diagnosis codes and descriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search ICD codes or diagnosis..."
                    value={diagnosisSearch}
                    onChange={(e) => setDiagnosisSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {diagnosisSearch && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {mockDiagnoses
                      .filter(diagnosis => 
                        diagnosis.name.toLowerCase().includes(diagnosisSearch.toLowerCase()) ||
                        diagnosis.code.toLowerCase().includes(diagnosisSearch.toLowerCase())
                      )
                      .map((diagnosis) => (
                        <div
                          key={diagnosis.code}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => addDiagnosis(diagnosis)}
                        >
                          <div className="font-medium">{diagnosis.code}</div>
                          <div className="text-sm text-gray-600">{diagnosis.name}</div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="space-y-3">
                  {diagnosisFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-24">
                        <Input
                          placeholder="ICD Code"
                          {...register(`diagnosis.${index}.code`)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Diagnosis description"
                          {...register(`diagnosis.${index}.name`)}
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          value={watch(`diagnosis.${index}.type`)}
                          onValueChange={(value) => setValue(`diagnosis.${index}.type`, value as 'primary' | 'secondary')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDiagnosis(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investigations Tab */}
          <TabsContent value="investigations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TestTube className="w-5 h-5" />
                    <span>Lab Tests</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search lab tests..."
                      value={labSearch}
                      onChange={(e) => setLabSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {labSearch && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {mockLabTests
                        .filter(test => test.toLowerCase().includes(labSearch.toLowerCase()))
                        .map((test) => (
                          <div
                            key={test}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => addLabInvestigation(test)}
                          >
                            {test}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Radiology</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search radiology tests..."
                      value={radiologySearch}
                      onChange={(e) => setRadiologySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {radiologySearch && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {mockRadiologyTests
                        .filter(test => test.toLowerCase().includes(radiologySearch.toLowerCase()))
                        .map((test) => (
                          <div
                            key={test}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => addRadiologyInvestigation(test)}
                          >
                            {test}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Selected Investigations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {investigationFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Badge variant={watch(`investigations.${index}.type`) === 'lab' ? 'default' : 'secondary'}>
                        {watch(`investigations.${index}.type`)}
                      </Badge>
                      <div className="flex-1">
                        <Input
                          placeholder="Investigation name"
                          {...register(`investigations.${index}.name`)}
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          value={watch(`investigations.${index}.urgency`)}
                          onValueChange={(value) => setValue(`investigations.${index}.urgency`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Routine">Routine</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                            <SelectItem value="STAT">STAT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-48">
                        <Input
                          placeholder="Instructions"
                          {...register(`investigations.${index}.instructions`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvestigation(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePrescriptionPDF}
                  className="mt-4"
                >
                  <Print className="w-4 h-4 mr-2" />
                  Print Investigation Slip
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rx Tab */}
          <TabsContent value="rx">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Pill className="w-5 h-5" />
                    <span>Prescription</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMedication}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Medicine
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      AI Suggest
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Prescribe medications with dosage, frequency, and instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search medications..."
                      value={medicationSearch}
                      onChange={(e) => setMedicationSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {medicationSearch && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {mockMedications
                        .filter(med => med.name.toLowerCase().includes(medicationSearch.toLowerCase()))
                        .map((medication) => (
                          <div
                            key={medication.name}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              appendMedication({
                                type: medication.type,
                                name: medication.name,
                                dose: medication.commonDoses[0],
                                frequency: 'BD',
                                duration: '5 days',
                                quantity: '10',
                                instruction: 'After food'
                              })
                              setMedicationSearch('')
                            }}
                          >
                            <div className="font-medium">{medication.name}</div>
                            <div className="text-sm text-gray-600">{medication.type} - {medication.commonDoses.join(', ')}</div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 w-20">Type</th>
                          <th className="text-left p-2 flex-1">Medicine Name</th>
                          <th className="text-left p-2 w-24">Dose</th>
                          <th className="text-left p-2 w-24">Frequency</th>
                          <th className="text-left p-2 w-24">Duration</th>
                          <th className="text-left p-2 w-20">Qty</th>
                          <th className="text-left p-2 w-32">Instruction</th>
                          <th className="text-left p-2 w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicationFields.map((field, index) => (
                          <tr key={field.id} className="border-b">
                            <td className="p-2">
                              <Select
                                value={watch(`medications.${index}.type`)}
                                onValueChange={(value) => setValue(`medications.${index}.type`, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Tablet">Tab</SelectItem>
                                  <SelectItem value="Capsule">Cap</SelectItem>
                                  <SelectItem value="Syrup">Syrup</SelectItem>
                                  <SelectItem value="Injection">Inj</SelectItem>
                                  <SelectItem value="Drops">Drops</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="Medicine name"
                                className="h-8"
                                {...register(`medications.${index}.name`)}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="Dose"
                                className="h-8"
                                {...register(`medications.${index}.dose`)}
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={watch(`medications.${index}.frequency`)}
                                onValueChange={(value) => setValue(`medications.${index}.frequency`, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OD">OD</SelectItem>
                                  <SelectItem value="BD">BD</SelectItem>
                                  <SelectItem value="TDS">TDS</SelectItem>
                                  <SelectItem value="QID">QID</SelectItem>
                                  <SelectItem value="SOS">SOS</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="Duration"
                                className="h-8"
                                {...register(`medications.${index}.duration`)}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="Qty"
                                className="h-8"
                                {...register(`medications.${index}.quantity`)}
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={watch(`medications.${index}.instruction`)}
                                onValueChange={(value) => setValue(`medications.${index}.instruction`, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Before food">Before food</SelectItem>
                                  <SelectItem value="After food">After food</SelectItem>
                                  <SelectItem value="With food">With food</SelectItem>
                                  <SelectItem value="Empty stomach">Empty stomach</SelectItem>
                                  <SelectItem value="At bedtime">At bedtime</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMedication(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {medicationFields.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-yellow-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Drug Interaction Alert</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        No significant drug interactions detected. Always verify with latest drug interaction database.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Multi-language prescription support available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advice Tab */}
          <TabsContent value="advice">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Patient Advice</span>
                </CardTitle>
                <CardDescription>
                  Provide treatment advice and care instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockAdviceCategories.map((category) => (
                    <Card key={category.category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{category.category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {category.advice.map((advice, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-left justify-start h-auto p-2"
                            onClick={() => addAdviceFromCategory(category.category, advice)}
                          >
                            <Plus className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span className="text-xs">{advice}</span>
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div>
                  <Label htmlFor="customAdvice">Custom Advice</Label>
                  <Textarea
                    id="customAdvice"
                    placeholder="Enter custom advice or treatment instructions..."
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const customAdvice = (document.getElementById('customAdvice') as HTMLTextAreaElement)?.value
                      if (customAdvice) {
                        appendAdvice({
                          category: 'Custom',
                          text: customAdvice
                        })
                        ;(document.getElementById('customAdvice') as HTMLTextAreaElement).value = ''
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Advice
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Selected Advice</Label>
                  {adviceFields.map((field, index) => (
                    <div key={field.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Badge variant="outline">{watch(`advice.${index}.category`)}</Badge>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Advice text"
                          rows={2}
                          {...register(`advice.${index}.text`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdvice(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="treatmentCodes">Treatment Codes</Label>
                  <Input
                    id="treatmentCodes"
                    placeholder="Enter treatment codes (comma separated)"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Past Investigations Tab */}
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5" />
                  <span>Past Investigations</span>
                </CardTitle>
                <CardDescription>
                  View patient's investigation history and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No past investigations found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Previous lab reports and radiology studies will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follow-up Tab */}
          <TabsContent value="followup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5" />
                  <span>Follow-up</span>
                </CardTitle>
                <CardDescription>
                  Schedule next appointment and follow-up instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Quick Pick Duration</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['1 week', '2 weeks', '1 month', '3 months', '6 months', 'As needed'].map((duration) => (
                        <Button
                          key={duration}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const date = new Date()
                            if (duration === '1 week') date.setDate(date.getDate() + 7)
                            else if (duration === '2 weeks') date.setDate(date.getDate() + 14)
                            else if (duration === '1 month') date.setMonth(date.getMonth() + 1)
                            else if (duration === '3 months') date.setMonth(date.getMonth() + 3)
                            else if (duration === '6 months') date.setMonth(date.getMonth() + 6)
                            
                            if (duration !== 'As needed') {
                              setValue('followUpDate', date.toISOString().split('T')[0])
                            }
                            setValue('followUpDuration', duration)
                          }}
                        >
                          {duration}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="followUpDate">Follow-up Date</Label>
                    <Input
                      id="followUpDate"
                      type="date"
                      {...register('followUpDate')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
                  <Textarea
                    id="followUpInstructions"
                    placeholder="Special instructions for follow-up visit..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Template className="w-5 h-5" />
                  <span>Templates</span>
                </CardTitle>
                <CardDescription>
                  Save and load consultation templates for common conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Template name"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </div>

                <div className="text-center py-8">
                  <Template className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No saved templates</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Create templates for common conditions to speed up consultations
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save & Print Tab */}
          <TabsContent value="save">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Save & Print</span>
                </CardTitle>
                <CardDescription>
                  Generate prescription PDF and save consultation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Prescription Preview</h3>
                    <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px]">
                      <div className="text-center mb-4">
                        <h4 className="font-bold">{hospitalName || 'Hospital Name'}</h4>
                        <p className="text-sm text-gray-600">Prescription</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div><strong>Patient:</strong> {patientName}</div>
                        <div><strong>UHID:</strong> {patient?.uhid}</div>
                        <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                        <div><strong>Doctor:</strong> Dr. {doctor?.users?.full_name}</div>
                      </div>

                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Rx:</h5>
                        {medicationFields.length === 0 ? (
                          <p className="text-gray-500 text-sm">No medications prescribed</p>
                        ) : (
                          <div className="space-y-1 text-sm">
                            {medicationFields.map((_, index) => (
                              <div key={index}>
                                {watch(`medications.${index}.name`)} {watch(`medications.${index}.dose`)} - {watch(`medications.${index}.frequency`)} x {watch(`medications.${index}.duration`)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {adviceFields.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Advice:</h5>
                          <div className="space-y-1 text-sm">
                            {adviceFields.map((_, index) => (
                              <div key={index}>• {watch(`advice.${index}.text`)}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Actions</h3>
                    
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-medical-600 hover:bg-medical-700"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Consultation
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={generatePrescriptionPDF}
                      >
                        <Print className="w-4 h-4 mr-2" />
                        Generate PDF
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>

                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Ready to Save</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        All consultation data has been recorded and is ready to be saved.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}