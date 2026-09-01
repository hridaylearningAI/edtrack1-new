import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, X, Users } from 'lucide-react'
import { Student } from '@/lib/api'
import { useStudents } from '@/lib/hooks/useStudents'

interface StudentSelectionDialogProps {
  selectedStudentIds: number[]
  onSelectionChange: (studentIds: number[]) => void
  trigger?: React.ReactNode
}

export function StudentSelectionDialog({ selectedStudentIds, onSelectionChange, trigger }: StudentSelectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localSelection, setLocalSelection] = useState<number[]>(selectedStudentIds)
  
  const { students, loading, fetchStudents } = useStudents()

  useEffect(() => {
    if (open) {
      fetchStudents({ limit: 200 })
    }
  }, [open, fetchStudents])

  useEffect(() => {
    setLocalSelection(selectedStudentIds)
  }, [selectedStudentIds])

  const handleSave = () => {
    onSelectionChange(localSelection)
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalSelection(selectedStudentIds)
    setOpen(false)
  }

  const handleStudentToggle = (studentId: number) => {
    setLocalSelection(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    setLocalSelection(students.map(student => student.id))
  }

  const handleClearAll = () => {
    setLocalSelection([])
  }

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge variant="default" className="bg-green-600 text-white text-xs">Active</Badge>
      case "inactive":
        return <Badge variant="secondary" className="text-xs">Inactive</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            Select Students
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Students for Discount</DialogTitle>
          <DialogDescription>
            Choose which students this discount will apply to. Leave empty to apply to all students.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {localSelection.length} of {students.length} selected
            </div>
          </div>

          {/* Student List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading students...</p>
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    localSelection.includes(student.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleStudentToggle(student.id)}
                >
                  <Checkbox
                    checked={localSelection.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{student.name || 'Unknown'}</h4>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(student.status)}
                      </div>
                    </div>
                    {student.email && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {student.email}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Selection ({localSelection.length} students)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
