import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Eye } from 'lucide-react'
import { Document } from '@/lib/api'

interface DocumentVerificationDialogProps {
  document: Document
  onVerified: () => void
}

export function DocumentVerificationDialog({ document, onVerified }: DocumentVerificationDialogProps) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleAction = async () => {
    if (!action) return

    setVerifying(true)
    try {
      // Import the hook here to avoid circular dependency
      const { useDocuments } = await import('@/lib/hooks/useDocuments')
      const { verifyDocument } = useDocuments()
      
      const status = action === 'approve' ? 'verified' : 'rejected'
      await verifyDocument(
        document.id,
        status,
        comments || undefined,
        action === 'reject' ? rejectionReason : undefined
      )
      
      // Reset form
      setAction(null)
      setComments('')
      setRejectionReason('')
      setOpen(false)
      
      // Notify parent component
      onVerified()
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setVerifying(false)
    }
  }

  const handleCancel = () => {
    setAction(null)
    setComments('')
    setRejectionReason('')
    setOpen(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDocumentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      passport: 'Passport',
      visa: 'Visa',
      academic_transcript: 'Academic Transcript',
      drivers_license: 'Driver\'s License',
      birth_certificate: 'Birth Certificate',
      medical_certificate: 'Medical Certificate',
      other: 'Other'
    }
    return typeMap[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Review Document</DialogTitle>
          <DialogDescription>
            Review and verify or reject this student document
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Document Information */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Student</Label>
              <p className="font-medium">{document.student_name || `Student ${document.student_id}`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Document Type</Label>
              <p className="font-medium">{getDocumentTypeLabel(document.document_type)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">File Name</Label>
              <p className="font-medium text-sm">{document.original_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">File Size</Label>
              <p className="font-medium text-sm">{formatFileSize(document.file_size)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Upload Date</Label>
              <p className="font-medium text-sm">
                {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <p className="font-medium text-sm capitalize">{document.status}</p>
            </div>
            {document.notes && (
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                <p className="text-sm">{document.notes}</p>
              </div>
            )}
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={action === 'approve' ? 'default' : 'outline'}
                onClick={() => setAction('approve')}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                type="button"
                variant={action === 'reject' ? 'destructive' : 'outline'}
                onClick={() => setAction('reject')}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>

            {/* Comments for approval */}
            {action === 'approve' && (
              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any comments about this approval..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Rejection reason */}
            {action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                />
                <Label htmlFor="comments">Additional Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any additional comments..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleAction}
            disabled={!action || (action === 'reject' && !rejectionReason) || verifying}
            variant={action === 'reject' ? 'destructive' : 'default'}
          >
            {verifying ? 'Processing...' : action === 'approve' ? 'Approve Document' : 'Reject Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
