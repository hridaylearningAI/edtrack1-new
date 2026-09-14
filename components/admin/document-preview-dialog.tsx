import { useState, useEffect } from 'react'
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
import { Eye, Download, ExternalLink, FileText, Image, File, Check, X } from 'lucide-react'
import { Document } from '@/lib/api'

interface DocumentPreviewDialogProps {
  document: Document
  onVerified?: () => void
}

export function DocumentPreviewDialog({ document, onVerified }: DocumentPreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [verifying, setVerifying] = useState(false)

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-primary" />
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-destructive" />
    } else {
      return <File className="h-5 w-5 text-muted-foreground" />
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const canPreviewInBrowser = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf'
  }

  const handlePreview = async () => {
    if (!canPreviewInBrowser(document.mime_type)) {
      // For non-previewable files, just download them
      handleDownload()
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Import the API client to get download URL
      const { apiClient } = await import('@/lib/api')
      const response = await apiClient.downloadDocument(document.id)
      setPreviewUrl(response.download_url)
    } catch (err) {
      setError('Failed to load document preview')
      console.error('Preview failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const { apiClient } = await import('@/lib/api')
      const response = await apiClient.downloadDocument(document.id)
      window.open(response.download_url, '_blank')
    } catch (err) {
      setError('Failed to download document')
      console.error('Download failed:', err)
    }
  }

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  const handleVerification = async () => {
    if (!action) return

    setVerifying(true)
    try {
      const { apiClient } = await import('@/lib/api')
      const status = action === 'approve' ? 'verified' : 'rejected'
      await apiClient.verifyDocument(
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
      if (onVerified) {
        onVerified()
      }
    } catch (error) {
      setError('Failed to verify document')
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

  useEffect(() => {
    if (open && canPreviewInBrowser(document.mime_type)) {
      handlePreview()
    }
  }, [open])

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">{error}</p>
            <Button onClick={handlePreview} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Click Preview to load document</p>
            <Button onClick={handlePreview} variant="outline" size="sm">
              Load Preview
            </Button>
          </div>
        </div>
      )
    }

    if (document.mime_type.startsWith('image/')) {
      return (
        <div className="space-y-2">
          <img 
            src={previewUrl} 
            alt={document.original_name}
            className="max-w-full h-auto rounded-lg border"
            onError={() => setError('Failed to load image')}
          />
        </div>
      )
    }

    if (document.mime_type === 'application/pdf') {
      return (
        <div className="space-y-2">
          <iframe
            src={previewUrl}
            className="w-full h-96 border rounded-lg"
            title={document.original_name}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <File className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
          <Button onClick={handleDownload} variant="outline" size="sm">
            Download Instead
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
          <DialogDescription>
            Preview and manage the uploaded document
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

          {/* Document Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Document Preview</Label>
              <div className="flex items-center space-x-2">
                {getDocumentIcon(document.mime_type)}
                <span className="text-sm text-muted-foreground">
                  {document.mime_type}
                </span>
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-muted/20">
              {renderPreview()}
            </div>
          </div>

          {/* Verification Actions */}
          {action && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {action === 'approve' ? 'Approve Document' : 'Reject Document'}
                </Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={action === 'approve' ? 'default' : 'outline'}
                    onClick={() => setAction('approve')}
                    size="sm"
                  >
                    <Check className="mr-2 h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant={action === 'reject' ? 'destructive' : 'outline'}
                    onClick={() => setAction('reject')}
                    size="sm"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Reject
                  </Button>
                </div>
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

              <div className="flex space-x-2">
                <Button 
                  onClick={handleVerification}
                  disabled={!action || (action === 'reject' && !rejectionReason) || verifying}
                  variant={action === 'reject' ? 'destructive' : 'default'}
                >
                  {verifying ? 'Processing...' : action === 'approve' ? 'Approve Document' : 'Reject Document'}
                </Button>
                <Button onClick={() => setAction(null)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex space-x-2">
            {canPreviewInBrowser(document.mime_type) && previewUrl && (
              <Button onClick={handleOpenInNewTab} variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            )}
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {document.status.toLowerCase() === "pending" && (
              <>
                <Button 
                  onClick={() => setAction('approve')} 
                  variant="outline"
                  className="text-success hover:text-success"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button 
                  onClick={() => setAction('reject')} 
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            <Button onClick={handleCancel}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
