// Configuration for cross-app integration with Clerk
export const config = {
  // Portfolio App URL
  portfolioAppUrl: process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://edtec.online' 
      : 'http://localhost:5173'),
  
  // Student Management System URL
  studentManagementSystemUrl: process.env.NEXT_PUBLIC_STUDENT_MANAGEMENT_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://sms.edtec.online'
      : 'http://localhost:3000'),
}

