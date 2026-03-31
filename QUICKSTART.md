# Quick Start Guide — Tvacha Clinic Tool

## 🚀 Get Running in 3 Steps

### Step 1: Install Dependencies
```bash
cd "c:\Tvacha Clinic Tool\tvacha-clinic"
npm install
```

This will install all required packages:
- next.js
- react
- tailwind css
- recharts
- lucide-react
- react-hook-form

⏱️ **Takes 2-3 minutes** (depending on internet speed)

### Step 2: Start Development Server
```bash
npm run dev
```

You should see:
```
 ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local
```

### Step 3: Open in Browser
- Go to http://localhost:3000
- You'll see the beautiful landing page!

## 🔗 Navigation Guide

### Public Pages (No Login Required)
- **Home**: http://localhost:3000/
- **Pricing**: http://localhost:3000/pricing
- **Login**: http://localhost:3000/login
- **Signup**: http://localhost:3000/signup

### Demo Access
- **Email**: `demo@tvachaclinic.com`
- **Password**: `any password` (demo mode)
- Click "Sign In" on login page to go to dashboard

### Dashboard Pages (After Login)
- **Dashboard**: http://localhost:3000/dashboard
- **Case Queue**: http://localhost:3000/dashboard/cases
- **Patients**: http://localhost:3000/dashboard/patients
- **Appointments**: http://localhost:3000/dashboard/appointments
- **Prescriptions**: http://localhost:3000/dashboard/prescriptions
- **Analytics**: http://localhost:3000/dashboard/analytics
- **Settings**: http://localhost:3000/dashboard/settings

## 📱 What to Explore

### 1. Land on Home Page
- Beautiful hero section with desktop mockup
- Feature cards
- Pricing table
- Testimonials
- Call-to-action buttons

### 2. Try the Case Queue
- See AI-screened patient cases
- Filter by condition type
- View AI confidence scores
- Select prescription template
- Earn simulation ₹200/case

### 3. Check Analytics
- Monthly revenue trends
- Disease distribution
- Patient success rates
- Real-time charts

### 4. Configure Settings
- View and edit doctor profile
- Copy referral code
- Check subscription status
- Manage notifications

## 🎨 Design Features Included

✅ Premium warm color palette (gold, bronze, cream)
✅ Custom Tailwind theme
✅ Google Fonts: Cormorant Garamond, Outfit, JetBrains Mono
✅ Responsive design (desktop-first)
✅ Smooth animations and transitions
✅ Professional shadows and borders
✅ Paper grain texture overlay

## 🔧 Development

### File Structure Key Files

**Layouts**
- `app/layout.tsx` - Root layout
- `app/dashboard/layout.tsx` - Dashboard with sidebar

**Pages**
- `app/page.tsx` - Landing
- `app/login/page.tsx` - Auth
- `app/dashboard/page.tsx` - Overview

**Components**
- `components/ui/` - Buttons, Cards, Modals
- `components/layout/` - Sidebar, TopBar, Logo
- `components/landing/` - Hero, Features, Pricing

**Data**
- `lib/mock-data.ts` - Sample data (12 cases, 10 patients, etc.)
- `lib/constants.ts` - Disease list, templates, etc.
- `lib/utils.ts` - Helper functions (formatCurrency, cn, etc.)

**Styling**
- `app/globals.css` - Global Tailwind + custom styles
- `tailwind.config.js` - Custom theme colors

### Hot Reload
Changes to files are automatically reflected in the browser. Just edit and save!

## 📊 Mock Data Overview

**Cases**: 12 patient cases (fungal, bacterial, complex, etc.)
**Patients**: 10 linked patients with photo timelines
**Templates**: 5 prescription templates (tinea, eczema, acne, psoriasis, dermatitis)
**Analytics**: 7 months of earnings data
**Appointments**: 5 upcoming appointments

All data is realistic and ready for production API integration.

## 🛠️ Customization Quick Wins

### Change Colors
Edit `tailwind.config.js` colors section:
```js
colors: {
  primary: {
    500: "#b8936a",  // Change primary accent
  },
  // ...
}
```

### Modify Prescription Templates
Edit `lib/constants.ts` PRESCRIPTION_TEMPLATES array.

### Add More Cases
Edit `lib/mock-data.ts` mockCases array.

### Update Doctor Profile
Edit `lib/mock-data.ts` doctorProfile object.

## 🚢 Deployment

When ready to deploy:

### To Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### To Other Platforms
```bash
npm run build
npm start
```

## 🐛 Troubleshooting

**Q: Port 3000 already in use?**
```bash
npm run dev -- -p 3001
```
Then go to http://localhost:3001

**Q: Node modules issues?**
```bash
rm -r node_modules package-lock.json
npm install
```

**Q: Tailwind classes not showing?**
Make sure src doesn't exist in root (we use App Router without src/)

## 📚 Next Steps

1. ✅ Get the app running
2. ✅ Explore all pages
3. ✅ Test case queue functionality
4. ✅ Check analytics charts
5. ✨ Customize branding & colors
6. 🔌 Connect to real backend API
7. 🔐 Implement real authentication
8. 💾 Add database

## 📞 Support

Check the README.md for detailed documentation.

---

**Happy coding! 🚀**
