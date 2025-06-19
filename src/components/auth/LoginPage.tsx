import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Building2, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/lib/use-toast'
import { supabase } from '@/lib/supabase'

// Enhanced validation schema supporting email or mobile
const loginSchema = z.object({
  emailOrMobile: z.string()
    .min(1, 'Email or mobile number is required')
    .refine((value) => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      // Check if it's a valid Indian mobile number
      const mobileRegex = /^[6-9]\d{9}$/
      
      return emailRegex.test(value) || mobileRegex.test(value)
    }, 'Please enter a valid email address or 10-digit mobile number'),
  
  password: z.string().min(1, 'Password is required'),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type LoginForm = z.infer<typeof loginSchema>
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null)
  
  const { signIn } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors },
    reset: resetForgotForm
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Check if account is locked
  React.useEffect(() => {
    const checkLockout = () => {
      if (lockoutTime && new Date() < lockoutTime) {
        setIsLocked(true)
      } else {
        setIsLocked(false)
        setLockoutTime(null)
        setLoginAttempts(0)
      }
    }

    const interval = setInterval(checkLockout, 1000)
    return () => clearInterval(interval)
  }, [lockoutTime])

  const handleLoginAttempt = () => {
    const newAttempts = loginAttempts + 1
    setLoginAttempts(newAttempts)
    
    if (newAttempts >= 5) {
      const lockTime = new Date()
      lockTime.setMinutes(lockTime.getMinutes() + 15)
      setLockoutTime(lockTime)
      setIsLocked(true)
      
      toast({
        title: "Account Temporarily Locked",
        description: "Too many failed login attempts. Please try again in 15 minutes.",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: LoginForm) => {
    if (isLocked) {
      toast({
        title: "Account Locked",
        description: "Please wait for the lockout period to expire.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Determine if input is email or mobile
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailOrMobile)
      let email = data.emailOrMobile
      
      // If it's a mobile number, we need to find the associated email
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('phone', data.emailOrMobile)
          .single()
        
        if (userError || !userData) {
          handleLoginAttempt()
          toast({
            title: "Login Failed",
            description: "No account found with this mobile number",
            variant: "destructive",
          })
          return
        }
        
        email = userData.email
      }

      // Attempt sign in
      const result = await signIn(email, data.password)
      
      if (!result.success) {
        handleLoginAttempt()
        
        // Handle specific error cases
        if (result.error?.includes('Email not confirmed')) {
          toast({
            title: "Email Not Verified",
            description: "Please check your email and click the verification link before signing in.",
            variant: "destructive",
          })
        } else if (result.error?.includes('Invalid login credentials')) {
          toast({
            title: "Invalid Credentials",
            description: `Incorrect email/mobile or password. ${5 - loginAttempts - 1} attempts remaining.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Login Failed",
            description: result.error || "An unexpected error occurred",
            variant: "destructive",
          })
        }
        return
      }

      // Reset login attempts on successful login
      setLoginAttempts(0)
      setLockoutTime(null)
      setIsLocked(false)

      // Check if MFA is required
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Get user metadata to check hospital_id
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('hospital_id, full_name, last_login')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          toast({
            title: "Profile Error",
            description: "Failed to load user profile",
            variant: "destructive",
          })
          return
        }

        if (!userProfile.hospital_id) {
          toast({
            title: "Setup Required",
            description: "Your account needs to be associated with a hospital. Please contact support.",
            variant: "destructive",
          })
          return
        }

        // Show last login info
        if (userProfile.last_login) {
          toast({
            title: "Welcome back!",
            description: `Last login: ${new Date(userProfile.last_login).toLocaleString()}`,
            variant: "default",
          })
        }

        // Check if MFA is enabled and enforce it
        const { data: mfaData } = await supabase.auth.mfa.listFactors()
        
        if (mfaData?.totp?.length === 0) {
          // No MFA factors set up - redirect to MFA setup
          toast({
            title: "MFA Setup Required",
            description: "Multi-factor authentication is required for security. Please set up MFA.",
            variant: "default",
          })
          // For now, we'll redirect to dashboard but in production you'd redirect to MFA setup
          navigate('/dashboard')
        } else {
          // MFA is set up, proceed to dashboard
          navigate('/dashboard')
        }
      }
    } catch (error: any) {
      handleLoginAttempt()
      console.error('Login error:', error)
      
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onForgotPassword = async (data: ForgotPasswordForm) => {
    setIsForgotPasswordLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      setForgotPasswordSuccess(true)
      resetForgotForm()
      
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions.",
        variant: "default",
      })
      
      setTimeout(() => {
        setIsForgotPasswordOpen(false)
        setForgotPasswordSuccess(false)
      }, 3000)
      
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      })
    } finally {
      setIsForgotPasswordLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    // This would be for testing purposes
    const demoEmail = "demo@hospital.com"
    const demoPassword = "Demo@123"
    
    // You would need to use setValue from react-hook-form
    // For now, just show a toast
    toast({
      title: "Demo Credentials",
      description: `Email: ${demoEmail}, Password: ${demoPassword}`,
      variant: "default",
    })
  }

  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return ''
    
    const now = new Date()
    const remaining = Math.ceil((lockoutTime.getTime() - now.getTime()) / 1000 / 60)
    return `${remaining} minute${remaining !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-50 to-medical-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-medical-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Aarogya Sahayak HMS
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Hospital Management System NextGen
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Login Attempts Warning */}
          {loginAttempts > 0 && !isLocked && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  {loginAttempts} failed attempt{loginAttempts !== 1 ? 's' : ''}. 
                  {5 - loginAttempts} remaining before lockout.
                </span>
              </div>
            </div>
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  Account locked. Try again in {getRemainingLockoutTime()}.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrMobile">Email or Mobile Number</Label>
              <Input
                id="emailOrMobile"
                placeholder="Enter email or 10-digit mobile"
                {...register('emailOrMobile')}
                className="h-11"
                disabled={isLocked}
              />
              {errors.emailOrMobile && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.emailOrMobile.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register('password')}
                  className="h-11 pr-10"
                  disabled={isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLocked}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-medical-600 hover:text-medical-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5" />
                      <span>Reset Password</span>
                    </DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {forgotPasswordSuccess ? (
                    <div className="text-center py-4">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Password reset email sent successfully!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitForgot(onForgotPassword)} className="space-y-4">
                      <div>
                        <Label htmlFor="resetEmail">Email Address</Label>
                        <Input
                          id="resetEmail"
                          type="email"
                          placeholder="Enter your email"
                          {...registerForgot('email')}
                          className="h-11"
                        />
                        {forgotErrors.email && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            {forgotErrors.email.message}
                          </p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-11" 
                        disabled={isForgotPasswordLoading}
                      >
                        {isForgotPasswordLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Reset Email'
                        )}
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-medical-600 hover:bg-medical-700" 
              disabled={isLoading || isLocked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Demo Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={fillDemoCredentials}
              disabled={isLocked}
            >
              Fill Demo Credentials
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New to Aarogya Sahayak?
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => navigate('/register')}
            >
              Register Your Hospital
            </Button>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Secure multi-tenant hospital management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}