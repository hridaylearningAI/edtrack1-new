# EdTec Student Management System - Frontend

A modern, responsive student management system built with Next.js 15, React 19, and Tailwind CSS. This application provides an intuitive interface for managing student data, courses, assessments, and administrative tasks.

## 🚀 Features

### Admin Dashboard
- **Student Management**: View, add, edit, and delete student records
- **Trainer Management**: Manage trainer profiles and assignments
- **Course Management**: Handle course creation, updates, and enrollment
- **Progress Tracking**: Monitor student progress and performance
- **Reports & Analytics**: Generate comprehensive reports and insights
- **CRM System**: Customer relationship management for student interactions
- **Document Management**: Centralized document storage and organization
- **Email Campaigns**: Automated email communication system
- **Invoice Management**: Financial tracking and billing
- **Discount Management**: Configure and apply student discounts
- **Certificate Management**: Issue and track student certificates
- **Notifications**: Real-time notification system

### Student Portal
- **Dashboard**: Personalized student overview
- **Current Units**: View and track current course units
- **Completed Units**: Access completed coursework and grades
- **Assessments**: Submit and track assessment progress
- **Certificates**: View earned certificates and achievements
- **Financial Information**: Access billing and payment details
- **Quick Actions**: Common tasks and shortcuts

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4.1.9
- **Component Library**: Radix UI (comprehensive set of accessible components)
- **Icons**: Tabler Icons, Lucide React
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **Theming**: Next-themes for dark/light mode support
- **Date Handling**: date-fns and react-day-picker
- **State Management**: React hooks and context

## 📦 Dependencies

### Core Dependencies
- Next.js 15.2.4 - React framework
- React 19 - UI library
- TypeScript 5 - Type safety
- Tailwind CSS 4.1.9 - Utility-first CSS framework

### UI Components
- Radix UI - Accessible component primitives
- Lucide React - Icon library
- Tabler Icons - Additional icon set
- Framer Motion - Animation library

### Forms & Validation
- React Hook Form - Form handling
- Zod - Schema validation
- @hookform/resolvers - Form validation integration

### Utilities
- clsx - Conditional CSS classes
- class-variance-authority - Component variants
- tailwind-merge - Tailwind class merging
- date-fns - Date manipulation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd edtec-student-management-system
```

2. **Install dependencies**
```bash
pnpm install
# or
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Run the development server**
```bash
pnpm dev
# or
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
edtec-student-management-system/
├── 📁 app/                          # Next.js App Router
│   ├── 📁 admin/                    # Admin dashboard routes
│   │   ├── students/                # Student management
│   │   ├── trainers/                # Trainer management
│   │   ├── courses/                 # Course management
│   │   ├── progress/                # Progress tracking
│   │   ├── reports/                 # Reports and analytics
│   │   ├── crm/                     # Customer relationship management
│   │   ├── documents/               # Document management
│   │   ├── email-campaign/          # Email campaigns
│   │   ├── invoices/                # Invoice management
│   │   ├── notifications/           # Notification system
│   │   ├── discounts/               # Discount management
│   │   ├── certificates/            # Certificate management
│   │   └── enrolment/               # Student enrollment
│   ├── 📁 student/                  # Student portal routes
│   │   ├── assessments/             # Assessment management
│   │   ├── certificates/            # Student certificates
│   │   ├── completed-units/         # Completed coursework
│   │   ├── current-units/           # Current coursework
│   │   ├── financial/               # Financial information
│   │   └── quick-actions/           # Quick access actions
│   ├── 📁 login/                    # Authentication
│   ├── 📁 demo/                     # Demo pages
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
├── 📁 components/                    # Reusable components
│   ├── 📁 admin/                    # Admin-specific components
│   ├── 📁 student/                  # Student-specific components
│   ├── 📁 ui/                       # UI component library
│   └── theme-provider.tsx           # Theme context
├── 📁 lib/                          # Utility functions
│   └── utils.ts                     # Common utilities
├── 📁 public/                       # Static assets
│   └── 📁 images/                   # Image assets
├── 📁 styles/                       # Additional styles
├── components.json                   # Component configuration
├── tailwind.config.js               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

## 🎨 UI Components

The project includes a comprehensive set of UI components built with Radix UI primitives and styled with Tailwind CSS:

- **Navigation**: Sidebar, navigation menu, breadcrumbs
- **Data Display**: Tables, cards, badges, progress bars
- **Forms**: Inputs, selects, checkboxes, radio buttons
- **Feedback**: Alerts, toasts, modals, tooltips
- **Layout**: Grids, containers, separators
- **Charts**: Various chart types for data visualization

## 🔧 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🌐 API Integration

This frontend is designed to work with the [EdTec Student Management System API](https://github.com/your-org/edtec-student-management-system-api) built with Flask. The API provides:

- Student CRUD operations
- Course management
- Assessment tracking
- User authentication
- Data analytics

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Configure build settings for Next.js
- **AWS Amplify**: Connect repository and configure build
- **Docker**: Use the provided Dockerfile

## 🔒 Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# External Services
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your-ga-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Implement responsive design
- Ensure accessibility compliance
- Write meaningful commit messages
- Test components thoroughly

## 🐛 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Build errors**
   ```bash
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

3. **TypeScript errors**
   ```bash
   pnpm lint
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Roadmap

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Integration with external LMS systems
- [ ] Automated assessment grading
- [ ] Student performance predictions

---

**Built with ❤️ for EdTec**