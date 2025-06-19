import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bed, 
  Building, 
  Users, 
  Filter, 
  Search, 
  RefreshCw,
  Eye,
  Edit,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreHorizontal
} from 'lucide-react'
import { useToast } from '@/lib/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// Types
interface IPDRecord {
  id: string
  admission_number: string
  patient_id: string
  admission_date: string
  attending_doctor_id: string
  room_number: string
  bed_number: string
  status: string
  patients?: {
    personal_info: any
    contact_info: any
  }
  doctors?: {
    users: {
      full_name: string
    }
  }
}

interface BedOccupancy {
  bed_id: string
  bed_number: string
  room_number: string
  ward_name: string
  floor: string
  status: 'vacant' | 'occupied-male' | 'occupied-female' | 'maintenance'
  patient_name?: string
  admission_date?: string
  doctor_name?: string
  bed_type: string
  ipd_record?: IPDRecord
}

// Mock data for bed board
const mockBedOccupancy: BedOccupancy[] = [
  {
    bed_id: '1',
    bed_number: 'GA-101-A',
    room_number: 'GA-101',
    ward_name: 'General Ward A',
    floor: 'Ground Floor',
    status: 'vacant',
    bed_type: 'General'
  },
  {
    bed_id: '2',
    bed_number: 'GA-101-B',
    room_number: 'GA-101',
    ward_name: 'General Ward A',
    floor: 'Ground Floor',
    status: 'occupied-male',
    patient_name: 'Rajesh Kumar',
    admission_date: '2024-01-15',
    doctor_name: 'Dr. Sharma',
    bed_type: 'General'
  },
  {
    bed_id: '3',
    bed_number: 'GA-102-A',
    room_number: 'GA-102',
    ward_name: 'General Ward A',
    floor: 'Ground Floor',
    status: 'occupied-female',
    patient_name: 'Priya Singh',
    admission_date: '2024-01-16',
    doctor_name: 'Dr. Patel',
    bed_type: 'General'
  },
  {
    bed_id: '4',
    bed_number: 'GA-102-B',
    room_number: 'GA-102',
    ward_name: 'General Ward A',
    floor: 'Ground Floor',
    status: 'vacant',
    bed_type: 'General'
  },
  {
    bed_id: '5',
    bed_number: 'GA-103-A',
    room_number: 'GA-103',
    ward_name: 'General Ward A',
    floor: 'Ground Floor',
    status: 'vacant',
    bed_type: 'Private'
  },
  {
    bed_id: '6',
    bed_number: 'GB-201-A',
    room_number: 'GB-201',
    ward_name: 'General Ward B',
    floor: 'First Floor',
    status: 'occupied-male',
    patient_name: 'Amit Verma',
    admission_date: '2024-01-14',
    doctor_name: 'Dr. Gupta',
    bed_type: 'General'
  },
  {
    bed_id: '7',
    bed_number: 'GB-201-B',
    room_number: 'GB-201',
    ward_name: 'General Ward B',
    floor: 'First Floor',
    status: 'vacant',
    bed_type: 'General'
  },
  {
    bed_id: '8',
    bed_number: 'GB-202-A',
    room_number: 'GB-202',
    ward_name: 'General Ward B',
    floor: 'First Floor',
    status: 'vacant',
    bed_type: 'Semi-Private'
  },
  {
    bed_id: '9',
    bed_number: 'ICU-301-A',
    room_number: 'ICU-301',
    ward_name: 'ICU Ward',
    floor: 'Second Floor',
    status: 'maintenance',
    bed_type: 'ICU'
  },
  {
    bed_id: '10',
    bed_number: 'ICU-301-B',
    room_number: 'ICU-301',
    ward_name: 'ICU Ward',
    floor: 'Second Floor',
    status: 'vacant',
    bed_type: 'ICU'
  },
  {
    bed_id: '11',
    bed_number: 'ICU-302-A',
    room_number: 'ICU-302',
    ward_name: 'ICU Ward',
    floor: 'Second Floor',
    status: 'occupied-female',
    patient_name: 'Sunita Devi',
    admission_date: '2024-01-13',
    doctor_name: 'Dr. Mehta',
    bed_type: 'ICU'
  },
  {
    bed_id: '12',
    bed_number: 'PED-201-A',
    room_number: 'PED-201',
    ward_name: 'Pediatric Ward',
    floor: 'First Floor',
    status: 'vacant',
    bed_type: 'Pediatric'
  },
  {
    bed_id: '13',
    bed_number: 'PED-201-B',
    room_number: 'PED-201',
    ward_name: 'Pediatric Ward',
    floor: 'First Floor',
    status: 'occupied-male',
    patient_name: 'Arjun Kumar (8 yrs)',
    admission_date: '2024-01-17',
    doctor_name: 'Dr. Joshi',
    bed_type: 'Pediatric'
  },
  {
    bed_id: '14',
    bed_number: 'MAT-101-A',
    room_number: 'MAT-101',
    ward_name: 'Maternity Ward',
    floor: 'Ground Floor',
    status: 'occupied-female',
    patient_name: 'Kavita Sharma',
    admission_date: '2024-01-16',
    doctor_name: 'Dr. Agarwal',
    bed_type: 'Maternity'
  }
]

