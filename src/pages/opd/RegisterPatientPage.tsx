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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Phone, 
  MapPin, 
  Users, 
  CreditCard, 
  UserCheck, 
  Shield, 
  QrCode,
  Save,
  Calendar,
  Loader2,
  Upload,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { patientService } from '@/services/supabaseClient'

// Validation schema
const patientRegistrationSchema = z.object({
  // Demographics
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Master', 'Baby'], {
    required_error: 'Please select a title'
  }),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'First name can only contain letters, spaces, and dots'),
  fatherHusbandName: z.string()
    .min(2, 'Father/Husband name must be at least 2 characters')
    .max(50, 'Father/Husband name must be less than 50 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Father/Husband name can only contain letters, spaces, and dots'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Last name can only contain letters, spaces, and dots'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  age: z.number().min(0).max(150),
  gender: z.enum(['Male', 'Female', 'Other'], {
    required_error: 'Please select gender'
  }),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], {
    required_error: 'Please select blood group'
  }),
  primaryLanguage: z.string().min(1, 'Primary language is required'),
  weight: z.number().min(0.1, 'Weight must be greater than 0').max(500, 'Weight seems too high'),
  height: z.number().min(10, 'Height must be greater than 10 cm').max(300, 'Height seems too high'),

  // Contact & Address
  mobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  addressLine: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(200, 'Address must be less than 200 characters'),
  areaLandmark: z.string().max(100, 'Area/Landmark must be less than 100 characters').optional(),
  pincode: z.string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  city: z.string().min(2, 'City is required').max(50, 'City name too long'),
  state: z.string().min(2, 'State is required').max(50, 'State name too long'),
  country: z.string().min(2, 'Country is required').max(50, 'Country name too long'),

  // Kin Details
  kinRelation: z.string().min(1, 'Kin relation is required'),
  kinName: z.string()
    .min(2, 'Kin name must be at least 2 characters')
    .max(50, 'Kin name must be less than 50 characters'),
  kinContact: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),

  // Payer Details
  payerType: z.enum(['Self', 'TPA', 'Insurance', 'Corporate'], {
    required_error: 'Please select payer type'
  }),
  payerName: z.string().optional(),
  planClass: z.string().optional(),
  cardNumber: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),

  // Referral & Occupation
  referredBy: z.string().optional(),
  referredTo: z.string().optional(),
  referralSpecialty: z.string().optional(),
  occupationPresent: z.string().optional(),
  occupationSince: z.string().optional(),
  occupationPast: z.string().optional(),
  occupationSincePast: z.string().optional(),

  // Advanced Info
  religion: z.string().optional(),
  monthlyIncome: z.number().min(0).optional(),
  isVip: z.boolean().default(false),
  alias: z.string().optional(),
  maskName: z.boolean().default(false),
  handleWithCare: z.boolean().default(false),

  // ABDM Integration
  abhaId: z.string().optional(),
  abdmConsent: z.boolean().default(false),
  photoIdFile: z.any().optional()
})

type PatientRegistrationForm = z.infer<typeof patientRegistrationSchema>

const titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Master', 'Baby']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const genders = ['Male', 'Female', 'Other']
const payerTypes = ['Self', 'TPA', 'Insurance', 'Corporate']
const relations = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Guardian', 'Other']
const languages = ['Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi']
const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other']
const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
]

