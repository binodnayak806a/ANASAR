import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/use-toast'

// Validation schema
const hospitalRegisterSchema = z.object({
  hospitalName: z.string()
    .min(3, 'Hospital name must be at least 3 characters')
    .max(100, 'Hospital name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Hospital name contains invalid characters'),
  
  address: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be less than 500 characters'),
  
  contactPersonName: z.string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(50, 'Contact person name must be less than 50 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and dots'),
  
  contactEmail: z.string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  
  contactMobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  
  confirmPassword: z.string(),
  
  subscriptionTier: z.enum(['basic', 'standard', 'premium'], {
    required_error: 'Please select a subscription tier'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type HospitalRegisterForm = z.infer<typeof hospitalRegisterSchema>

const subscriptionTiers = [
  {
    value: 'basic',
    label: 'Basic Plan',
    description: 'Up to 50 patients, 2 doctors',
    price: '₹2,999/month'
  },
  {
    value: 'standard',
    label: 'Standard Plan',
    description: 'Up to 200 patients, 10 doctors',
    price: '₹7,999/month'
  },
  {
    value: 'premium',
    label: 'Premium Plan',
    description: 'Unlimited patients & doctors',
    price: '₹15,999/month'
  }
]

export default function HospitalRegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HospitalRegisterForm>({
    resolver: zodResolver(hospitalRegisterSchema),
  })

  const selectedTier = watch('subscriptionTier')

  const onSubmit = async (data: HospitalRegisterForm) => {
    setIsLoading(true)
    
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.contactEmail,
        password: data.password,
        options: {
          data: {
            hospital_name: data.hospitalName,
            address: data.address,
            contact_person: data.contactPersonName,
            contact_mobile: data.contactMobile,
            subscription_tier: data.subscriptionTier,
            role: 'hospital_admin'
          }
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (authData.user) {
        setShowSuccess(true)
        
        toast({
          title: "Registration Successful!",
          description: "Verification email sent to your email address. Please verify to complete registration.",
          variant: "default",
        })

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred during registration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[@$!%*?&]/.test(password)) strength++
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
    
    return {
      strength,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || 'bg-gray-200'
    }
  }

  const passwordStrength = getPasswordStrength(watch('password') || '')

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-50 to-medical-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              A verification email has been sent to your email address. Please verify your email to complete the registration process.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to login page in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-50 to-medical-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="absolute top-4 left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
          
          <div className="mx-auto w-16 h-16 bg-medical-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Register Your Hospital
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Join Aarogya Sahayak HMS - Complete Hospital Management Solution
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hospital Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Hospital Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="hospitalName">Hospital Name *</Label>
                  <Input
                    id="hospitalName"
                    placeholder="Enter hospital name"
                    {...register('hospitalName')}
                    className="h-11"
                  />
                  {errors.hospitalName && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.hospitalName.message}
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="address">Hospital Address *</Label>
                  <Input
                    id="address"
                    placeholder="Enter complete hospital address"
                    {...register('address')}
                    className="h-11"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPersonName">Contact Person Name *</Label>
                  <Input
                    id="contactPersonName"
                    placeholder="Enter contact person name"
                    {...register('contactPersonName')}
                    className="h-11"
                  />
                  {errors.contactPersonName && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactPersonName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="contactMobile">Mobile Number *</Label>
                  <Input
                    id="contactMobile"
                    placeholder="Enter 10-digit mobile number"
                    {...register('contactMobile')}
                    className="h-11"
                    maxLength={10}
                  />
                  {errors.contactMobile && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactMobile.message}
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="contactEmail">Email Address *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="Enter email address"
                    {...register('contactEmail')}
                    className="h-11"
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Security
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    {...register('password')}
                    className="h-11"
                  />
                  {watch('password') && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    {...register('confirmPassword')}
                    className="h-11"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Subscription Plan
              </h3>
              
              <div>
                <Label htmlFor="subscriptionTier">Choose Your Plan *</Label>
                <Select onValueChange={(value) => setValue('subscriptionTier', value as any)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a subscription tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionTiers.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{tier.label} - {tier.price}</span>
                          <span className="text-sm text-gray-500">{tier.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subscriptionTier && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.subscriptionTier.message}
                  </p>
                )}
              </div>

              {selectedTier && (
                <div className="p-4 bg-medical-50 dark:bg-medical-900/20 rounded-lg border border-medical-200 dark:border-medical-800">
                  <div className="flex items-center space-x-2 text-medical-700 dark:text-medical-300">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Selected: {subscriptionTiers.find(t => t.value === selectedTier)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-medical-600 dark:text-medical-400 mt-1">
                    {subscriptionTiers.find(t => t.value === selectedTier)?.description}
                  </p>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-medical-600 hover:bg-medical-700" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Hospital Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-medical-600 hover:text-medical-700 font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}