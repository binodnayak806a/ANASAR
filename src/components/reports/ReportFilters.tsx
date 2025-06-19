import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Filter, Download, FileText } from 'lucide-react'

interface ReportFiltersProps {
  filters: {
    dateFrom: string
    dateTo: string
    doctor: string
    department: string
    payerType: string
  }
  onFilterChange: (key: string, value: string) => void
  onGenerate: () => void
  onExportCSV: () => void
  onExportPDF: () => void
  loading?: boolean
  doctors?: Array<{ id: string; name: string }>
  departments?: Array<{ id: string; name: string }>
}

export default function ReportFilters({
  filters,
  onFilterChange,
  onGenerate,
  onExportCSV,
  onExportPDF,
  loading = false,
  doctors = [],
  departments = []
}: ReportFiltersProps) {
  const payerTypes = [
    { value: 'all', label: 'All Payers' },
    { value: 'self', label: 'Self Pay' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'tpa', label: 'TPA' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Report Filters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Doctor</Label>
            <Select value={filters.doctor} onValueChange={(value) => onFilterChange('doctor', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Department</Label>
            <Select value={filters.department} onValueChange={(value) => onFilterChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payer Type</Label>
            <Select value={filters.payerType} onValueChange={(value) => onFilterChange('payerType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Payers" />
              </SelectTrigger>
              <SelectContent>
                {payerTypes.map((payer) => (
                  <SelectItem key={payer.value} value={payer.value}>
                    {payer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4">
          <Button onClick={onGenerate} disabled={loading}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline" onClick={onExportCSV} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={onExportPDF} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}