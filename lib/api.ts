// API client for EdTec Student Management System
// Use local API routes (Next.js API routes) instead of external API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  count?: number;
  total_pages?: number;
  current_page?: number;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  role?: string; // 'admin' | 'student'
  status?: string; // 'active' | 'inactive' | 'suspended'
  avatar?: string;
  student_number?: string; // EDTEC-YYXNNNN format
  // Legacy fields from students table (kept for backward compatibility, but won't be populated from users table)
  phone?: string;
  address?: string;
  date_of_birth?: string;
  grade?: string;
  enrollment_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentCreate {
  name: string;
  email: string;
  status?: string; // 'active' | 'inactive' | 'suspended'
  avatar?: string;
  // Legacy fields (kept for backward compatibility, but won't be saved to users table)
  phone?: string;
  address?: string;
  date_of_birth?: string;
  grade?: string;
  enrollment_date?: string;
}

export interface StudentUpdate {
  name?: string;
  email?: string;
  status?: string; // 'active' | 'inactive' | 'suspended'
  avatar?: string;
  // Legacy fields (kept for backward compatibility, but won't be saved to users table)
  phone?: string;
  address?: string;
  date_of_birth?: string;
  grade?: string;
  enrollment_date?: string;
}

export interface StudentSearchParams {
  name?: string;
  email?: string;
  status?: string;
  // Legacy fields (kept for backward compatibility, but won't filter users table)
  grade?: string;
  enrollment_date_from?: string;
  enrollment_date_to?: string;
  page?: number;
  limit?: number;
}

export interface Document {
  id: number
  student_id: number
  filename: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  document_type: string
  status: string
  notes?: string
  uploaded_at: string
  verified_at?: string
  verified_by?: string
  rejection_reason?: string
  student_name?: string
  student_avatar?: string
}

export interface DocumentCreate {
  student_id: number
  document_type: string
  notes?: string
}

export interface DocumentUpdate {
  status?: string
  notes?: string
  rejection_reason?: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
  limit: number
  offset: number
}

export interface DocumentUploadResponse {
  id: number
  filename: string
  file_path: string
  status: string
  message: string
}

export interface Course {
  id: number
  name: string
  description?: string
  details?: string
  price?: number // Legacy field, use price_without_certificate
  price_without_certificate?: number
  price_with_certificate?: number
  discount?: number
  students_enrolled?: number
  active_enrollments?: number
  completed_enrollments?: number
  cancelled_enrollments?: number
  average_progress?: number
  active_discount_count?: number
  total_discount_count?: number
  best_discount_amount?: number
  min_price_after_discount?: number
  discounts?: any[]
  enrollments?: any[]
  summary_stats?: any
  status?: string
  course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
  // Category fields
  category?: number // 1-5
  category_code?: string // ETBND, ETDIY, BSB, ICT, HE, ETP, etc.
  category_name?: string
  // Course code (unique identifier for each course)
  course_code?: string // Unique course code (e.g., ETBND-001, ETDIY-101, BSB-200)
  // Enhanced fields
  tags?: string[]
  features?: string[]
  curriculum?: string[]
  outcomes?: string[]
  requirements?: string[]
  image_url?: string
  rating?: number
  level?: string
  duration?: string
  deadline_months?: number
  // Trial fields
  trial_enabled?: boolean
  trial_duration_days?: number
  trial_link?: string
  // In-app content (CDN): folder name under base URL; full URLs are built as {base}/{content_folder}/...
  content_folder?: string
  // VET Provider fields (Accredited VET Provider courses - category 7)
  provider_logo_url?: string
  provider_name?: string
  // Stripe fields
  stripe_product_id?: string
  stripe_price_id_without_certificate?: string
  stripe_price_id_with_certificate?: string
  stripe_synced_at?: string
  created_at?: string
  updated_at?: string
  // Course plans (segments) for multi-option courses (e.g. NCLEX)
  plans?: CoursePlan[]
  /** Show on public EdTec Online portfolio catalog */
  listed_on_portfolio?: boolean
  /** Expose via read-only Partner Course API (/api/v1/partner/courses) */
  partner_api_enabled?: boolean
}

