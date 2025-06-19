import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Shield, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  requiredRole?: string | string[]
  requiredPermissions?: string[]
  fallbackPath?: string
  children?: React.ReactNode
}

export default function ProtectedRoute({ 
  requiredRole,
  requiredPermissions,
  fallbackPath = '/login',
  children 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hospitalId, signOut } = useAuth()
  const location = useLocation()
  const [sessionChecked, setSessionChecked] = useState(false)

  // Wait for initial session check
  useEffect(() => {
    if (!loading) {
      setSessionChecked(true)
    }
  }, [loading])

  // Show loading state while checking authentication
  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Verifying authentication...
          </p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Check if user account is active
  if (!user.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Account Deactivated</CardTitle>
            <CardDescription>
              Your account has been deactivated. Please contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={signOut} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user has a valid hospital association
  if (!hospitalId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle className="text-orange-600">Setup Required</CardTitle>
            <CardDescription>
              Your account needs to be associated with a hospital. Please contact support.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={signOut} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    if (!roles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access this page. Required role: {roles.join(' or ')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => window.history.back()} variant="outline" className="w-full">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  // Check permission-based access (if implemented)
  if (requiredPermissions && requiredPermissions.length > 0) {
    // This would require a permissions system to be implemented
    // For now, we'll just log it
    console.log('Permission check required:', requiredPermissions)
  }

  // Render children or outlet
  return children ? <>{children}</> : <Outlet />
}

// Higher-order component for role-based protection
export function withRoleProtection(
  Component: React.ComponentType<any>,
  requiredRole: string | string[]
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for checking permissions within components
export function usePermissions() {
  const { user } = useAuth()
  
  const hasRole = (role: string | string[]) => {
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  }
  
  const isAdmin = () => hasRole(['admin', 'hospital_admin'])
  const isDoctor = () => hasRole('doctor')
  const isNurse = () => hasRole('nurse')
  const isReceptionist = () => hasRole('receptionist')
  
  return {
    user,
    hasRole,
    isAdmin,
    isDoctor,
    isNurse,
    isReceptionist
  }
}