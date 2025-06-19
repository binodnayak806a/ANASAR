import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  FileText, 
  Lock, 
  Key, 
  UserCheck, 
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  FileOutput,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ComplianceSettings() {
  const [activeTab, setActiveTab] = useState('dpdp')
  const [loading, setLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [patientId, setPatientId] = useState('')
  
  const { toast } = useToast()
  const { hospitalId, user } = useAuth()

  // Load audit logs
  const loadAuditLogs = async (limit = 10) => {
    if (!hospitalId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      setAuditLogs(data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load audit logs: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Search audit logs
  const searchAuditLogs = async () => {
    if (!hospitalId || !searchQuery) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .or(`resource_id.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%,resource_type.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      setAuditLogs(data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to search audit logs: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate DSAR report
  const generateDSAR = async () => {
    if (!hospitalId || !patientId) {
      toast({
        title: 'Error',
        description: 'Please enter a valid patient ID',
        variant: 'destructive'
      })
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('handle_dsar', {
        p_patient_id: patientId
      })
      
      if (error) throw error
      
      // In a real implementation, this would generate a downloadable report
      toast({
        title: 'DSAR Generated',
        description: 'Data Subject Access Report has been generated successfully',
        variant: 'default'
      })
      
      // Log the DSAR generation
      await supabase.from('audit_logs').insert({
        hospital_id: hospitalId,
        user_id: user?.id,
        action: 'DSAR_GENERATED',
        resource_type: 'patients',
        resource_id: patientId,
        ip_address: 'client',
        user_agent: navigator.userAgent,
        purpose: 'DPDP compliance - data subject access request'
      })
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to generate DSAR: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle data erasure request
  const handleErasureRequest = async () => {
    if (!hospitalId || !patientId) {
      toast({
        title: 'Error',
        description: 'Please enter a valid patient ID',
        variant: 'destructive'
      })
      return
    }
    
    if (!confirm('Are you sure you want to anonymize this patient\'s data? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('handle_data_erasure', {
        p_patient_id: patientId
      })
      
      if (error) throw error
      
      toast({
        title: 'Data Anonymized',
        description: 'Patient data has been anonymized successfully',
        variant: 'default'
      })
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to anonymize data: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>Compliance Settings</span>
        </CardTitle>
        <CardDescription>
          Manage DPDP, ABDM compliance and audit logs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dpdp">DPDP Compliance</TabsTrigger>
            <TabsTrigger value="abdm">ABDM Integration</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dpdp" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Digital Personal Data Protection (DPDP) Settings</h3>
              <p className="text-sm text-gray-500">
                Configure settings to ensure compliance with DPDP Act, 2023
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="data-minimization">Data Minimization</Label>
                  </div>
                  <Switch id="data-minimization" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <Label htmlFor="retention-policy">Data Retention Policy</Label>
                  </div>
                  <Switch id="retention-policy" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-orange-500" />
                    <Label htmlFor="consent-management">Consent Management</Label>
                  </div>
                  <Switch id="consent-management" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Subject Rights</h3>
                <p className="text-sm text-gray-500">
                  Tools to handle data subject access requests and right to erasure
                </p>
                
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="patient-id">Patient ID</Label>
                    <div className="flex space-x-2">
                      <Input 
                        id="patient-id" 
                        placeholder="Enter patient ID" 
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={generateDSAR}
                      disabled={loading || !patientId}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileOutput className="w-4 h-4 mr-2" />
                          Generate DSAR
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleErasureRequest}
                      disabled={loading || !patientId}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Anonymize Data
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Breach Notification</h3>
                <p className="text-sm text-gray-500">
                  Configure data breach notification settings
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="dpo-email">Data Protection Officer Email</Label>
                  <Input 
                    id="dpo-email" 
                    placeholder="Enter DPO email" 
                    defaultValue="dpo@hospital.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="breach-template">Breach Notification Template</Label>
                  <Textarea 
                    id="breach-template" 
                    placeholder="Enter breach notification template" 
                    defaultValue={`Dear {{recipient_name}},

We regret to inform you that a data breach occurred on {{breach_date}} that may have affected your personal information.

The following types of data may have been affected:
{{affected_data_types}}

We have taken the following steps to address this issue:
{{remediation_steps}}

If you have any questions or concerns, please contact our Data Protection Officer at {{dpo_contact}}.

Sincerely,
{{hospital_name}}`}
                    rows={8}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="abdm" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ABDM Integration Settings</h3>
              <p className="text-sm text-gray-500">
                Configure Ayushman Bharat Digital Mission integration settings
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="abdm-enabled">ABDM Integration Enabled</Label>
                  </div>
                  <Switch id="abdm-enabled" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    <Label htmlFor="consent-required">Require Explicit Consent</Label>
                  </div>
                  <Switch id="consent-required" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-orange-500" />
                    <Label htmlFor="data-encryption">End-to-End Encryption</Label>
                  </div>
                  <Switch id="data-encryption" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">ABDM API Configuration</h3>
                <p className="text-sm text-gray-500">
                  Configure ABDM API credentials and endpoints
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="abdm-client-id">ABDM Client ID</Label>
                    <Input 
                      id="abdm-client-id" 
                      placeholder="Enter ABDM Client ID" 
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abdm-client-secret">ABDM Client Secret</Label>
                    <Input 
                      id="abdm-client-secret" 
                      placeholder="Enter ABDM Client Secret" 
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abdm-api-endpoint">ABDM API Endpoint</Label>
                    <Input 
                      id="abdm-api-endpoint" 
                      placeholder="Enter ABDM API Endpoint" 
                      defaultValue="https://dev.abdm.gov.in/gateway"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abdm-callback-url">Callback URL</Label>
                    <Input 
                      id="abdm-callback-url" 
                      placeholder="Enter Callback URL" 
                      defaultValue={`${window.location.origin}/api/abdm/callback`}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    <Key className="w-4 h-4 mr-2" />
                    Save ABDM Settings
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">ABDM Consent Management</h3>
                <p className="text-sm text-gray-500">
                  Configure consent management for ABDM data sharing
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="consent-template">Consent Request Template</Label>
                  <Textarea 
                    id="consent-template" 
                    placeholder="Enter consent request template" 
                    defaultValue={`I, {{patient_name}}, hereby grant consent to {{hospital_name}} to access my health records through the Ayushman Bharat Digital Mission (ABDM) for the purpose of {{purpose}}.

This consent is valid from {{valid_from}} to {{valid_until}}.

I understand that I can revoke this consent at any time through the ABDM portal or by contacting the hospital directly.`}
                    rows={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default-consent-duration">Default Consent Duration (days)</Label>
                  <Input 
                    id="default-consent-duration" 
                    type="number"
                    defaultValue="30"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="audit" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Audit Logs</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadAuditLogs(20)}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                View and search audit logs for compliance and security monitoring
              </p>
              
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search audit logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={searchAuditLogs}
                  disabled={loading || !searchQuery}
                >
                  Search
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.user_id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                              log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.resource_type}/{log.resource_id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.data_category || 'general'}
                            {log.is_sensitive && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Sensitive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  Showing {auditLogs.length} of {auditLogs.length} logs
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button variant="outline" size="sm" disabled>Next</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Textarea component for message templates
function Textarea({ id, placeholder, defaultValue, rows = 4 }: { 
  id: string; 
  placeholder: string; 
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      placeholder={placeholder}
      defaultValue={defaultValue}
      rows={rows}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}