/** Pricing plan/segment for a course (e.g. Self Paced, Guided NCLEX). Used by portfolio cart/checkout. */
export interface CoursePlan {
  id: number
  course_id: number
  plan_key: string
  name: string
  price: number
  stripe_price_id?: string | null
  sort_order: number
  description?: string | null
}

export interface CourseCreate {
  name: string
  description?: string
  details?: string
  price?: number // Legacy, will map to price_without_certificate
  price_without_certificate?: number
  price_with_certificate?: number
  discount?: number
  status?: string
  course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
  // Category fields
  category?: number
  category_code?: string
  category_name?: string
  // Course code (unique identifier for each course)
  course_code?: string
  // Enhanced fields
  tags?: string[]
  features?: string[]
  curriculum?: string[]
  outcomes?: string[]
  requirements?: string[]
  image_url?: string
  rating?: number
  level?: string
  duration?: string
  deadline_months?: number
  // Trial fields
  trial_enabled?: boolean
  trial_duration_days?: number
  trial_link?: string
  content_folder?: string
  provider_logo_url?: string
  provider_name?: string
  listed_on_portfolio?: boolean
  partner_api_enabled?: boolean
}

export interface CourseUpdate {
  name?: string
  description?: string
  details?: string
  price?: number // Legacy, will map to price_without_certificate
  price_without_certificate?: number
  price_with_certificate?: number
  discount?: number
  students_enrolled?: number
  status?: string
  course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
  // Category fields
  category?: number
  category_code?: string
  category_name?: string
  // Course code (unique identifier for each course)
  course_code?: string
  // Enhanced fields
  tags?: string[]
  features?: string[]
  curriculum?: string[]
  outcomes?: string[]
  requirements?: string[]
  image_url?: string
  rating?: number
  level?: string
  duration?: string
  deadline_months?: number
  // Trial fields
  trial_enabled?: boolean
  trial_duration_days?: number
  trial_link?: string
  content_folder?: string
  provider_logo_url?: string
  provider_name?: string
  listed_on_portfolio?: boolean
  partner_api_enabled?: boolean
}

export interface CourseSearchParams {
  name?: string
  status?: string
  course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
  price_min?: number
  price_max?: number
  discount_min?: number
  discount_max?: number
  students_enrolled_min?: number
  students_enrolled_max?: number
  page?: number
  limit?: number
}

export interface Enrollment {
  id: number
  student_id: number
  course_id: number
  enrollment_date?: string
  completion_date?: string
  status?: string
  progress?: number
  grade?: string
  notes?: string
  created_at?: string
  updated_at?: string
  student_name?: string
  course_name?: string
  with_certificate?: boolean // Whether this enrollment includes a certificate
  students?: {
    name: string
  }
  courses?: {
    name: string
  }
}

export interface EnrollmentCreate {
  student_id: number
  course_id: number
  enrollment_date?: string
  completion_date?: string
  status?: string
  progress?: number
  grade?: string
  notes?: string
}

export interface EnrollmentUpdate {
  enrollment_date?: string
  completion_date?: string
  status?: string
  progress?: number
  grade?: string
  notes?: string
}

export interface Discount {
  id: number
  name: string
  description?: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_course'
  discount_value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  usage_count: number
  start_date?: string
  end_date?: string
  status: 'active' | 'inactive' | 'expired' | 'scheduled'
  is_one_time_use: boolean
  is_student_specific: boolean
  student_ids?: number[]
  course_ids?: number[]
  coupon_code: string
  created_at?: string
  updated_at?: string
  last_used_at?: string
  courses?: Course[]
}

export interface DiscountCreate {
  name: string
  description?: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_course'
  discount_value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  start_date?: string
  end_date?: string
  status?: 'active' | 'inactive' | 'expired' | 'scheduled'
  is_one_time_use?: boolean
  is_student_specific?: boolean
  student_ids?: number[]
  course_ids?: number[]
  coupon_code: string
}

export interface DiscountUpdate {
  name?: string
  description?: string
  discount_type?: 'percentage' | 'fixed_amount' | 'free_course'
  discount_value?: number
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  start_date?: string
  end_date?: string
  status?: 'active' | 'inactive' | 'expired' | 'scheduled'
  is_one_time_use?: boolean
  is_student_specific?: boolean
  student_ids?: number[]
  course_ids?: number[]
  coupon_code?: string
}

