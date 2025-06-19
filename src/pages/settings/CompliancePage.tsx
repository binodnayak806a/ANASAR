import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, FileText, Lock, Bell } from 'lucide-react'
import ComplianceSettings from '@/components/settings/ComplianceSettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function CompliancePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Compliance & Security
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage compliance settings, security, and audit logs
          </p>
        </div>
        
        <Button 
          variant="outline"
          onClick={() => navigate('/settings/audit-logs')}
        >
          <FileText className="w-4 h-4 mr-2" />
          View Audit Logs
        </Button>
      </div>

      <Tabs defaultValue="compliance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <ComplianceSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security settings and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Password Policy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-password-length">Minimum Password Length</Label>
                      <Input 
                        id="min-password-length" 
                        type="number" 
                        defaultValue="8"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                      <Input 
                        id="password-expiry" 
                        type="number" 
                        defaultValue="90"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-uppercase">Require Uppercase</Label>
                      <Switch id="require-uppercase" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-number">Require Number</Label>
                      <Switch id="require-number" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-special">Require Special Character</Label>
                      <Switch id="require-special" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prevent-reuse">Prevent Password Reuse</Label>
                      <Switch id="prevent-reuse" defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Session Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input 
                        id="session-timeout" 
                        type="number" 
                        defaultValue="30"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max-sessions">Maximum Concurrent Sessions</Label>
                      <Input 
                        id="max-sessions" 
                        type="number" 
                        defaultValue="1"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enforce-mfa">Enforce Multi-Factor Authentication</Label>
                      <Switch id="enforce-mfa" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ip-restriction">IP Address Restriction</Label>
                      <Switch id="ip-restriction" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    Save Security Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Label component
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
    </label>
  )
}