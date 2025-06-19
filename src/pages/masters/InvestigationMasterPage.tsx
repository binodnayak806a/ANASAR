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
  TestTube, 
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
  ChevronRight,
  Clock,
  DollarSign
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { createTenantQuery } from '@/services/supabaseClient'

// Types
interface Investigation {
  id: string
  test_code: string
  test_name: string
  category: string
  department?: string
  sample_type?: string
  normal_range?: string
  unit?: string
  method?: string
  cost: number
  duration_hours: number
  preparation_instructions?: string
  is_active: boolean
  created_at: string
}

// Validation schema
const investigationSchema = z.object({
  test_code: z.string().min(2, 'Test code must be at least 2 characters'),
  test_name: z.string().min(2, 'Test name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  department: z.string().optional(),
  sample_type: z.string().optional(),
  normal_range: z.string().optional(),
  unit: z.string().optional(),
  method: z.string().optional(),
  cost: z.number().min(0, 'Cost must be positive'),
  duration_hours: z.number().min(1, 'Duration must be at least 1 hour'),
  preparation_instructions: z.string().optional()
})

type InvestigationForm = z.infer<typeof investigationSchema>

const categories = [
  'Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 
  'Radiology', 'Cardiology', 'Endocrinology', 'Immunology',
  'Molecular Biology', 'Cytology', 'Other'
]

const departments = [
  'Laboratory', 'Radiology', 'Cardiology', 'Pathology',
  'Nuclear Medicine', 'Ultrasound', 'CT Scan', 'MRI'
]

const sampleTypes = [
  'Blood', 'Urine', 'Stool', 'Sputum', 'CSF', 'Tissue',
  'Swab', 'Fluid', 'Biopsy', 'Other'
]

export default function InvestigationMasterPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvestigation, setEditingInvestigation] = useState<Investigation | null>(null)
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
  } = useForm<InvestigationForm>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      cost: 0,
      duration_hours: 24
    }
  })

  // Load investigations
  useEffect(() => {
    if (hospitalId) {
      loadInvestigations()
    }
  }, [hospitalId])

  const loadInvestigations = async () => {
    setLoading(true)
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('investigation_master')
        .order('test_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setInvestigations(data || [])
    } catch (error: any) {
      console.error('Error loading investigations:', error)
      toast({
        title: "Error",
        description: "Failed to load investigations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter investigations
  const getFilteredInvestigations = () => {
    return investigations.filter(investigation => {
      const searchMatch = !searchQuery || 
        investigation.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investigation.test_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investigation.category.toLowerCase().includes(searchQuery.toLowerCase())
      
      const categoryMatch = selectedCategory === 'all' || investigation.category === selectedCategory
      const departmentMatch = selectedDepartment === 'all' || investigation.department === selectedDepartment
      
      return searchMatch && categoryMatch && departmentMatch
    })
  }

  // Pagination
  const getPaginatedInvestigations = () => {
    const filtered = getFilteredInvestigations()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    }
  }

  // Submit form
  const onSubmit = async (data: InvestigationForm) => {
    if (!hospitalId || !user) return

    try {
      const query = createTenantQuery(hospitalId)
      
      const investigationData = {
        ...data,
        created_by: user.id,
        is_active: true
      }

      if (editingInvestigation) {
        // Update existing investigation
        const { error } = await query.update('investigation_master', investigationData)
          .eq('id', editingInvestigation.id)

        if (error) throw new Error(error.message)

        toast({
          title: "Investigation Updated",
          description: `${data.test_name} has been updated successfully`,
          variant: "default",
        })
      } else {
        // Create new investigation
        const { error } = await query.insert('investigation_master', investigationData)

        if (error) throw new Error(error.message)

        toast({
          title: "Investigation Added",
          description: `${data.test_name} has been added successfully`,
          variant: "default",
        })
      }

      setIsDialogOpen(false)
      setEditingInvestigation(null)
      reset()
      await loadInvestigations()

    } catch (error: any) {
      console.error('Error saving investigation:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save investigation",
        variant: "destructive",
      })
    }
  }

  // Edit investigation
  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation)
    setValue('test_code', investigation.test_code)
    setValue('test_name', investigation.test_name)
    setValue('category', investigation.category)
    setValue('department', investigation.department || '')
    setValue('sample_type', investigation.sample_type || '')
    setValue('normal_range', investigation.normal_range || '')
    setValue('unit', investigation.unit || '')
    setValue('method', investigation.method || '')
    setValue('cost', investigation.cost)
    setValue('duration_hours', investigation.duration_hours)
    setValue('preparation_instructions', investigation.preparation_instructions || '')
    setIsDialogOpen(true)
  }

  // Delete investigation
  const handleDelete = async (investigation: Investigation) => {
    if (!confirm(`Are you sure you want to delete ${investigation.test_name}?`)) return

    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('investigation_master', { is_active: false })
        .eq('id', investigation.id)

      if (error) throw new Error(error.message)

      toast({
        title: "Investigation Deleted",
        description: `${investigation.test_name} has been deleted`,
        variant: "default",
      })

      await loadInvestigations()
    } catch (error: any) {
      console.error('Error deleting investigation:', error)
      toast({
        title: "Error",
        description: "Failed to delete investigation",
        variant: "destructive",
      })
    }
  }

  // Reset form and close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingInvestigation(null)
    reset()
  }

  const { data: paginatedData, total, totalPages } = getPaginatedInvestigations()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investigation Master
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage laboratory tests and diagnostic procedures
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Tests
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingInvestigation(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Investigation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingInvestigation ? 'Edit Investigation' : 'Add New Investigation'}
                </DialogTitle>
                <DialogDescription>
                  {editingInvestigation ? 'Update investigation information' : 'Add a new investigation to the database'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test_code">Test Code *</Label>
                    <Input
                      id="test_code"
                      {...register('test_code')}
                      placeholder="e.g., CBC, LFT, RFT"
                    />
                    {errors.test_code && (
                      <p className="text-sm text-red-600 mt-1">{errors.test_code.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="test_name">Test Name *</Label>
                    <Input
                      id="test_name"
                      {...register('test_name')}
                      placeholder="Enter test name"
                    />
                    {errors.test_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.test_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
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
                    {errors.category && (
                      <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select onValueChange={(value) => setValue('department', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sample_type">Sample Type</Label>
                    <Select onValueChange={(value) => setValue('sample_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sample type" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="method">Method</Label>
                    <Input
                      id="method"
                      {...register('method')}
                      placeholder="e.g., ELISA, PCR, Microscopy"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cost">Cost (₹) *</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      {...register('cost', { valueAsNumber: true })}
                      placeholder="Enter cost"
                    />
                    {errors.cost && (
                      <p className="text-sm text-red-600 mt-1">{errors.cost.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="duration_hours">Duration (Hours) *</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      {...register('duration_hours', { valueAsNumber: true })}
                      placeholder="Enter duration in hours"
                    />
                    {errors.duration_hours && (
                      <p className="text-sm text-red-600 mt-1">{errors.duration_hours.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      {...register('unit')}
                      placeholder="e.g., mg/dL, cells/μL"
                    />
                  </div>

                  <div>
                    <Label htmlFor="normal_range">Normal Range</Label>
                    <Input
                      id="normal_range"
                      {...register('normal_range')}
                      placeholder="e.g., 70-100 mg/dL"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="preparation_instructions">Preparation Instructions</Label>
                  <Textarea
                    id="preparation_instructions"
                    {...register('preparation_instructions')}
                    placeholder="Enter preparation instructions for the patient"
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
                      editingInvestigation ? 'Update Investigation' : 'Add Investigation'
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
                  placeholder="Search investigations..."
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
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedDepartment('all')
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investigations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="w-5 h-5" />
            <span>Investigations ({total})</span>
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
                    <TableHead>Test Code</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((investigation) => (
                    <TableRow key={investigation.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{investigation.test_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {investigation.test_name}
                        {investigation.normal_range && (
                          <div className="text-sm text-gray-500">
                            Normal: {investigation.normal_range}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{investigation.category}</TableCell>
                      <TableCell>{investigation.sample_type || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>₹{investigation.cost}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{investigation.duration_hours}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={investigation.is_active ? 'default' : 'secondary'}>
                          {investigation.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(investigation)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(investigation)}
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