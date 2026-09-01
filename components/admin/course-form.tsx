import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Course, CourseCreate, CourseUpdate, apiClient } from '@/lib/api'
import { X, Plus, Upload, Image as ImageIcon, Loader2, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { RichTextEditor } from './rich-text-editor'

interface CourseFormProps {
  course?: Course | CourseUpdate
  onSubmit: (data: CourseCreate | CourseUpdate) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const COURSE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

const COURSE_AVAILABILITY_STATUSES = [
  { value: 'live', label: 'Live - Available Now' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'archived', label: 'Archived' },
  { value: 'draft', label: 'Draft' },
]

const COURSE_CATEGORIES = [
  { id: 1, name: 'Professional Development Programs', code: 'ETBND', description: 'Workforce-focused skill development programs' },
  { id: 2, name: 'Skill Development Program', code: 'ETDIY', description: 'Affordable self-learning packs' },
  { id: 3, name: 'Trade Qualifications in VET Sector', code: 'BSB', description: 'Accredited VET programs' },
  { id: 4, name: 'Higher Education Qualifications in HE Sector', code: 'HE', description: 'Higher Education Degrees' },
  { id: 5, name: 'Competitive Test Preparation', code: 'ETP', description: 'Test preparation platform' },
  { id: 6, name: 'Accredited Higher Education (HE) Courses', code: 'HE-ACC', description: 'Accredited Higher Education courses' },
  { id: 7, name: 'Accredited VET Provider Courses', code: 'VET-ACC', description: 'Accredited VET provider courses' },
]

export function CourseForm({ course, onSubmit, onCancel, loading = false }: CourseFormProps) {
  const [formData, setFormData] = useState<CourseCreate>({
    name: '',
    description: '',
    details: '',
    price_without_certificate: undefined,
    price_with_certificate: undefined,
    discount: undefined,
    status: 'active',
    course_status: 'live',
    category: 1,
    category_code: 'ETBND',
    category_name: 'Professional Development Programs',
    course_code: '',
    tags: [],
    features: [],
    curriculum: '', // Tiptap stores as HTML string
    outcomes: [],
    requirements: [],
    image_url: '',
    rating: 4.5,
    level: 'Self-Paced',
    duration: 'Self-Paced',
    deadline_months: undefined,
    trial_enabled: false,
    trial_duration_days: 7,
    trial_link: '',
    content_folder: '',
    provider_logo_url: '',
    provider_name: '',
    listed_on_portfolio: true,
    partner_api_enabled: false,
  })

  const [tagInput, setTagInput] = useState('')
  const [featureInput, setFeatureInput] = useState('')
  const [outcomeInput, setOutcomeInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [providerLogoPreview, setProviderLogoPreview] = useState<string | null>(null)
  const [uploadingProviderLogo, setUploadingProviderLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const providerLogoInputRef = useRef<HTMLInputElement>(null)
  const lastCourseIdRef = useRef<number | null>(null)

  const isEditing = !!course

  // Only reset form when course ID actually changes, not when course object reference changes
  useEffect(() => {
    if (course && 'id' in course && course.id) {
      const currentCourseId = course.id;
      
      // Only reset if this is a different course than the last one we loaded
      if (lastCourseIdRef.current !== currentCourseId) {
        lastCourseIdRef.current = currentCourseId;
        
        setFormData({
          name: course.name || '',
          description: course.description || '',
          details: course.details || '',
          // Preserve null values (explicitly cleared) as undefined in form, otherwise fall back to legacy price
          price_without_certificate: course.price_without_certificate !== null ? (course.price_without_certificate ?? course.price) : undefined,
          price_with_certificate: course.price_with_certificate !== null ? (course.price_with_certificate ?? course.price) : undefined,
          discount: course.discount,
          status: course.status || 'active',
          course_status: course.course_status || 'live',
          category: course.category ?? 1,
          category_code: course.category_code || 'ETBND',
          category_name: course.category_name || COURSE_CATEGORIES.find(c => c.id === (course.category ?? 1))?.name || '',
          course_code: course.course_code || '',
          tags: Array.isArray(course.tags) ? course.tags : [],
          features: Array.isArray(course.features) ? course.features : [],
          curriculum: (() => {
            // Handle curriculum - can be string or array
            if (typeof course.curriculum === 'string') {
              return course.curriculum;
            }
            if (Array.isArray(course.curriculum) && course.curriculum.length > 0) {
              const firstItem = course.curriculum[0];
              // Check if first item is HTML (contains HTML tags)
              if (typeof firstItem === 'string' && /<[a-z][\s\S]*>/i.test(firstItem)) {
                return firstItem; // Use HTML string directly
              }
              // Legacy array format - convert to HTML list
              const htmlList = `<ul>${course.curriculum.map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
              return htmlList;
            }
            return '';
          })(),
          outcomes: Array.isArray(course.outcomes) ? course.outcomes : [],
          requirements: Array.isArray(course.requirements) ? course.requirements : [],
          image_url: course.image_url || '',
          rating: course.rating ?? 4.5,
          level: course.level || 'Self-Paced',
          duration: course.duration || 'Self-Paced',
          deadline_months: course.deadline_months,
          trial_enabled: course.trial_enabled || false,
          trial_duration_days: course.trial_duration_days || 7,
          trial_link: course.trial_link || '',
          content_folder: (course as any).content_folder || '',
          provider_logo_url: (course as any).provider_logo_url || '',
          provider_name: (course as any).provider_name || '',
          listed_on_portfolio: course.listed_on_portfolio !== false,
          partner_api_enabled: course.partner_api_enabled === true,
        });
        
        // Set image preview if image_url exists
        if (course.image_url) {
          setImagePreview(course.image_url)
        }
        // Set provider logo preview if provider_logo_url exists
        if ((course as any).provider_logo_url) {
          setProviderLogoPreview((course as any).provider_logo_url)
        }
      }
    } else if (!course) {
      // Reset when course is cleared (switching from edit to create mode)
      lastCourseIdRef.current = null;
    }
  }, [course && 'id' in course ? (course as Course).id : null]) // Only depend on course ID, not the whole object

  // Auto-set duration and deadline for Category 2
  useEffect(() => {
    if (formData.category === 2) {
      setFormData(prev => ({
        ...prev,
        duration: 'Self-Paced',
        deadline_months: 3,
      }))
    }
  }, [formData.category])

  // Update category name and code when category changes
  useEffect(() => {
    const selectedCategory = COURSE_CATEGORIES.find(c => c.id === formData.category)
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        category_name: selectedCategory.name,
        category_code: selectedCategory.code,
      }))
    }
  }, [formData.category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      return
    }

    // Prepare data for submission
    // Explicitly ensure arrays are always included (even if empty)

    const submitData: CourseCreate | CourseUpdate = {
      ...formData,
      // Force arrays to always be arrays (never undefined or null)
      tags: Array.isArray(formData.tags) ? formData.tags : [],
      features: Array.isArray(formData.features) ? formData.features : [],
      // Curriculum is always a string (HTML) from Tiptap editor
      // Always include curriculum, even if empty (to allow clearing it)
      // Normalize empty Tiptap HTML (e.g., <p></p>) to empty string
      curriculum: (() => {
        if (typeof formData.curriculum !== 'string') return '';
        const trimmed = formData.curriculum.trim();
        // Check if it's just empty HTML tags (Tiptap returns <p></p> when empty)
        const isEmptyHtml = /^<p[^>]*><\/p>$/i.test(trimmed) || 
                           /^<p[^>]*>\s*<\/p>$/i.test(trimmed) ||
                           trimmed === '';
        return isEmptyHtml ? '' : trimmed;
      })(),
      outcomes: Array.isArray(formData.outcomes) ? formData.outcomes : [],
      requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
      // Remove empty strings
      image_url: formData.image_url?.trim() || undefined,
      provider_logo_url: formData.provider_logo_url?.trim() || undefined,
      provider_name: formData.provider_name?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      details: formData.details?.trim() || undefined,
      // Explicitly include price fields - null means cleared, undefined means don't update
      // For updates, always include price fields if they exist in formData (null or number)
      price_without_certificate: 'price_without_certificate' in formData ? formData.price_without_certificate : undefined,
      price_with_certificate: 'price_with_certificate' in formData ? formData.price_with_certificate : undefined,
    }

    try {
      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  const handleInputChange = (field: keyof CourseCreate, value: string | number | boolean | undefined | null | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const addArrayItem = (field: 'tags' | 'features' | 'curriculum' | 'outcomes' | 'requirements', input: string, setInput: (val: string) => void) => {
    if (input.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), input.trim()],
      }))
      setInput('')
    }
  }

  const removeArrayItem = (field: 'tags' | 'features' | 'curriculum' | 'outcomes' | 'requirements', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }))
  }

  const selectedCategory = COURSE_CATEGORIES.find(c => c.id === formData.category)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter course name"
              required
              maxLength={500}
            />
            <p className={`text-xs ${formData.name.length > 200 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
              {formData.name.length}/500 characters
              {formData.name.length > 200 && formData.name.length < 450 && (
                <span className="ml-2">⚠️ Long name may cause display issues</span>
              )}
              {formData.name.length >= 450 && (
                <span className="ml-2">⚠️ Approaching maximum length</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course_code">Course Code</Label>
            <Input
              id="course_code"
              value={formData.course_code || ''}
              onChange={(e) => handleInputChange('course_code', e.target.value)}
              placeholder="e.g., ETBND-001, ETDIY-101, BSB-200"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this course (e.g., ETBND-001, ETDIY-101)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            content={formData.description || ''}
            onChange={(content) => handleInputChange('description', content)}
            placeholder="Enter course description"
            minHeight={150}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Course Details & Curriculum</Label>
          <RichTextEditor
            content={formData.details || ''}
            onChange={(content) => handleInputChange('details', content)}
            placeholder="Enter detailed course content, curriculum, and learning objectives..."
            minHeight={250}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">Banner Image</Label>
          <div className="space-y-3">
            {/* Image Preview */}
            {(imagePreview || formData.image_url) && (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                <img
                  src={imagePreview || formData.image_url || ''}
                  alt="Course banner preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    setImageFile(null)
                    handleInputChange('image_url', '')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* File Input */}
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Validate file size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('Image size must be less than 5MB')
                      return
                    }

                    // Validate file type
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
                    if (!allowedTypes.includes(file.type)) {
                      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)')
                      return
                    }

                    setImageFile(file)
                    // Create preview
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setImagePreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)

                    // Upload image
                    setUploadingImage(true)
                    try {
                      const response = await apiClient.uploadCourseImage(file)
                      if (response.success && response.data) {
                        handleInputChange('image_url', response.data.url)
                        toast.success('Image uploaded successfully')
                      } else {
                        toast.error(response.message || 'Failed to upload image')
                        setImageFile(null)
                        setImagePreview(null)
                      }
                    } catch (error) {
                      console.error('Image upload error:', error)
                      toast.error('Failed to upload image')
                      setImageFile(null)
                      setImagePreview(null)
                    } finally {
                      setUploadingImage(false)
                    }
                  }
                }}
                className="hidden"
                id="image-upload"
                disabled={uploadingImage}
              />
              <Label
                htmlFor="image-upload"
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{imagePreview || formData.image_url ? 'Change Image' : 'Upload Banner Image'}</span>
                    </>
                  )}
                </div>
              </Label>
            </div>

            {/* Manual URL Input (fallback) */}
            <div className="text-xs text-muted-foreground">
              Or enter image URL manually:
            </div>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => {
                handleInputChange('image_url', e.target.value)
                if (e.target.value) {
                  setImagePreview(e.target.value)
                }
              }}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: JPEG, PNG, WebP, GIF (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      {/* Category Information */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Category</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category?.toString()}
              onValueChange={(value) => handleInputChange('category', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_code">Category Code</Label>
            <Input
              id="category_code"
              value={formData.category_code}
              onChange={(e) => handleInputChange('category_code', e.target.value)}
              placeholder="e.g., ETBND, ETDIY, BSB, ICT, HE, ETP"
            />
            <p className="text-xs text-muted-foreground">Auto-filled based on category, but can be customized</p>
          </div>
        </div>

        {/* VET Provider Logo - Only for Accredited VET Provider Courses (category 7) */}
        {formData.category === 7 && (
          <div className="space-y-4 mt-6 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium text-sm">Provider / University Logo</h4>
            <p className="text-xs text-muted-foreground">
              Upload the logo of the university or RTO providing this course. This will be displayed on the course detail page (Coursera-style).
            </p>
            <div className="space-y-2">
              <Label htmlFor="provider_name">Provider Name</Label>
              <Input
                id="provider_name"
                value={formData.provider_name || ''}
                onChange={(e) => handleInputChange('provider_name', e.target.value)}
                placeholder="e.g., EdTec Institute Australia"
              />
            </div>
            <div className="space-y-3">
              <Label>Provider Logo</Label>
              {(providerLogoPreview || formData.provider_logo_url) && (
                <div className="relative w-32 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={providerLogoPreview || formData.provider_logo_url || ''}
                    alt="Provider logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProviderLogoPreview(null)
                      handleInputChange('provider_logo_url', '')
                      if (providerLogoInputRef.current) {
                        providerLogoInputRef.current.value = ''
                      }
                    }}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  ref={providerLogoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error('Logo size must be less than 2MB')
                        return
                      }
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
                      if (!allowedTypes.includes(file.type)) {
                        toast.error('Invalid file type. Use JPEG, PNG, WebP, or SVG')
                        return
                      }
                      setUploadingProviderLogo(true)
                      try {
                        const response = await apiClient.uploadProviderLogo(file)
                        if (response.success && response.data) {
                          handleInputChange('provider_logo_url', response.data.url)
                          setProviderLogoPreview(response.data.url)
                          toast.success('Provider logo uploaded successfully')
                        } else {
                          toast.error(response.message || 'Failed to upload logo')
                        }
                      } catch (error) {
                        console.error('Provider logo upload error:', error)
                        toast.error('Failed to upload provider logo')
                      } finally {
                        setUploadingProviderLogo(false)
                      }
                    }
                  }}
                  className="hidden"
                  id="provider-logo-upload"
                  disabled={uploadingProviderLogo}
                />
                <Label htmlFor="provider-logo-upload" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    {uploadingProviderLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>{formData.provider_logo_url ? 'Change Logo' : 'Upload Provider Logo'}</span>
                      </>
                    )}
                  </div>
                </Label>
              </div>
              <div className="text-xs text-muted-foreground">Or enter logo URL manually:</div>
              <Input
                id="provider_logo_url"
                value={formData.provider_logo_url || ''}
                onChange={(e) => {
                  handleInputChange('provider_logo_url', e.target.value)
                  if (e.target.value) setProviderLogoPreview(e.target.value)
                }}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Pricing</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price_without_certificate">Price Without Certificate ($)</Label>
            <Input
              id="price_without_certificate"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_without_certificate ?? ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                handleInputChange('price_without_certificate', value ? parseFloat(value) : null);
              }}
              placeholder="e.g., 299.99"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_with_certificate">Price With Certificate ($)</Label>
            <Input
              id="price_with_certificate"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_with_certificate ?? ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                handleInputChange('price_with_certificate', value ? parseFloat(value) : null);
              }}
              placeholder="e.g., 349.99"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.discount || ''}
              onChange={(e) => handleInputChange('discount', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 10.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">Rating (0-5)</Label>
            <Input
              id="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.rating || ''}
              onChange={(e) => handleInputChange('rating', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 4.5"
            />
          </div>
        </div>
      </div>

      {/* Duration & Level */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Duration & Level</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              placeholder="e.g., Self-Paced, 12 weeks"
              disabled={formData.category === 2}
            />
            {formData.category === 2 && (
              <p className="text-xs text-muted-foreground">Auto-set to "Self-Paced" for Category 2</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              value={formData.level}
              onChange={(e) => handleInputChange('level', e.target.value)}
              placeholder="e.g., Beginner, Intermediate, Advanced"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline_months">Deadline (Months)</Label>
            <Input
              id="deadline_months"
              type="number"
              min="1"
              value={formData.deadline_months || ''}
              onChange={(e) => handleInputChange('deadline_months', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g., 3"
              disabled={formData.category === 2}
            />
            {formData.category === 2 && (
              <p className="text-xs text-muted-foreground">Auto-set to 3 months for Category 2</p>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Fields - Tags */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Tags</h3>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addArrayItem('tags', tagInput, setTagInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('tags', tagInput, setTagInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeArrayItem('tags', index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Enhanced Fields - Features */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Features</h3>
        <div className="flex gap-2">
          <Input
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            placeholder="Add a feature"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addArrayItem('features', featureInput, setFeatureInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('features', featureInput, setFeatureInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {formData.features?.map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{feature}</span>
              <button
                type="button"
                onClick={() => removeArrayItem('features', index)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Fields - Curriculum */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Curriculum Modules</h3>
        <div className="space-y-2">
          <Label htmlFor="curriculum">Curriculum Content</Label>
          <RichTextEditor
            content={typeof formData.curriculum === 'string' ? formData.curriculum : ''}
            onChange={(content) => handleInputChange('curriculum', content)}
            placeholder="Add curriculum modules, topics, and learning objectives..."
            minHeight={300}
          />
          <p className="text-xs text-muted-foreground">
            Use headings, lists, and other formatting options to structure your curriculum
          </p>
        </div>
      </div>

      {/* Enhanced Fields - Outcomes */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Learning Outcomes</h3>
        <div className="flex gap-2">
          <Input
            value={outcomeInput}
            onChange={(e) => setOutcomeInput(e.target.value)}
            placeholder="Add a learning outcome"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addArrayItem('outcomes', outcomeInput, setOutcomeInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('outcomes', outcomeInput, setOutcomeInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {formData.outcomes?.map((outcome, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{outcome}</span>
              <button
                type="button"
                onClick={() => removeArrayItem('outcomes', index)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Fields - Requirements */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Requirements / Prerequisites</h3>
        <div className="flex gap-2">
          <Input
            value={requirementInput}
            onChange={(e) => setRequirementInput(e.target.value)}
            placeholder="Add a requirement or prerequisite"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addArrayItem('requirements', requirementInput, setRequirementInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('requirements', requirementInput, setRequirementInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {formData.requirements?.map((requirement, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{requirement}</span>
              <button
                type="button"
                onClick={() => removeArrayItem('requirements', index)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trial Settings */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-green-600" />
          Free Trial Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="trial_enabled" className="text-base font-medium">
                Enable Free Trial
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow users to start a free trial of this course. Users will receive trial access details via email.
              </p>
            </div>
            <Switch
              id="trial_enabled"
              checked={formData.trial_enabled || false}
              onCheckedChange={(checked) => handleInputChange('trial_enabled', checked)}
            />
          </div>

          {formData.trial_enabled && (
            <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Label htmlFor="trial_duration_days">Trial Duration (Days)</Label>
              <Input
                id="trial_duration_days"
                type="number"
                min="1"
                max="365"
                value={formData.trial_duration_days || 7}
                onChange={(e) => handleInputChange('trial_duration_days', e.target.value ? parseInt(e.target.value) : 7)}
                placeholder="e.g., 7, 14, 30"
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Number of days the free trial will last. Common values: 7, 14, or 30 days.
              </p>
            </div>
          )}

          {/* Iframe Content Link - Always visible */}
          <div className="space-y-2 p-4 border rounded-lg">
            <Label htmlFor="trial_link">Course Content Iframe Link</Label>
            <Input
              id="trial_link"
              type="url"
              value={formData.trial_link || ''}
              onChange={(e) => handleInputChange('trial_link', e.target.value)}
              placeholder="https://example.com/course-content/index.html"
            />
            <p className="text-xs text-muted-foreground">
              URL to the course content that will be displayed in an iframe on the course detail page (e.g., H5P content hosted on S3 or other platforms). This field is available for all courses, regardless of trial status.
            </p>
          </div>

          {/* Content folder: admin enters folder name → URLs built automatically from CDN base */}
          <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <Label htmlFor="content_folder">Content folder (in-app player)</Label>
            <Input
              id="content_folder"
              type="text"
              value={formData.content_folder || ''}
              onChange={(e) => handleInputChange('content_folder', e.target.value)}
              placeholder="e.g. BSBCRT511 or Developing Critical Thinking"
            />
            <p className="text-xs text-muted-foreground">
              Folder under the CDN base. BSB* units use{" "}
              <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_LMS_CONTENT_BASE_URL</code> (ETIA /lms);
              other folders use <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_H5P_CONTENT_BASE_URL</code>.
              Absolute https course-root URLs are also supported.
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Status</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course_status">Course Availability</Label>
            <Select
              value={formData.course_status}
              onValueChange={(value) => handleInputChange('course_status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_AVAILABILITY_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold">Distribution</h3>
        <p className="text-sm text-muted-foreground">
          Control where this course appears: the public EdTec Online catalog and/or the partner read-only API.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="listed_on_portfolio">Listed on portfolio site</Label>
              <p className="text-xs text-muted-foreground">
                Show on edtec.online course catalog and search.
              </p>
            </div>
            <Switch
              id="listed_on_portfolio"
              checked={formData.listed_on_portfolio !== false}
              onCheckedChange={(checked) => handleInputChange('listed_on_portfolio', checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="partner_api_enabled">Partner API</Label>
              <p className="text-xs text-muted-foreground">
                Include in GET /api/v1/partner/courses for authenticated partners.
              </p>
            </div>
            <Switch
              id="partner_api_enabled"
              checked={formData.partner_api_enabled === true}
              onCheckedChange={(checked) => handleInputChange('partner_api_enabled', checked)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name.trim()}>
          {loading ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
        </Button>
      </div>
    </form>
  )
}