export default function RegisterPatientPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedUhid, setGeneratedUhid] = useState<string | null>(null)
  const [photoIdPreview, setPhotoIdPreview] = useState<string | null>(null)
  const { toast } = useToast()
  const { hospitalId } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<PatientRegistrationForm>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      country: 'India',
      payerType: 'Self',
      isVip: false,
      maskName: false,
      handleWithCare: false,
      abdmConsent: false
    }
  })

  const watchedDateOfBirth = watch('dateOfBirth')
  const watchedPayerType = watch('payerType')

  // Auto-calculate age from date of birth
  useEffect(() => {
    if (watchedDateOfBirth) {
      const today = new Date()
      const birthDate = new Date(watchedDateOfBirth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      setValue('age', Math.max(0, age))
    }
  }, [watchedDateOfBirth, setValue])

  // Generate UHID
  const generateUhid = (): string => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `UH${timestamp}${random}`
  }

  // Handle photo ID upload
  const handlePhotoIdUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Photo ID file must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoIdPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setValue('photoIdFile', file)
    }
  }

  // Submit form
  const onSubmit = async (data: PatientRegistrationForm) => {
    if (!hospitalId) {
      toast({
        title: "Error",
        description: "Hospital ID not found. Please try logging in again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate UHID and patient ID
      const uhid = generateUhid()
      const patientId = `PAT${Date.now().toString().slice(-8)}`

      // Prepare patient data
      const patientData = {
        patient_id: patientId,
        uhid: uhid,
        personal_info: {
          title: data.title,
          first_name: data.firstName,
          father_husband_name: data.fatherHusbandName,
          last_name: data.lastName,
          date_of_birth: data.dateOfBirth,
          age: data.age,
          gender: data.gender,
          blood_group: data.bloodGroup,
          primary_language: data.primaryLanguage,
          weight: data.weight,
          height: data.height,
          religion: data.religion,
          monthly_income: data.monthlyIncome,
          is_vip: data.isVip,
          alias: data.alias,
          mask_name: data.maskName,
          handle_with_care: data.handleWithCare
        },
        contact_info: {
          mobile: data.mobile,
          address_line: data.addressLine,
          area_landmark: data.areaLandmark,
          pincode: data.pincode,
          city: data.city,
          state: data.state,
          country: data.country
        },
        medical_info: {
          blood_group: data.bloodGroup,
          weight: data.weight,
          height: data.height,
          allergies: [],
          chronic_conditions: [],
          current_medications: []
        },
        insurance_info: data.payerType !== 'Self' ? {
          payer_type: data.payerType,
          payer_name: data.payerName,
          plan_class: data.planClass,
          card_number: data.cardNumber,
          valid_from: data.validFrom,
          valid_to: data.validTo
        } : null,
        emergency_contact: {
          relation: data.kinRelation,
          name: data.kinName,
          contact: data.kinContact
        },
        referral_info: {
          referred_by: data.referredBy,
          referred_to: data.referredTo,
          specialty: data.referralSpecialty
        },
        occupation_info: {
          present: data.occupationPresent,
          since: data.occupationSince,
          past: data.occupationPast,
          since_past: data.occupationSincePast
        },
        abdm_info: {
          abha_id: data.abhaId,
          consent_given: data.abdmConsent
        }
      }

      // Save patient
      const result = await patientService.addPatient(patientData, hospitalId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to register patient')
      }

      setGeneratedUhid(uhid)
      
      toast({
        title: "Patient Registered Successfully!",
        description: `UHID: ${uhid} has been generated for ${data.firstName} ${data.lastName}`,
        variant: "default",
      })

      // Reset form
      reset()
      setPhotoIdPreview(null)

      // Navigate to appointment booking or patient list
      setTimeout(() => {
        navigate(`/patients/${result.data?.id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Patient registration error:', error)
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred during patient registration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Register OPD Patient
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Complete patient registration for outpatient department
        </p>
      </div>

      {/* Success Message */}
      {generatedUhid && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <Shield className="w-5 h-5" />
              <span className="font-medium">
                Patient registered successfully! UHID: {generatedUhid}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Demographics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Demographics</span>
            </CardTitle>
            <CardDescription>
              Basic patient information and physical details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="fatherHusbandName">Father/Husband Name *</Label>
                <Input
                  id="fatherHusbandName"
                  {...register('fatherHusbandName')}
                  placeholder="Enter father/husband name"
                />
                {errors.fatherHusbandName && (
                  <p className="text-sm text-red-600 mt-1">{errors.fatherHusbandName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="age">Age (Years)</Label>
                <Input
                  id="age"
                  type="number"
                  {...register('age', { valueAsNumber: true })}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genders.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && (
                  <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Controller
                  name="bloodGroup"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bloodGroup && (
                  <p className="text-sm text-red-600 mt-1">{errors.bloodGroup.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="primaryLanguage">Primary Language *</Label>
                <Controller
                  name="primaryLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.primaryLanguage && (
                  <p className="text-sm text-red-600 mt-1">{errors.primaryLanguage.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="Enter weight"
                />
                {errors.weight && (
                  <p className="text-sm text-red-600 mt-1">{errors.weight.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="height">Height (cm) *</Label>
                <Input
                  id="height"
                  type="number"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="Enter height"
                />
                {errors.height && (
                  <p className="text-sm text-red-600 mt-1">{errors.height.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Address Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Contact & Address</span>
            </CardTitle>
            <CardDescription>
              Contact information and residential address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    +91
                  </span>
                  <Input
                    id="mobile"
                    {...register('mobile')}
                    placeholder="Enter 10-digit mobile"
                    className="rounded-l-none"
                    maxLength={10}
                  />
                </div>
                {errors.mobile && (
                  <p className="text-sm text-red-600 mt-1">{errors.mobile.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="addressLine">Address Line *</Label>
                <Input
                  id="addressLine"
                  {...register('addressLine')}
                  placeholder="Enter complete address"
                />
                {errors.addressLine && (
                  <p className="text-sm text-red-600 mt-1">{errors.addressLine.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="areaLandmark">Area/Landmark</Label>
                <Input
                  id="areaLandmark"
                  {...register('areaLandmark')}
                  placeholder="Enter area/landmark"
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  {...register('pincode')}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                />
                {errors.pincode && (
                  <p className="text-sm text-red-600 mt-1">{errors.pincode.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="Enter city"
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.state && (
                  <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...register('country')}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kin Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Emergency Contact (Kin Details)</span>
            </CardTitle>
            <CardDescription>
              Emergency contact person information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="kinRelation">Relation *</Label>
                <Controller
                  name="kinRelation"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {relations.map((relation) => (
                          <SelectItem key={relation} value={relation}>
                            {relation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.kinRelation && (
                  <p className="text-sm text-red-600 mt-1">{errors.kinRelation.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="kinName">Kin Name *</Label>
                <Input
                  id="kinName"
                  {...register('kinName')}
                  placeholder="Enter kin name"
                />
                {errors.kinName && (
                  <p className="text-sm text-red-600 mt-1">{errors.kinName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="kinContact">Kin Contact *</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    +91
                  </span>
                  <Input
                    id="kinContact"
                    {...register('kinContact')}
                    placeholder="Enter 10-digit mobile"
                    className="rounded-l-none"
                    maxLength={10}
                  />
                </div>
                {errors.kinContact && (
                  <p className="text-sm text-red-600 mt-1">{errors.kinContact.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payer Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payer Details</span>
            </CardTitle>
            <CardDescription>
              Insurance and payment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="payerType">Payer Type *</Label>
                <Controller
                  name="payerType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payer type" />
                      </SelectTrigger>
                      <SelectContent>
                        {payerTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.payerType && (
                  <p className="text-sm text-red-600 mt-1">{errors.payerType.message}</p>
                )}
              </div>

              {watchedPayerType !== 'Self' && (
                <>
                  <div>
                    <Label htmlFor="payerName">Payer Name</Label>
                    <Input
                      id="payerName"
                      {...register('payerName')}
                      placeholder="Enter payer name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="planClass">Plan/Class</Label>
                    <Input
                      id="planClass"
                      {...register('planClass')}
                      placeholder="Enter plan/class"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      {...register('cardNumber')}
                      placeholder="Enter card number"
                    />
                  </div>
                </>
              )}
            </div>

            {watchedPayerType !== 'Self' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    {...register('validFrom')}
                  />
                </div>

                <div>
                  <Label htmlFor="validTo">Valid To</Label>
                  <Input
                    id="validTo"
                    type="date"
                    {...register('validTo')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral & Occupation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5" />
              <span>Referral & Occupation</span>
            </CardTitle>
            <CardDescription>
              Referral source and occupation details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="referredBy">Referred By</Label>
                <Input
                  id="referredBy"
                  {...register('referredBy')}
                  placeholder="Enter referral source"
                />
              </div>

              <div>
                <Label htmlFor="referredTo">Referred To</Label>
                <Input
                  id="referredTo"
                  {...register('referredTo')}
                  placeholder="Enter referred doctor"
                />
              </div>

              <div>
                <Label htmlFor="referralSpecialty">Referral Specialty</Label>
                <Input
                  id="referralSpecialty"
                  {...register('referralSpecialty')}
                  placeholder="Enter specialty"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="occupationPresent">Present Occupation</Label>
                <Input
                  id="occupationPresent"
                  {...register('occupationPresent')}
                  placeholder="Enter current occupation"
                />
              </div>

              <div>
                <Label htmlFor="occupationSince">Since</Label>
                <Input
                  id="occupationSince"
                  {...register('occupationSince')}
                  placeholder="Enter duration"
                />
              </div>

              <div>
                <Label htmlFor="occupationPast">Past Occupation</Label>
                <Input
                  id="occupationPast"
                  {...register('occupationPast')}
                  placeholder="Enter past occupation"
                />
              </div>

              <div>
                <Label htmlFor="occupationSincePast">Since Past</Label>
                <Input
                  id="occupationSincePast"
                  {...register('occupationSincePast')}
                  placeholder="Enter duration"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Advanced Information</span>
            </CardTitle>
            <CardDescription>
              Additional patient information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="religion">Religion</Label>
                <Controller
                  name="religion"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {religions.map((religion) => (
                          <SelectItem key={religion} value={religion}>
                            {religion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="monthlyIncome">Monthly Income (₹)</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  {...register('monthlyIncome', { valueAsNumber: true })}
                  placeholder="Enter monthly income"
                />
              </div>

              <div>
                <Label htmlFor="alias">Alias</Label>
                <Input
                  id="alias"
                  {...register('alias')}
                  placeholder="Enter alias name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Controller
                  name="isVip"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isVip"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isVip">VIP Patient</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="maskName"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="maskName"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="maskName">Mask Name</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="handleWithCare"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="handleWithCare"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="handleWithCare">Handle with Care</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ABDM Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>ABDM Integration</span>
            </CardTitle>
            <CardDescription>
              Ayushman Bharat Digital Mission integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="abhaId">ABHA ID</Label>
                <Input
                  id="abhaId"
                  {...register('abhaId')}
                  placeholder="Enter ABHA ID or scan QR"
                />
              </div>

              <div>
                <Label htmlFor="photoId">Photo ID Upload</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="photoId"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handlePhotoIdUpload}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {photoIdPreview && (
                  <div className="mt-2">
                    <img
                      src={photoIdPreview}
                      alt="Photo ID Preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="abdmConsent"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="abdmConsent"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="abdmConsent" className="text-sm">
                I consent to share my health data through ABDM for better healthcare delivery
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isLoading}
          >
            Reset Form
          </Button>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-medical-600 hover:bg-medical-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save & Add Appointment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}