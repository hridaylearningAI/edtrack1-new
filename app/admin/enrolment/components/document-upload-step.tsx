import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, ArrowLeft, FileText, Upload, X, File, CheckCircle, Loader2 } from "lucide-react"
import { EnrollmentData } from "../page"
import { useUser } from "@/lib/hooks/useUser"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface DocumentUploadStepProps {
  enrollmentData: EnrollmentData
  updateEnrollmentData: (data: Partial<EnrollmentData>) => void
  onNext: () => void
  onPrev: () => void
  currentStep: number
  totalSteps: number
}

interface DocumentFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  uploaded: boolean
}

const requiredDocuments = [
  { id: "id-proof", name: "Government ID Proof", description: "Passport, Driver's License, or National ID", required: true },
  { id: "photo", name: "Passport Size Photo", description: "Recent passport size photograph", required: true },
  { id: "education", name: "Educational Certificates", description: "Previous education certificates (if applicable)", required: false },
  { id: "resume", name: "Resume/CV", description: "Current resume or curriculum vitae", required: false },
  { id: "reference", name: "Reference Letter", description: "Professional or academic reference letter", required: false },
]

export function DocumentUploadStep({ 
  enrollmentData, 
  updateEnrollmentData, 
  onNext, 
  onPrev, 
  currentStep, 
  totalSteps 
}: DocumentUploadStepProps) {
  const { getAccessToken } = useUser()
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<number[]>(enrollmentData.uploadedDocumentIds || [])

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles: DocumentFile[] = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])
    updateEnrollmentData({ documents: [...enrollmentData.documents, ...Array.from(files)] })
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
    updateEnrollmentData({ 
      documents: enrollmentData.documents.filter((_, index) => 
        !uploadedFiles.find(file => file.id === fileId)
      )
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUploadDocuments = async () => {
    if (!enrollmentData.studentId) {
      toast.error("Student ID not found. Please complete previous steps first.")
      return
    }

    if (uploadedFiles.length === 0) {
      toast.error("Please select files to upload")
      return
    }

    // Filter out already uploaded files
    const filesToUpload = uploadedFiles.filter(f => !f.uploaded)
    if (filesToUpload.length === 0) {
      toast.info("All selected files have already been uploaded")
      return
    }

    setUploading(true)
    const documentIds: number[] = []

    try {
      for (const file of filesToUpload) {

        try {
          // Determine document type from file name or use 'other'
          let documentType = 'other'
          const fileName = file.name.toLowerCase()
          if (fileName.includes('id') || fileName.includes('passport') || fileName.includes('license')) {
            documentType = 'id-proof'
          } else if (fileName.includes('photo') || fileName.includes('picture') || fileName.includes('image')) {
            documentType = 'photo'
          } else if (fileName.includes('certificate') || fileName.includes('diploma') || fileName.includes('degree')) {
            documentType = 'education'
          } else if (fileName.includes('resume') || fileName.includes('cv')) {
            documentType = 'resume'
          } else if (fileName.includes('reference') || fileName.includes('letter')) {
            documentType = 'reference'
          }

          await apiClient.uploadDocument(
            file.file,
            enrollmentData.studentId!,
            documentType,
            `Uploaded during enrollment wizard - ${file.name}`,
            true // isAdminUpload
          )

          // Get the uploaded document ID (we'll need to fetch it)
          // For now, we'll mark it as uploaded
          file.uploaded = true
          toast.success(`Uploaded: ${file.name}`)
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error)
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      // Update state
      setUploadedFiles([...uploadedFiles])
      updateEnrollmentData({ 
        uploadedDocumentIds: [...uploadedDocumentIds, ...documentIds]
      })

      toast.success("All documents uploaded successfully")
    } catch (error: any) {
      console.error('Error uploading documents:', error)
      toast.error("Failed to upload some documents")
    } finally {
      setUploading(false)
    }
  }

  const handleNext = () => {
    // If files are selected but not uploaded, prompt to upload
    const unuploadedFiles = uploadedFiles.filter(f => !f.uploaded)
    if (unuploadedFiles.length > 0) {
      toast.error("Please upload all selected documents before proceeding, or remove them")
      return
    }

    // Documents are optional - allow proceeding even if no documents uploaded
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Step {currentStep}: Document Upload
        </CardTitle>
        <CardDescription>Upload required documents for enrollment verification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Documents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Documents (Optional)</h4>
            <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded">Optional</span>
          </div>
          <div className="grid gap-3">
            {requiredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    uploadedFiles.some(f => f.uploaded)
                      ? "bg-green-100 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {uploadedFiles.some(f => f.uploaded) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <File className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-sm text-muted-foreground">{doc.description}</div>
                  </div>
                </div>
                {doc.required && (
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">Recommended</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* File Upload Area */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Upload Documents</h4>
          
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h5 className="text-lg font-medium mb-2">Drag & Drop Files Here</h5>
            <p className="text-muted-foreground mb-4">
              or click to browse files from your computer
            </p>
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Choose Files
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium">Selected Files</h5>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadDocuments}
                  disabled={uploading || uploadedFiles.every(f => f.uploaded)}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload All
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    file.uploaded ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {file.uploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <File className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                          {file.uploaded && <span className="text-green-600 ml-2">✓ Uploaded</span>}
                        </div>
                      </div>
                    </div>
                    {!file.uploaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-2">Upload Guidelines (Optional)</h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Document upload is optional - you can proceed without uploading</li>
            <li>• Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG</li>
            <li>• Maximum file size: 10MB per file</li>
            <li>• Ensure documents are clear and legible</li>
            <li>• You can upload documents later from the student's profile</li>
          </ul>
        </div>

        <div className="flex justify-between space-x-4 pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payment Details
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleNext}
            disabled={uploadedFiles.some(f => !f.uploaded)}
          >
            Continue to Review & Confirm
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
