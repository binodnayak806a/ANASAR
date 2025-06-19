import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  MessageSquare, 
  Mail, 
  Phone, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationSettings() {
  const [activeTab, setActiveTab] = useState('channels')
  const { loading, sendTestNotification } = useNotifications()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>Notification Settings</span>
        </CardTitle>
        <CardDescription>
          Configure how and when notifications are sent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="channels">Notification Channels</TabsTrigger>
            <TabsTrigger value="templates">Message Templates</TabsTrigger>
            <TabsTrigger value="testing">Testing & Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Channels</h3>
              <p className="text-sm text-gray-500">
                Configure which notification channels are enabled for different types of notifications
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="whatsapp-enabled">WhatsApp Notifications</Label>
                  </div>
                  <Switch id="whatsapp-enabled" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-green-500" />
                    <Label htmlFor="email-enabled">Email Notifications</Label>
                  </div>
                  <Switch id="email-enabled" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-orange-500" />
                    <Label htmlFor="sms-enabled">SMS Notifications</Label>
                  </div>
                  <Switch id="sms-enabled" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Twilio Configuration</h3>
                <p className="text-sm text-gray-500">
                  Configure your Twilio credentials for WhatsApp and SMS notifications
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twilio-account-sid">Twilio Account SID</Label>
                    <Input 
                      id="twilio-account-sid" 
                      placeholder="Enter Twilio Account SID" 
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twilio-auth-token">Twilio Auth Token</Label>
                    <Input 
                      id="twilio-auth-token" 
                      placeholder="Enter Twilio Auth Token" 
                      type="password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twilio-phone-number">Twilio Phone Number</Label>
                    <Input 
                      id="twilio-phone-number" 
                      placeholder="Enter Twilio Phone Number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twilio-whatsapp-number">Twilio WhatsApp Number</Label>
                    <Input 
                      id="twilio-whatsapp-number" 
                      placeholder="Enter Twilio WhatsApp Number" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Twilio Settings
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="templates" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Message Templates</h3>
              <p className="text-sm text-gray-500">
                Customize notification message templates for different events
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment-created-template">Appointment Created</Label>
                  <Textarea 
                    id="appointment-created-template" 
                    placeholder="Enter template for appointment creation notifications" 
                    defaultValue={`Dear {{patient_name}},

Your appointment with Dr. {{doctor_name}} is scheduled for {{appointment_date}} at {{appointment_time}}.

Reason: {{appointment_reason}}

Please arrive 15 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.

Thank you for choosing Aarogya Sahayak HMS.`}
                    rows={8}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="appointment-reminder-template">Appointment Reminder</Label>
                  <Textarea 
                    id="appointment-reminder-template" 
                    placeholder="Enter template for appointment reminder notifications" 
                    defaultValue={`Reminder: You have an appointment with Dr. {{doctor_name}} tomorrow at {{appointment_time}}.

Please arrive 15 minutes early and bring any relevant medical records.

Thank you for choosing Aarogya Sahayak HMS.`}
                    rows={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lab-results-template">Lab Results Ready</Label>
                  <Textarea 
                    id="lab-results-template" 
                    placeholder="Enter template for lab results notifications" 
                    defaultValue={`Dear {{patient_name}},

Your lab results for {{test_name}} are now ready. You can view them in your patient portal or collect the report from our laboratory.

Thank you for choosing Aarogya Sahayak HMS.`}
                    rows={6}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Save Templates
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="testing" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Notifications</h3>
              <p className="text-sm text-gray-500">
                Send test notifications to verify your configuration
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-phone-number">Test Phone Number</Label>
                  <Input 
                    id="test-phone-number" 
                    placeholder="Enter phone number for testing" 
                    defaultValue="+919876543210"
                  />
                  <p className="text-xs text-gray-500">
                    Enter a phone number with country code (e.g., +919876543210)
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={sendTestNotification}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Test WhatsApp
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Test SMS
                  </Button>
                  
                  <Button variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Test Email
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Logs</h3>
                <p className="text-sm text-gray-500">
                  View recent notification delivery status
                </p>
                
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">WhatsApp: Appointment Reminder</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Sent to: +919876543210 • 2 hours ago
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Email: Lab Results Ready</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Sent to: patient@example.com • 3 hours ago
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">SMS: Delivery Failed</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Failed to: +919876543210 • 5 hours ago
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Error: Invalid phone number format
                    </p>
                  </div>
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