import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Stethoscope, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Download,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { createTenantQuery } from '@/services/supabaseClient'

// Types
interface Diagnosis {
  id: string
  icd_code?: string
  diagnosis_name: string
  category?: string
  description?: string
  common_symptoms: string[]
  common_treatments: string[]
  severity_level?: string
  is_active: boolean
  created_at: string
}

// Validation schema
const diagnosisSchema = z.object({
  icd_code: z.string().optional(),
  diagnosis_name: z.string().min(2, 'Diagnosis name must be at least 2 characters'),
  category: z.string().optional(),
  description: z.string().optional(),
  common_symptoms: z.array(z.string()).default([]),
  common_treatments: z.array(z.string()).default([]),
  severity_level: z.enum(['mild', 'moderate', 'severe', 'critical']).optional()
})

type DiagnosisForm = z.infer<typeof diagnosisSchema>

const categories = [
  'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Neurological', 
  'Endocrine', 'Infectious', 'Musculoskeletal', 'Dermatological', 
  'Psychiatric', 'Oncological', 'Other'
]

const severityLevels = ['mild', 'moderate', 'severe', 'critical']

export default function DiagnosisMasterPage() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDiagnosis, setEditingDiagnosis] = useState<Diagnosis | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const { toast } = useToast()
  const { hospitalId, user } = useAuth()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<DiagnosisForm>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      common_symptoms: [],
      common_treatments: []
    }
  })

  // Load diagnoses
  useEffect(() => {
    if (hospitalId) {
      loadDiagnoses()
    }
  }, [hospitalId])

  const loadDiagnoses = async () => {
    setLoading(true)
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('diagnosis_master')
        .order('diagnosis_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setDiagnoses(data || [])
    } catch (error: any) {
      console.error('Error loading diagnoses:', error)
      toast({
        title: "Error",
        description: "Failed to load diagnoses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter diagnoses
  const getFilteredDiagnoses = () => {
    return diagnoses.filter(diagnosis => {
      const searchMatch = !searchQuery || 
        diagnosis.diagnosis_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        diagnosis.icd_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        diagnosis.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const categoryMatch = selectedCategory === 'all' || diagnosis.category === selectedCategory
      const severityMatch = selectedSeverity === 'all' || diagnosis.severity_level === selectedSeverity
      
      return searchMatch && categoryMatch && severityMatch
    })
  }

  // Pagination
  const getPaginatedDiagnoses = () => {
    const filtered = getFilteredDiagnoses()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    }
  }

  // Submit form
  const onSubmit = async (data: DiagnosisForm) => {
    if (!hospitalId || !user) return

    try {
      const query = createTenantQuery(hospitalId)
      
      const diagnosisData = {
        ...data,
        created_by: user.id,
        is_active: true
      }

      if (editingDiagnosis) {
        // Update existing diagnosis
        const { error } = await query.update('diagnosis_master', diagnosisData)
          .eq('id', editingDiagnosis.id)

        if (error) throw new Error(error.message)

        toast({
          title: "Diagnosis Updated",
          description: `${data.diagnosis_name} has been updated successfully`,
          variant: "default",
        })
      } else {
        // Create new diagnosis
        const { error } = await query.insert('diagnosis_master', diagnosisData)

        if (error) throw new Error(error.message)

        toast({
          title: "Diagnosis Added",
          description: `${data.diagnosis_name} has been added successfully`,
          variant: "default",
        })
      }

      setIsDialogOpen(false)
      setEditingDiagnosis(null)
      reset()
      await loadDiagnoses()

    } catch (error: any) {
      console.error('Error saving diagnosis:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save diagnosis",
        variant: "destructive",
      })
    }
  }

  // Edit diagnosis
  const handleEdit = (diagnosis: Diagnosis) => {
    setEditingDiagnosis(diagnosis)
    setValue('icd_code', diagnosis.icd_code || '')
    setValue('diagnosis_name', diagnosis.diagnosis_name)
    setValue('category', diagnosis.category || '')
    setValue('description', diagnosis.description || '')
    setValue('common_symptoms', diagnosis.common_symptoms || [])
    setValue('common_treatments', diagnosis.common_treatments || [])
    setValue('severity_level', diagnosis.severity_level as any)
    setIsDialogOpen(true)
  }

  // Delete diagnosis
  const handleDelete = async (diagnosis: Diagnosis) => {
    if (!confirm(`Are you sure you want to delete ${diagnosis.diagnosis_name}?`)) return

    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('diagnosis_master', { is_active: false })
        .eq('id', diagnosis.id)

      if (error) throw new Error(error.message)

      toast({
        title: "Diagnosis Deleted",
        description: `${diagnosis.diagnosis_name} has been deleted`,
        variant: "default",
      })

      await loadDiagnoses()
    } catch (error: any) {
      console.error('Error deleting diagnosis:', error)
      toast({
        title: "Error",
        description: "Failed to delete diagnosis",
        variant: "destructive",
      })
    }
  }

  // Reset form and close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingDiagnosis(null)
    reset()
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'severe': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const { data: paginatedData, total, totalPages } = getPaginatedDiagnoses()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Diagnosis Master
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage diagnosis database with ICD codes and clinical information
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import ICD
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingDiagnosis(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Diagnosis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDiagnosis ? 'Edit Diagnosis' : 'Add New Diagnosis'}
                </DialogTitle>
                <DialogDescription>
                  {editingDiagnosis ? 'Update diagnosis information' : 'Add a new diagnosis to the database'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diagnosis_name">Diagnosis Name *</Label>
                    <Input
                      id="diagnosis_name"
                      {...register('diagnosis_name')}
                      placeholder="Enter diagnosis name"
                    />
                    {errors.diagnosis_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.diagnosis_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="icd_code">ICD Code</Label>
                    <Input
                      id="icd_code"
                      {...register('icd_code')}
                      placeholder="e.g., I10, E11.9"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={(value) => setValue('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="severity_level">Severity Level</Label>
                    <Select onValueChange={(value) => setValue('severity_level', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {severityLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Enter diagnosis description"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingDiagnosis ? 'Update Diagnosis' : 'Add Diagnosis'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search diagnoses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {severityLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedSeverity('all')
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnoses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5" />
            <span>Diagnoses ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Diagnosis Name</TableHead>
                    <TableHead>ICD Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((diagnosis) => (
                    <TableRow key={diagnosis.id}>
                      <TableCell className="font-medium">
                        {diagnosis.diagnosis_name}
                      </TableCell>
                      <TableCell>
                        {diagnosis.icd_code ? (
                          <Badge variant="outline">{diagnosis.icd_code}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{diagnosis.category || '-'}</TableCell>
                      <TableCell>
                        {diagnosis.severity_level ? (
                          <Badge className={getSeverityColor(diagnosis.severity_level)}>
                            {diagnosis.severity_level}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {diagnosis.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={diagnosis.is_active ? 'default' : 'secondary'}>
                          {diagnosis.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(diagnosis)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(diagnosis)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} entries
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}