export interface DiscountSearchParams {
  name?: string
  discount_type?: 'percentage' | 'fixed_amount' | 'free_course'
  status?: 'active' | 'inactive' | 'expired' | 'scheduled'
  course_id?: number
  student_id?: number
  coupon_code?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export interface EnrollmentSearchParams {
  student_id?: number
  course_id?: number
  status?: string
  enrollment_date_from?: string
  enrollment_date_to?: string
  completion_date_from?: string
  completion_date_to?: string
  progress_min?: number
  progress_max?: number
  page?: number
  limit?: number
}

export interface Invoice {
  id: string
  student_id: number
  student_name?: string
  student_email?: string
  course_id?: number
  course_name?: string
  amount: number
  due_date: string
  issue_date: string
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled'
  payment_method?: string
  payment_date?: string
  paid_amount?: number
  created_at?: string
  updated_at?: string
}

export interface Notification {
  id: number
  title: string
  message: string
  type: 'Payment' | 'Achievement' | 'Reminder' | 'Welcome' | 'Course' | 'System' | 'General'
  priority: 'Low' | 'Medium' | 'High'
  recipient_id?: number
  recipient_name?: string
  recipient_email?: string
  status: 'Pending' | 'Sent' | 'Delivered' | 'Failed'
  delivery_method: 'Email' | 'Push' | 'SMS' | 'In-App'
  sent_at?: string
  delivered_at?: string
  read_at?: string
  created_at: string
  updated_at: string
  created_by?: number
  metadata?: any
}

export interface NotificationCreate {
  title: string
  message: string
  type?: 'Payment' | 'Achievement' | 'Reminder' | 'Welcome' | 'Course' | 'System' | 'General'
  priority?: 'Low' | 'Medium' | 'High'
  recipient_id?: number
  recipient_name?: string
  recipient_email?: string
  delivery_method?: 'Email' | 'Push' | 'SMS' | 'In-App'
  metadata?: any
}

export interface NotificationUpdate {
  status?: 'Pending' | 'Sent' | 'Delivered' | 'Failed'
  sent_at?: string
  delivered_at?: string
  read_at?: string
  title?: string
  message?: string
  type?: 'Payment' | 'Achievement' | 'Reminder' | 'Welcome' | 'Course' | 'System' | 'General'
  priority?: 'Low' | 'Medium' | 'High'
  metadata?: any
}

export interface NotificationSetting {
  id: number
  user_id: number
  category: string
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSettingCreate {
  user_id: number
  category: string
  email_enabled?: boolean
  push_enabled?: boolean
  sms_enabled?: boolean
}

export interface Trainer {
  id: number
  user_id?: number
  name: string
  email: string
  specialization?: string
  experience?: string
  rating: number
  students_assigned: number
  status: 'Active' | 'On Leave' | 'Inactive'
  join_date?: string
  avatar?: string
  qualifications?: string[]
  courses_teaching?: number[]
  created_at?: string
  updated_at?: string
  created_by?: number
}

export interface TrainerCreate {
  name: string
  email: string
  specialization?: string
  experience?: string
  status?: 'Active' | 'On Leave' | 'Inactive'
  join_date?: string
  avatar?: string
  qualifications?: string[]
  courses_teaching?: number[]
}

export interface TrainerUpdate {
  name?: string
  email?: string
  specialization?: string
  experience?: string
  status?: 'Active' | 'On Leave' | 'Inactive'
  join_date?: string
  avatar?: string
  qualifications?: string[]
  courses_teaching?: number[]
  rating?: number
  students_assigned?: number
}

export interface EligibleClerkUserForTrainer {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName: string
  avatarUrl?: string | null
}

export interface Partner {
  id: number
  user_id?: number
  name: string
  email: string
  country_code?: string
  phone?: string
  address?: string
  partner_code?: string
  status: 'Active' | 'Inactive'
  join_date?: string
  avatar?: string
  notes?: string
  created_at?: string
  updated_at?: string
  created_by?: number
}

export interface PartnerCreate {
  name: string
  email: string
  country_code?: string
  phone?: string
  address?: string
  partner_code?: string
  status?: 'Active' | 'Inactive'
  join_date?: string
  avatar?: string
  notes?: string
}

export interface PartnerUpdate {
  name?: string
  email?: string
  country_code?: string
  phone?: string
  address?: string
  partner_code?: string
  status?: 'Active' | 'Inactive'
  join_date?: string
  avatar?: string
  notes?: string
}

export interface EligibleClerkUserForPartner {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName: string
  avatarUrl?: string | null
}

export interface Assessment {
  id: number
  title: string
  course_id?: number
  course_name?: string
  trainer_id?: number
  trainer_name?: string
  type: 'Quiz' | 'Project' | 'Assignment' | 'Exam' | 'Other'
  duration?: string
  total_questions: number
  passing_score: number
  students_attempted: number
  average_score: number
  status: 'Draft' | 'Active' | 'Completed' | 'Archived'
  description?: string
  instructions?: string
  created_at?: string
  updated_at?: string
  created_by?: number
}

export interface AssessmentCreate {
  title: string
  course_id?: number
  course_name?: string
  trainer_id?: number
  trainer_name?: string
  type: 'Quiz' | 'Project' | 'Assignment' | 'Exam' | 'Other'
  duration?: string
  total_questions?: number
  passing_score?: number
  description?: string
  instructions?: string
  status?: 'Draft' | 'Active' | 'Completed' | 'Archived'
}

export interface AssessmentUpdate {
  title?: string
  course_id?: number
  course_name?: string
  trainer_id?: number
  trainer_name?: string
  type?: 'Quiz' | 'Project' | 'Assignment' | 'Exam' | 'Other'
  duration?: string
  total_questions?: number
  passing_score?: number
  description?: string
  instructions?: string
  status?: 'Draft' | 'Active' | 'Completed' | 'Archived'
  students_attempted?: number
  average_score?: number
}

export interface Payment {
  id: string
  invoice_id: string
  student_id: number
  student_name?: string
  amount: number
  method: string
  transaction_id: string
  date: string
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded'
  created_at?: string
  updated_at?: string
}

export interface InvoiceCreate {
  student_id: number
  course_id?: number
  amount: number
  due_date: string
  issue_date?: string
}

export interface PaymentCreate {
  invoice_id: string
  amount: number
  method: string
  transaction_id: string
  date?: string
}

class ApiClient {
  private baseUrl: string;
  private tokenGetter: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Allow setting a token getter function (for use with Clerk's useAuth hook)
  setTokenGetter(getter: () => Promise<string | null>) {
    this.tokenGetter = getter;
  }

  private serializeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'object') {
      if (data instanceof Date) {
        return data.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      }
      
      if (Array.isArray(data)) {
        return data.map(item => this.serializeData(item));
      }
      
      const serialized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip undefined values
        if (value !== undefined) {
          serialized[key] = this.serializeData(value);
        }
      }
      return serialized;
    }
    
