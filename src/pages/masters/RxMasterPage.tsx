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
  Pill, 
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
interface RxMedicine {
  id: string
  medicine_name: string
  generic_name?: string
  brand_name?: string
  strength?: string
  dosage_form: string
  manufacturer?: string
  category?: string
  unit_price?: number
  common_dosages: string[]
  common_instructions: string[]
  contraindications?: string
  side_effects?: string
  is_active: boolean
  created_at: string
}

// Validation schema
const rxMedicineSchema = z.object({
  medicine_name: z.string().min(2, 'Medicine name must be at least 2 characters'),
  generic_name: z.string().optional(),
  brand_name: z.string().optional(),
  strength: z.string().optional(),
  dosage_form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other']),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  unit_price: z.number().min(0).optional(),
  common_dosages: z.array(z.string()).default([]),
  common_instructions: z.array(z.string()).default([]),
  contraindications: z.string().optional(),
  side_effects: z.string().optional()
})

type RxMedicineForm = z.infer<typeof rxMedicineSchema>

const dosageForms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other']
const categories = ['Antibiotic', 'Analgesic', 'Antacid', 'Vitamin', 'Cardiac', 'Diabetic', 'Respiratory', 'Other']

export default function RxMasterPage() {
  const [medicines, setMedicines] = useState<RxMedicine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<RxMedicine | null>(null)
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
  } = useForm<RxMedicineForm>({
    resolver: zodResolver(rxMedicineSchema),
    defaultValues: {
      common_dosages: [],
      common_instructions: []
    }
  })

  // Load medicines
  useEffect(() => {
    if (hospitalId) {
      loadMedicines()
    }
  }, [hospitalId])

  const loadMedicines = async () => {
    setLoading(true)
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('rx_master')
        .order('medicine_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setMedicines(data || [])
    } catch (error: any) {
      console.error('Error loading medicines:', error)
      toast({
        title: "Error",
        description: "Failed to load medicines",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter medicines
  const getFilteredMedicines = () => {
    return medicines.filter(medicine => {
      const searchMatch = !searchQuery || 
        medicine.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const categoryMatch = selectedCategory === 'all' || medicine.category === selectedCategory
      const dosageFormMatch = selectedDosageForm === 'all' || medicine.dosage_form === selectedDosageForm
      
      return searchMatch && categoryMatch && dosageFormMatch
    })
  }

  // Pagination
  const getPaginatedMedicines = () => {
    const filtered = getFilteredMedicines()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    }
  }

  // Submit form
  const onSubmit = async (data: RxMedicineForm) => {
    if (!hospitalId || !user) return

    try {
      const query = createTenantQuery(hospitalId)
      
      const medicineData = {
        ...data,
        created_by: user.id,
        is_active: true
      }

      if (editingMedicine) {
        // Update existing medicine
        const { error } = await query.update('rx_master', medicineData)
          .eq('id', editingMedicine.id)

        if (error) throw new Error(error.message)

        toast({
          title: "Medicine Updated",
          description: `${data.medicine_name} has been updated successfully`,
          variant: "default",
        })
      } else {
        // Create new medicine
        const { error } = await query.insert('rx_master', medicineData)

        if (error) throw new Error(error.message)

        toast({
          title: "Medicine Added",
          description: `${data.medicine_name} has been added successfully`,
          variant: "default",
        })
      }

      setIsDialogOpen(false)
      setEditingMedicine(null)
      reset()
      await loadMedicines()

    } catch (error: any) {
      console.error('Error saving medicine:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save medicine",
        variant: "destructive",
      })
    }
  }

  // Edit medicine
  const handleEdit = (medicine: RxMedicine) => {
    setEditingMedicine(medicine)
    setValue('medicine_name', medicine.medicine_name)
    setValue('generic_name', medicine.generic_name || '')
    setValue('brand_name', medicine.brand_name || '')
    setValue('strength', medicine.strength || '')
    setValue('dosage_form', medicine.dosage_form as any)
    setValue('manufacturer', medicine.manufacturer || '')
    setValue('category', medicine.category || '')
    setValue('unit_price', medicine.unit_price || 0)
    setValue('common_dosages', medicine.common_dosages || [])
    setValue('common_instructions', medicine.common_instructions || [])
    setValue('contraindications', medicine.contraindications || '')
    setValue('side_effects', medicine.side_effects || '')
    setIsDialogOpen(true)
  }

  // Delete medicine
  const handleDelete = async (medicine: RxMedicine) => {
    if (!confirm(`Are you sure you want to delete ${medicine.medicine_name}?`)) return

    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('rx_master', { is_active: false })
        .eq('id', medicine.id)

      if (error) throw new Error(error.message)

      toast({
        title: "Medicine Deleted",
        description: `${medicine.medicine_name} has been deleted`,
        variant: "default",
      })

      await loadMedicines()
    } catch (error: any) {
      console.error('Error deleting medicine:', error)
      toast({
        title: "Error",
        description: "Failed to delete medicine",
        variant: "destructive",
      })
    }
  }

  // Reset form and close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMedicine(null)
    reset()
  }

  const { data: paginatedData, total, totalPages } = getPaginatedMedicines()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Rx Master
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage medicine database and prescription templates
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingMedicine(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </DialogTitle>
                <DialogDescription>
                  {editingMedicine ? 'Update medicine information' : 'Add a new medicine to the database'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medicine_name">Medicine Name *</Label>
                    <Input
                      id="medicine_name"
                      {...register('medicine_name')}
                      placeholder="Enter medicine name"
                    />
                    {errors.medicine_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.medicine_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="generic_name">Generic Name</Label>
                    <Input
                      id="generic_name"
                      {...register('generic_name')}
                      placeholder="Enter generic name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="brand_name">Brand Name</Label>
                    <Input
                      id="brand_name"
                      {...register('brand_name')}
                      placeholder="Enter brand name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="strength">Strength</Label>
                    <Input
                      id="strength"
                      {...register('strength')}
                      placeholder="e.g., 500mg, 10ml"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dosage_form">Dosage Form *</Label>
                    <Select onValueChange={(value) => setValue('dosage_form', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dosage form" />
                      </SelectTrigger>
                      <SelectContent>
                        {dosageForms.map((form) => (
                          <SelectItem key={form} value={form}>
                            {form.charAt(0).toUpperCase() + form.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dosage_form && (
                      <p className="text-sm text-red-600 mt-1">{errors.dosage_form.message}</p>
                    )}
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
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      {...register('manufacturer')}
                      placeholder="Enter manufacturer"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit_price">Unit Price (₹)</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      {...register('unit_price', { valueAsNumber: true })}
                      placeholder="Enter unit price"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contraindications">Contraindications</Label>
                  <Textarea
                    id="contraindications"
                    {...register('contraindications')}
                    placeholder="Enter contraindications"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="side_effects">Side Effects</Label>
                  <Textarea
                    id="side_effects"
                    {...register('side_effects')}
                    placeholder="Enter side effects"
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
                      editingMedicine ? 'Update Medicine' : 'Add Medicine'
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
                  placeholder="Search medicines..."
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
              <Label>Dosage Form</Label>
              <Select value={selectedDosageForm} onValueChange={setSelectedDosageForm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {dosageForms.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form.charAt(0).toUpperCase() + form.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedDosageForm('all')
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pill className="w-5 h-5" />
            <span>Medicines ({total})</span>
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
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Strength</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((medicine) => (
                    <TableRow key={medicine.id}>
                      <TableCell className="font-medium">
                        {medicine.medicine_name}
                        {medicine.brand_name && (
                          <div className="text-sm text-gray-500">
                            Brand: {medicine.brand_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{medicine.generic_name || '-'}</TableCell>
                      <TableCell>{medicine.strength || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {medicine.dosage_form}
                        </Badge>
                      </TableCell>
                      <TableCell>{medicine.category || '-'}</TableCell>
                      <TableCell>
                        {medicine.unit_price ? `₹${medicine.unit_price}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={medicine.is_active ? 'default' : 'secondary'}>
                          {medicine.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(medicine)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(medicine)}
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