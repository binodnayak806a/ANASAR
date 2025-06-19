import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'

// Auth components
import LoginPage from '@/components/auth/LoginPage'
import HospitalRegisterPage from '@/components/auth/HospitalRegisterPage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Layout components
import DashboardLayout from '@/components/layout/DashboardLayout'
import OfflineStatusBar from '@/components/layout/OfflineStatusBar'

// Page components
import DashboardPage from '@/pages/DashboardPage'
import PatientsPage from '@/pages/PatientsPage'
import AppointmentsPage from '@/pages/AppointmentsPage'
import DoctorsPage from '@/pages/DoctorsPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import BillingPage from '@/pages/BillingPage'
import InventoryPage from '@/pages/InventoryPage'
import ReportsPage from '@/pages/ReportsPage'
import SettingsPage from '@/pages/SettingsPage'
import OfflinePage from '@/pages/settings/OfflinePage'
import CompliancePage from '@/pages/settings/CompliancePage'
import AuditLogsPage from '@/pages/settings/AuditLogsPage'

// OPD Pages
import RegisterPatientPage from '@/pages/opd/RegisterPatientPage'

// IPD Pages
import IPDAdmissionPage from '@/pages/ipd/IPDAdmissionPage'
import BedBoardPage from '@/pages/ipd/BedBoardPage'

// Consultation Pages
import ConsultationPage from '@/pages/consultation/ConsultationPage'

// Billing Pages
import OPDBillingPage from '@/pages/billing/OPDBillingPage'
import IPDBillingPage from '@/pages/billing/IPDBillingPage'

// Initialize offline services
import { syncService } from '@/lib/offline/syncService'
import { offlineCache } from '@/lib/offline/offlineCache'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function AppContent() {
  const { loading, isAuthenticated, hospitalId } = useAuth()

  // Initialize offline services
  useEffect(() => {
    if (isAuthenticated && hospitalId) {
      // Initialize sync service
      syncService.initialize().catch(console.error)
      
      // Cache essential data for offline use
      offlineCache.cacheEssentialData(hospitalId).catch(console.error)
    }
  }, [isAuthenticated, hospitalId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Aarogya Sahayak HMS...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard\" replace /> : <LoginPage />
          } 
        />
        
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard\" replace /> : <HospitalRegisterPage />
          } 
        />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard\" replace />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            
            {/* OPD Routes */}
            <Route path="/opd/register" element={<RegisterPatientPage />} />
            
            {/* IPD Routes */}
            <Route path="/ipd/admission" element={<IPDAdmissionPage />} />
            <Route path="/ipd/bed-board" element={<BedBoardPage />} />
            
            {/* Consultation Routes */}
            <Route path="/consultation/:appointmentId" element={<ConsultationPage />} />
            
            {/* Billing Routes */}
            <Route path="/billing/opd" element={<OPDBillingPage />} />
            <Route path="/billing/ipd/:ipdId" element={<IPDBillingPage />} />
            
            {/* Admin-only routes */}
            <Route path="/doctors" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <DoctorsPage />
              </ProtectedRoute>
            } />
            <Route path="/departments" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <DepartmentsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            
            {/* Settings sub-pages */}
            <Route path="/settings/offline" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <OfflinePage />
              </ProtectedRoute>
            } />
            <Route path="/settings/compliance" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <CompliancePage />
              </ProtectedRoute>
            } />
            <Route path="/settings/audit-logs" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin']}>
                <AuditLogsPage />
              </ProtectedRoute>
            } />
            
            {/* Role-based routes */}
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/inventory" element={
              <ProtectedRoute requiredRole={['admin', 'hospital_admin', 'pharmacist']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard\" replace />} />
      </Routes>
      
      {/* Offline Status Bar */}
      <OfflineStatusBar />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <AppContent />
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App