    return data;
  }

  private async getAuthToken(): Promise<string | null> {
    // Try to get token from various sources
    try {
      // Check if we're in the browser
      if (typeof window === 'undefined') {
        return null
      }

      // Method 1: Use token getter if set (for use with Clerk's useAuth hook)
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter()
          if (token) {
            return token
          }
        } catch (error) {
          console.warn('Token getter failed:', error)
        }
      }

      // Method 2: Get token from sessionStorage (for token-based auth from URL parameter)
      const storedToken = sessionStorage.getItem('clerk_auth_token')
      if (storedToken) {
        return storedToken
      }

      // Method 3: Try to get token from Clerk cookies
      // Clerk stores JWT in cookies like __clerk_db_jwt or __clerk_db_jwt_<key>
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name && name.startsWith('__clerk_db_jwt') && value) {
            return value
          }
        }
      }
    } catch (error) {
      console.warn('Error getting auth token:', error)
    }

    console.warn('⚠️ API Client: No authentication token found')
    return null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get authentication token
    const token = await this.getAuthToken()
    
    // Serialize the body if it exists and is not FormData
    let serializedBody = options.body;
    if (options.body && typeof options.body === 'string' && !(options.body as any instanceof FormData)) {
      try {
        const parsedBody = JSON.parse(options.body);
        const serialized = this.serializeData(parsedBody);
        serializedBody = JSON.stringify(serialized);
      } catch (e) {
        console.error('Error parsing request body:', e);
        // If it's not valid JSON, keep the original body
        serializedBody = options.body;
      }
    }
    
    // Build headers with authentication
    const headers: HeadersInit = {
      // Don't set Content-Type for FormData - let the browser set it automatically
      ...(options.body && (options.body as any instanceof FormData) ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    // Add Authorization header if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const config: RequestInit = {
      headers,
      ...options,
      body: serializedBody,
    };

    try {
      
      const response = await fetch(url, config);
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('💥 API request failed:', error);
      console.error('💥 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  // Student API methods
  async getStudents(params?: StudentSearchParams): Promise<ApiResponse<Student[]>> {
    const searchParams = new URLSearchParams();
    
    // Set a higher default limit to get more students
    const limit = params?.limit || 100;
    searchParams.append('limit', limit.toString());
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'limit') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/students?${queryString}` : `/students?limit=${limit}`;
    
    return this.request<Student[]>(endpoint);
  }

  async getStudent(id: number): Promise<ApiResponse<Student>> {
    return this.request<Student>(`/students/${id}`);
  }

  async createStudent(student: StudentCreate): Promise<ApiResponse<Student>> {
    return this.request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  }

  async updateStudent(id: number, student: StudentUpdate): Promise<ApiResponse<Student>> {
    return this.request<Student>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student),
    });
  }

  async deleteStudent(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  async searchStudents(params: StudentSearchParams): Promise<ApiResponse<Student[]>> {
    // For now, use the regular students endpoint with query parameters
    // This avoids the search endpoint issues
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/students?${queryString}` : '/students';
    return this.request<Student[]>(endpoint);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/health');
  }

  // Document methods
  async getDocuments(params?: {
    student_id?: number
    document_type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.student_id) searchParams.append('student_id', params.student_id.toString())
    if (params?.document_type) searchParams.append('document_type', params.document_type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/documents?${queryString}` : '/documents'
    const response = await this.request<any>(endpoint)
    // Transform API response to match DocumentListResponse interface
    const apiData = response.data || response
    return {
      documents: apiData || [],
      total: response.count || apiData.total || 0,
      limit: apiData.limit || 100,
      offset: apiData.offset || 0
    }
  }

  async getDocument(id: number): Promise<ApiResponse<Document>> {
    const response = await this.request<Document>(`/documents/${id}/`)
    return response
  }

  async uploadDocument(
    file: File,
    studentId: number,
    documentType: string,
    notes?: string,
    isAdminUpload: boolean = false
  ): Promise<ApiResponse<DocumentUploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('student_id', studentId.toString())
    formData.append('document_type', documentType)
    if (notes) formData.append('notes', notes)
    formData.append('is_admin_upload', isAdminUpload.toString())

    const response = await this.request<DocumentUploadResponse>('/documents/upload/', {
      method: 'POST',
      body: formData,
    })
    return response
  }

  async uploadCourseImage(file: File): Promise<ApiResponse<{ url: string; path: string; filename: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    // For FormData, we need to make a direct fetch call to avoid serialization
    const url = `${this.baseUrl}/courses/upload-image`
    const token = await this.getAuthToken()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`)
    }

    const data = await response.json()
    return data
  }

  async uploadProviderLogo(file: File): Promise<ApiResponse<{ url: string; path: string; filename: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseUrl}/courses/upload-provider-logo`
    const token = await this.getAuthToken()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`)
    }

    const data = await response.json()
    return data
  }

  async updateDocument(id: number, data: DocumentUpdate): Promise<ApiResponse<Document>> {
    const response = await this.request<Document>(`/documents/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response
  }

  async verifyDocument(id: number, status: string, comments?: string, rejectionReason?: string): Promise<ApiResponse<Document>> {
    const data: any = { 
      document_id: id,
      status 
    }
    if (comments) data.comments = comments
    if (rejectionReason) data.rejection_reason = rejectionReason

    const response = await this.request<Document>(`/documents/${id}/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response
  }

  async deleteDocument(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>(`/documents/${id}/`, {
      method: 'DELETE',
    })
    return response
  }

  async downloadDocument(id: number): Promise<{ download_url: string; filename: string; expires_in: number }> {
    const response = await this.request<{ download_url: string; filename: string; expires_in: number }>(`/documents/${id}/download/`)
    // Handle both ApiResponse wrapper and direct response
    return response.data || response
  }

  // Course methods
  async getCourses(params?: CourseSearchParams): Promise<ApiResponse<Course[]>> {
    const searchParams = new URLSearchParams()
    if (params?.name) searchParams.append('name', params.name)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.course_status) searchParams.append('course_status', params.course_status)
    if (params?.page) searchParams.append('page', params.page.toString())
    // Set limit to 100 (API maximum) to get all courses, or use the provided limit
    const limit = params?.limit || 100
    searchParams.append('limit', limit.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/courses?${queryString}` : `/courses?limit=${limit}`
    
    return this.request<Course[]>(endpoint)
  }

  async getCourse(id: number): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${id}`)
  }

  async createCourse(course: CourseCreate): Promise<ApiResponse<Course>> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    })
  }

  async updateCourse(id: number, course: CourseUpdate): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    })
  }

  async deleteCourse(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/courses/${id}`, {
      method: 'DELETE',
    })
  }

  // Enrollment methods
  async getEnrollments(params?: EnrollmentSearchParams): Promise<ApiResponse<Enrollment[]>> {
    const searchParams = new URLSearchParams()
    if (params?.student_id) searchParams.append('student_id', params.student_id.toString())
    if (params?.course_id) searchParams.append('course_id', params.course_id.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.enrollment_date_from) searchParams.append('enrollment_date_from', params.enrollment_date_from)
    if (params?.enrollment_date_to) searchParams.append('enrollment_date_to', params.enrollment_date_to)
    if (params?.completion_date_from) searchParams.append('completion_date_from', params.completion_date_from)
    if (params?.completion_date_to) searchParams.append('completion_date_to', params.completion_date_to)
    if (params?.progress_min) searchParams.append('progress_min', params.progress_min.toString())
    if (params?.progress_max) searchParams.append('progress_max', params.progress_max.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    const limit = params?.limit || 100
    searchParams.append('limit', limit.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/enrollments?${queryString}` : `/enrollments?limit=${limit}`
    
    return this.request<Enrollment[]>(endpoint)
  }

  async getEnrollment(id: number): Promise<ApiResponse<Enrollment>> {
    return this.request<Enrollment>(`/enrollments/${id}`)
  }

  async createEnrollment(enrollment: EnrollmentCreate): Promise<ApiResponse<Enrollment>> {
    return this.request<Enrollment>('/enrollments', {
      method: 'POST',
      body: JSON.stringify(enrollment),
    })
  }

  async updateEnrollment(id: number, enrollment: EnrollmentUpdate): Promise<ApiResponse<Enrollment>> {
    return this.request<Enrollment>(`/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enrollment),
    })
  }

  async deleteEnrollment(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/enrollments/${id}`, {
      method: 'DELETE',
    })
  }

  // Discount methods
  async getDiscounts(params?: DiscountSearchParams): Promise<ApiResponse<Discount[]>> {
    const searchParams = new URLSearchParams()
    if (params?.name) searchParams.append('name', params.name)
    if (params?.discount_type) searchParams.append('discount_type', params.discount_type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.course_id) searchParams.append('course_id', params.course_id.toString())
    if (params?.student_id) searchParams.append('student_id', params.student_id.toString())
    if (params?.coupon_code) searchParams.append('coupon_code', params.coupon_code)
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    const limit = params?.limit || 100
    searchParams.append('limit', limit.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/discounts?${queryString}` : `/discounts?limit=${limit}`
    
    return this.request<Discount[]>(endpoint)
  }

  async getDiscount(id: number): Promise<ApiResponse<Discount>> {
    return this.request<Discount>(`/discounts/${id}`)
  }

  async createDiscount(discount: DiscountCreate): Promise<ApiResponse<Discount>> {
    return this.request<Discount>('/discounts', {
      method: 'POST',
      body: JSON.stringify(discount),
    })
  }

  async updateDiscount(id: number, discount: DiscountUpdate): Promise<ApiResponse<Discount>> {
    return this.request<Discount>(`/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discount),
    })
  }

  async deleteDiscount(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/discounts/${id}`, {
      method: 'DELETE',
    })
  }

  // Invoice methods
  async getInvoices(params?: {
    student_id?: number
    status?: string
    course_id?: number
    limit?: number
    offset?: number
  }): Promise<ApiResponse<Invoice[]>> {
    const searchParams = new URLSearchParams()
    if (params?.student_id) searchParams.append('student_id', params.student_id.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.course_id) searchParams.append('course_id', params.course_id.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/invoices?${queryString}` : '/invoices'
    return this.request<Invoice[]>(endpoint)
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return this.request<Invoice>(`/invoices/${id}`)
  }

  async createInvoice(invoice: InvoiceCreate): Promise<ApiResponse<Invoice>> {
    return this.request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    })
  }

  async updateInvoice(id: string, invoice: Partial<InvoiceCreate>): Promise<ApiResponse<Invoice>> {
    return this.request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    })
  }

  async deleteInvoice(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    })
  }

  // Payment methods
  async getPayments(params?: {
    invoice_id?: string
    student_id?: number
    status?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<Payment[]>> {
    const searchParams = new URLSearchParams()
    if (params?.invoice_id) searchParams.append('invoice_id', params.invoice_id)
    if (params?.student_id) searchParams.append('student_id', params.student_id.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/payments?${queryString}` : '/payments'
    return this.request<Payment[]>(endpoint)
  }

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${id}`)
  }

  async createPayment(payment: PaymentCreate): Promise<ApiResponse<Payment>> {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    })
  }

  async updatePayment(id: string, payment: Partial<PaymentCreate>): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payment),
    })
  }

  async deletePayment(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    })
  }

  // Purchase methods (for admin invoices)
  async getPurchases(params?: {
    user_id?: number
    status?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams()
    if (params?.user_id) searchParams.append('user_id', params.user_id.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/purchases?${queryString}` : '/purchases'
    return this.request<any[]>(endpoint)
  }

  // Notification methods
  async getNotifications(params?: {
    status?: string
    type?: string
    priority?: string
    recipient_id?: number
    limit?: number
    page?: number
  }): Promise<ApiResponse<Notification[]>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.recipient_id) searchParams.append('recipient_id', params.recipient_id.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications'
    return this.request<Notification[]>(endpoint)
  }

  async getNotification(id: number): Promise<ApiResponse<Notification>> {
    return this.request<Notification>(`/notifications/${id}`)
  }

  async createNotification(notification: NotificationCreate): Promise<ApiResponse<Notification>> {
    return this.request<Notification>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    })
  }

  async updateNotification(id: number, notification: NotificationUpdate): Promise<ApiResponse<Notification>> {
    return this.request<Notification>(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(notification),
    })
  }

  async deleteNotification(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId }),
    })
  }

  async getNotificationReadStatus(notificationIds?: number[]): Promise<ApiResponse<Record<number, string>>> {
    const searchParams = new URLSearchParams();
    if (notificationIds && notificationIds.length > 0) {
      searchParams.append('notification_ids', notificationIds.join(','));
    }
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/notifications/read-status?${queryString}` : '/notifications/read-status';
    return this.request<Record<number, string>>(endpoint);
  }

  async getNotificationReadStatusById(notificationId: number): Promise<ApiResponse<{
    notification_id: number;
    is_broadcast: boolean;
    read_by: Array<{ user_id: number; read_at: string; user: { id: number; name: string; email: string } | null }>;
    unread_by: Array<{ user_id: number; user: { id: number; name: string; email: string } }>;
    read_count: number;
    unread_count: number;
    total_recipients: number;
  }>> {
    return this.request(`/notifications/${notificationId}/read-status`);
  }

  // Notification settings methods
  async getNotificationSettings(userId?: number): Promise<ApiResponse<NotificationSetting[]>> {
    const endpoint = userId ? `/notifications/settings?user_id=${userId}` : '/notifications/settings'
    return this.request<NotificationSetting[]>(endpoint)
  }

  async saveNotificationSettings(setting: NotificationSettingCreate): Promise<ApiResponse<NotificationSetting>> {
    return this.request<NotificationSetting>('/notifications/settings', {
      method: 'POST',
      body: JSON.stringify(setting),
    })
  }

  // Trainer methods
  async getTrainers(params?: {
    status?: string
    specialization?: string
    name?: string
    email?: string
    limit?: number
    page?: number
  }): Promise<ApiResponse<Trainer[]>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.specialization) searchParams.append('specialization', params.specialization)
    if (params?.name) searchParams.append('name', params.name)
    if (params?.email) searchParams.append('email', params.email)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/trainers?${queryString}` : '/trainers'
    return this.request<Trainer[]>(endpoint)
  }

  async getTrainer(id: number): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/${id}`)
  }

  async createTrainer(trainer: TrainerCreate): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>('/trainers', {
      method: 'POST',
      body: JSON.stringify(trainer),
    })
  }

  async updateTrainer(id: number, trainer: TrainerUpdate): Promise<ApiResponse<Trainer>> {
    return this.request<Trainer>(`/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trainer),
    })
  }

  async deleteTrainer(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/trainers/${id}`, {
      method: 'DELETE',
    })
  }

  async getEligibleClerkUsersForTrainers(params?: { limit?: number }): Promise<ApiResponse<EligibleClerkUserForTrainer[]>> {
    const searchParams = new URLSearchParams()
    searchParams.append('excludeExistingTrainers', 'true')
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const endpoint = `/admin/clerk-users?${searchParams.toString()}`
    return this.request<EligibleClerkUserForTrainer[]>(endpoint)
  }

  // Partner methods
  async getPartners(params?: {
    status?: string
    name?: string
    email?: string
    limit?: number
    page?: number
  }): Promise<ApiResponse<Partner[]>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.name) searchParams.append('name', params.name)
    if (params?.email) searchParams.append('email', params.email)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    const queryString = searchParams.toString()
    const endpoint = queryString ? `/partners?${queryString}` : '/partners'
    return this.request<Partner[]>(endpoint)
  }

  async createPartner(partner: PartnerCreate): Promise<ApiResponse<Partner>> {
    return this.request<Partner>('/partners', {
      method: 'POST',
      body: JSON.stringify(partner),
    })
  }

  async updatePartner(id: number, partner: PartnerUpdate): Promise<ApiResponse<Partner>> {
    return this.request<Partner>(`/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partner),
    })
  }

  async deletePartner(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/partners/${id}`, {
      method: 'DELETE',
    })
  }

  async getEligibleClerkUsersForPartners(params?: { limit?: number }): Promise<ApiResponse<EligibleClerkUserForPartner[]>> {
    const searchParams = new URLSearchParams()
    searchParams.append('excludeExistingPartners', 'true')
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    const endpoint = `/admin/clerk-users?${searchParams.toString()}`
    return this.request<EligibleClerkUserForPartner[]>(endpoint)
  }

  // Assessment methods
  async getAssessments(params?: {
    status?: string
    type?: string
    trainer_id?: number
    course_id?: number
    title?: string
    limit?: number
    page?: number
  }): Promise<ApiResponse<Assessment[]>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.trainer_id) searchParams.append('trainer_id', params.trainer_id.toString())
    if (params?.course_id) searchParams.append('course_id', params.course_id.toString())
    if (params?.title) searchParams.append('title', params.title)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/assessments?${queryString}` : '/assessments'
    return this.request<Assessment[]>(endpoint)
  }

  async getAssessment(id: number): Promise<ApiResponse<Assessment>> {
    return this.request<Assessment>(`/assessments/${id}`)
  }

  async createAssessment(assessment: AssessmentCreate): Promise<ApiResponse<Assessment>> {
    return this.request<Assessment>('/assessments', {
      method: 'POST',
      body: JSON.stringify(assessment),
    })
  }

  async updateAssessment(id: number, assessment: AssessmentUpdate): Promise<ApiResponse<Assessment>> {
    return this.request<Assessment>(`/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assessment),
    })
  }

  async deleteAssessment(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/assessments/${id}`, {
      method: 'DELETE',
    })
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient(API_BASE_URL);
