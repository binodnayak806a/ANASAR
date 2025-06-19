import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download, Share } from 'lucide-react'

interface ReportTableProps {
  title: string
  description?: string
  data: any[]
  columns: Array<{
    key: string
    label: string
    type?: 'text' | 'number' | 'currency' | 'date' | 'badge'
    render?: (value: any, row: any) => React.ReactNode
  }>
  loading?: boolean
  onRowClick?: (row: any) => void
}

export default function ReportTable({
  title,
  description,
  data,
  columns,
  loading = false,
  onRowClick
}: ReportTableProps) {
  const formatValue = (value: any, type: string = 'text') => {
    if (value === null || value === undefined) return '-'
    
    switch (type) {
      case 'currency':
        return `₹${Number(value).toLocaleString()}`
      case 'number':
        return Number(value).toLocaleString()
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'badge':
        return <Badge variant="outline">{value}</Badge>
      default:
        return value
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-sm text-gray-600">
            {data.length} record{data.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No data available for the selected criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="text-left p-3 font-medium text-gray-900 dark:text-white"
                    >
                      {column.label}
                    </th>
                  ))}
                  {onRowClick && <th className="text-right p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="p-3">
                        {column.render
                          ? column.render(row[column.key], row)
                          : formatValue(row[column.key], column.type)}
                      </td>
                    ))}
                    {onRowClick && (
                      <td className="p-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Share className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}