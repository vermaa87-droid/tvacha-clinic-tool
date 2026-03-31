# Tvacha Clinic Tool

A complete Next.js web application for **Tvacha Clinic Tool** — a B2B SaaS platform for dermatologists and GP clinics in India. This is a clinic management + AI pre-screening tool.

## Features

✅ **Landing Page** - Premium landing page with hero, features, pricing, and social proof
✅ **Authentication** - Login and signup pages with form validation
✅ **Dashboard** - Complete clinic management dashboard with sidebar navigation
✅ **Case Queue** - AI-screened case management with earnings system
✅ **Patient Management** - Track linked patients and their treatment progress
✅ **Appointments** - Schedule and manage clinic appointments
✅ **Prescription Templates** - Pre-built templates for common conditions
✅ **Analytics** - Comprehensive clinic analytics and performance tracking
✅ **Settings** - Profile management and subscription tracking

## Design System

- **Premium, warm color palette** - Earthy tones (gold, bronze, cream)
- **Typography** - Cormorant Garamond for headings, Outfit for body, JetBrains Mono for data
- **Components** - Fully functional UI components (Button, Card, Input, Modal, Badge)
- **Responsive Design** - Desktop-first, mobile-friendly

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS with custom theme
- **Charts**: Recharts for analytics
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Database Ready**: API routes prepared for mock data (easily replaceable with real backend)

## Project Structure

```
tvacha-clinic/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── pricing/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Dashboard home
│   │   ├── cases/page.tsx      # Case queue
│   │   ├── patients/page.tsx   # My patients
│   │   ├── appointments/page.tsx
│   │   ├── prescriptions/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── layout/                 # Layout components (Sidebar, TopBar, Logo, Footer)
│   ├── landing/                # Landing page sections
│   └── dashboard/              # Dashboard-specific components
├── lib/
│   ├── mock-data.ts           # Sample data
│   ├── constants.ts            # App constants
│   └── utils.ts                # Helper functions
├── public/
│   └── logo.svg
└── tailwind.config.js

```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn installed

### Installation

1. Navigate to the project directory:
   ```bash
   cd "c:\Tvacha Clinic Tool\tvacha-clinic"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### For Production

Build and start:
```bash
npm run build
npm start
```

## Pages & Features

### Public Pages
- **Landing Page** (`/`) - Hero, features, pricing, CTA
- **Pricing** (`/pricing`) - Pricing table, FAQ, ROI calculator
- **Login** (`/login`) - Demo credentials available
- **Signup** (`/signup`) - Complete registration form

### Dashboard Pages (Protected)
- **Dashboard Home** (`/dashboard`) - Overview with earnings, case queue, charts
- **Case Queue** (`/dashboard/cases`) - AI cases to review, filterable by type
- **My Patients** (`/dashboard/patients`) - Linked patients with progress tracking
- **Appointments** (`/dashboard/appointments`) - Appointment scheduling and management
- **Prescriptions** (`/dashboard/prescriptions`) - Template library and management
- **Analytics** (`/dashboard/analytics`) - Revenue trends, disease distribution, stats
- **Settings** (`/dashboard/settings`) - Profile, subscription, notifications

## Key Features Implemented

### AI Case Queue
- Filter cases by type (Fungal, Bacterial, Complex, Flagged)
- AI confidence score and severity levels
- Prescription template selection on approval
- Earn ₹200 per case

### Patient Management
- Track treatment progress (0-100%)
- View patient photo timeline
- Monitor incoming prescriptions
- Patient messaging interface

### Clinic Analytics
- Monthly revenue trend chart
- Disease distribution pie chart
- Treatment success rate
- Case type breakdown
- Performance metrics

### Mock Data
- 12 sample AI cases
- 10 linked patients with photo timelines
- 5 prescription templates
- 30 days of analytics data
- 5 upcoming appointments

## Customization

### Colors
Edit `tailwind.config.js` to customize the color palette. Current colors:
- Primary: `#b8936a` (warm gold)
- Background: `#faf8f4` (cream)
- Text Primary: `#1a1612` (deep black)

### Fonts
Fonts are imported from Google Fonts:
- Headings: Cormorant Garamond
- Body: Outfit
- Data/Code: JetBrains Mono

### Mock Data
Replace mock data in `lib/mock-data.ts` with real API calls once backend is ready.

## API Routes (Ready for Backend Integration)

The app is structured to easily connect to real APIs:
- `/api/auth/*` - Authentication
- `/api/cases` - Case management
- `/api/patients` - Patient data
- `/api/prescriptions` - Prescription templates
- `/api/appointments` - Appointment CRUD
- `/api/analytics` - Dashboard stats

## Demo Account

- **Email**: demo@tvachaclinic.com
- **Password**: (any password during demo)

Login redirects to dashboard automatically.

## Pricing

- **Plan**: Professional - ₹2,000/month
- **Free Trial**: 2 weeks, no credit card required
- **Features**: Unlimited patients, AI pre-screening, templates, analytics

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Next.js optimized with Image optimization
- Tailwind CSS for minimal CSS output
- Responsive charts that adapt to screen size
- Server-side rendering for landing pages

## Security Considerations

- Implement NextAuth.js for real authentication
- Use HTTPS in production
- Validate all form inputs on the server
- Implement rate limiting on API routes
- Store sensitive data securely

## Future Enhancements

- [ ] Real authentication with NextAuth.js
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Real-time notifications with WebSockets
- [ ] Video consultation integration
- [ ] Payment gateway (Razorpay)
- [ ] Mobile app for patients
- [ ] AI integration with FastAPI backend
- [ ] Export reports (PDF/Excel)
- [ ] Multi-clinic support
- [ ] Role-based access control

## Support & Documentation

For issues, questions, or feature requests, please refer to the code comments and component documentation within each file.

## License

© 2026 Tvacha Clinic. A product of NIDAAN — National Intelligent Diagnosis & Analysis Network

---

**Built with ❤️ for Indian dermatologists**