export default function BedBoardPage() {
  const [bedOccupancy, setBedOccupancy] = useState<BedOccupancy[]>(mockBedOccupancy)
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [selectedFloor, setSelectedFloor] = useState<string>('all')
  const [selectedWard, setSelectedWard] = useState<string>('all')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPayer, setSelectedPayer] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { toast } = useToast()
  const { hospitalId } = useAuth()

  // Load data
  useEffect(() => {
    if (hospitalId) {
      loadBedBoardData()
    }
  }, [hospitalId])

  // Real-time subscription
  useEffect(() => {
    if (!hospitalId) return

    const subscription = supabase
      .channel(`ipd_records_${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ipd_records',
          filter: `hospital_id=eq.${hospitalId}`
        },
        (payload) => {
          console.log('Real-time IPD update:', payload)
          loadBedBoardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [hospitalId])

  const loadBedBoardData = async () => {
    setLoading(true)
    try {
      await loadIPDRecords()
    } catch (error) {
      console.error('Error loading bed board data:', error)
      toast({
        title: "Error",
        description: "Failed to load bed board data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadIPDRecords = async () => {
    if (!hospitalId) return

    try {
      const { data, error } = await supabase
        .from('ipd_records')
        .select(`
          *,
          patients (
            personal_info,
            contact_info
          ),
          doctors (
            users (
              full_name
            )
          )
        `)
        .eq('hospital_id', hospitalId)
        .eq('status', 'admitted')
        .order('admission_date', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      setIpdRecords(data || [])
      
      // Update bed occupancy with real data
      updateBedOccupancyWithIPDData(data || [])
      
    } catch (error) {
      console.error('Error loading IPD records:', error)
    }
  }

  const updateBedOccupancyWithIPDData = (records: IPDRecord[]) => {
    const updatedBedOccupancy = mockBedOccupancy.map(bed => {
      const ipdRecord = records.find(record => record.bed_number === bed.bed_number)
      
      if (ipdRecord) {
        const patientInfo = ipdRecord.patients?.personal_info || {}
        const gender = patientInfo.gender?.toLowerCase()
        
        return {
          ...bed,
          status: gender === 'male' ? 'occupied-male' as const : 'occupied-female' as const,
          patient_name: `${patientInfo.first_name || ''} ${patientInfo.last_name || ''}`.trim(),
          admission_date: ipdRecord.admission_date.split('T')[0],
          doctor_name: ipdRecord.doctors?.users?.full_name || 'Unknown Doctor',
          ipd_record: ipdRecord
        }
      }
      
      return bed
    })
    
    setBedOccupancy(updatedBedOccupancy)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadBedBoardData()
    setRefreshing(false)
  }

  // Get unique values for filters
  const getUniqueFloors = () => {
    const floors = [...new Set(bedOccupancy.map(bed => bed.floor))]
    return floors.sort()
  }

  const getUniqueWards = () => {
    const wards = [...new Set(bedOccupancy.map(bed => bed.ward_name))]
    return wards.sort()
  }

  const getUniqueDoctors = () => {
    const doctors = [...new Set(bedOccupancy
      .filter(bed => bed.doctor_name)
      .map(bed => bed.doctor_name!))]
    return doctors.sort()
  }

  // Filter beds
  const getFilteredBeds = () => {
    return bedOccupancy.filter(bed => {
      const floorMatch = selectedFloor === 'all' || bed.floor === selectedFloor
      const wardMatch = selectedWard === 'all' || bed.ward_name === selectedWard
      const doctorMatch = selectedDoctor === 'all' || bed.doctor_name === selectedDoctor
      const statusMatch = selectedStatus === 'all' || bed.status === selectedStatus
      
      const searchMatch = !searchQuery || 
        bed.bed_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return floorMatch && wardMatch && doctorMatch && statusMatch && searchMatch
    })
  }

  // Get bed statistics
  const getBedStatistics = () => {
    const total = bedOccupancy.length
    const occupied = bedOccupancy.filter(bed => bed.status.startsWith('occupied')).length
    const vacant = bedOccupancy.filter(bed => bed.status === 'vacant').length
    const maintenance = bedOccupancy.filter(bed => bed.status === 'maintenance').length
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

    return { total, occupied, vacant, maintenance, occupancyRate }
  }

  // Get bed status color
  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'occupied-male':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'occupied-female':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get bed status icon
  const getBedStatusIcon = (status: string) => {
    switch (status) {
      case 'vacant':
        return <CheckCircle className="w-4 h-4" />
      case 'occupied-male':
      case 'occupied-female':
        return <Users className="w-4 h-4" />
      case 'maintenance':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Bed className="w-4 h-4" />
    }
  }

  // Render bed card
  const renderBedCard = (bed: BedOccupancy) => {
    const isOccupied = bed.status.startsWith('occupied')
    const daysSinceAdmission = bed.admission_date 
      ? Math.floor((new Date().getTime() - new Date(bed.admission_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return (
      <Card key={bed.bed_id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bed className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{bed.bed_number}</span>
            </div>
            <Badge className={getBedStatusColor(bed.status)}>
              <div className="flex items-center space-x-1">
                {getBedStatusIcon(bed.status)}
                <span className="capitalize">
                  {bed.status.replace('-', ' ').replace('occupied', 'Occupied')}
                </span>
              </div>
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>{bed.room_number} - {bed.ward_name}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-600">
              <Building className="w-3 h-3" />
              <span>{bed.floor}</span>
            </div>

            <div className="text-xs text-gray-500">
              {bed.bed_type} Bed
            </div>

            {isOccupied && (
              <>
                <div className="border-t pt-2 mt-2">
                  <div className="font-medium text-gray-900">{bed.patient_name}</div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <UserCheck className="w-3 h-3" />
                    <span>{bed.doctor_name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>DOA: {new Date(bed.admission_date!).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{daysSinceAdmission} day{daysSinceAdmission !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group beds by floor and ward
  const groupBedsByFloorAndWard = () => {
    const filteredBeds = getFilteredBeds()
    const grouped: { [floor: string]: { [ward: string]: BedOccupancy[] } } = {}

    filteredBeds.forEach(bed => {
      if (!grouped[bed.floor]) {
        grouped[bed.floor] = {}
      }
      if (!grouped[bed.floor][bed.ward_name]) {
        grouped[bed.floor][bed.ward_name] = []
      }
      grouped[bed.floor][bed.ward_name].push(bed)
    })

    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading bed board...</p>
        </div>
      </div>
    )
  }

  const statistics = getBedStatistics()
  const groupedBeds = groupBedsByFloorAndWard()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bed Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time bed availability and patient occupancy
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
            <div className="text-sm text-gray-600">Total Beds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.occupied}</div>
            <div className="text-sm text-gray-600">Occupied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.vacant}</div>
            <div className="text-sm text-gray-600">Vacant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statistics.maintenance}</div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statistics.occupancyRate}%</div>
            <div className="text-sm text-gray-600">Occupancy</div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search beds, patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Floor</Label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {getUniqueFloors().map(floor => (
                    <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ward</Label>
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {getUniqueWards().map(ward => (
                    <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {getUniqueDoctors().map(doctor => (
                    <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied-male">Occupied (Male)</SelectItem>
                  <SelectItem value="occupied-female">Occupied (Female)</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payer</Label>
              <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payers</SelectItem>
                  <SelectItem value="self">Self Pay</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bed Board Grid */}
      <div className="space-y-6">
        {Object.entries(groupedBeds).map(([floor, wards]) => (
          <Card key={floor}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>{floor}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(wards).map(([wardName, beds]) => (
                <div key={wardName} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{wardName}</span>
                    <Badge variant="outline">
                      {beds.length} bed{beds.length !== 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {beds.map(renderBedCard)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {getFilteredBeds().length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No beds found matching the current filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}