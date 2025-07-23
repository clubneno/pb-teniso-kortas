# Tennis Court Reservation System

## Overview

This is a full-stack tennis court reservation system built with React, Express, and PostgreSQL. The application allows users to view available courts, make reservations, and provides an administrative interface for managing courts and bookings. The system features Replit authentication integration and email notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom tennis theme colors

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Email Service**: Resend for transactional emails

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**:
  - `sessions` - Session storage for local authentication
  - `users` - User profiles with email-based authentication (username field removed)
  - `courts` - Tennis court information and pricing
  - `reservations` - Booking records with user and court relationships

## Key Components

### Authentication System
- Email/password based authentication (local auth system)
- User registration and login with email validation
- Role-based access control (admin/regular user) 
- Session persistence with PostgreSQL storage
- Username field removed from system (2025-07-21)
- Fixed user greeting to display firstName properly (2025-07-21)
- Reservation system fully operational with proper validation (2025-07-21)
- Updated all toast messages from "Sėkmė!" to "Pakeitimas išsaugotas" (2025-07-21)
- Fixed time slot availability display bug - reserved slots now show properly (2025-07-21)
- Corrected app branding consistency between Landing and Dashboard pages (2025-07-21)
- Fixed logout functionality to properly end session and redirect to landing page (2025-07-21)
- Implemented custom confirmation dialog for reservation cancellation (2025-07-21)
- Added reservation sorting by date/time for better user experience (2025-07-21)
- Enhanced time slot grid to show "Užimta" status for reserved slots (2025-07-21)
- Updated TimeSlotGrid to display comprehensive reservation data across all courts (2025-07-21)
- Added visual indicators for partial availability when some courts are reserved (2025-07-21)
- Fixed timezone issues with Europe/Vilnius implementation (2025-07-21)
- Reset test account passwords - Admin: admin@example.com/admin123, User: user@example.com/user123 (2025-07-21)
- Fixed admin reservations page to properly display all database reservations with working filters (2025-07-22)
- Updated admin branding to match landing page with "PB teniso kortas" name and volleyball icon (2025-07-22)
- Removed unnecessary "Recent Activity" and "Today's Reservations" sections from admin interface (2025-07-22)
- Added visual distinction for past vs upcoming reservations with darker background for completed reservations (2025-07-22)
- Removed pending status from reservation system - all reservations are now automatically confirmed without admin approval required (2025-07-22)
- Fixed HTML language attribute to "lt" for proper Lithuanian calendar display in date inputs (2025-07-22)
- Implemented custom Lithuanian DatePicker component to replace native browser date inputs for guaranteed Lithuanian display (2025-07-22)
- Added functional admin reservation management buttons: status toggle (confirmed/cancelled) and permanent deletion with confirmations (2025-07-22)
- Implemented admin reservation creation functionality allowing administrators to make reservations on behalf of users with full validation and email notifications (2025-07-22)
- Fixed admin reservation creation to use time slot selection instead of separate start/end time fields for easier UX (2025-07-22)
- Fixed court selection in admin modal to fetch actual courts from database ("Kortas #PB") instead of hardcoded options (2025-07-22)
- Added totalPrice calculation in admin reservation creation to resolve validation errors and ensure proper data persistence (2025-07-22)
- Enhanced admin reservation modal with real-time availability checking showing "(Užimta)" for reserved slots and conflict prevention (2025-07-22)
- Added separate operating hours configuration for workdays (Monday-Friday) and weekends (Saturday-Sunday) in admin settings (2025-07-22)
- Fixed admin reservation time slot generation to respect configured operating hours instead of hardcoded 8:00-21:00 schedule (2025-07-22)
- Added tennis court background image to Landing page hero section with proper overlay for text readability (2025-07-22)
- Implemented custom favicon using tennis icon in brand colors (green background with white tennis icon) (2025-07-22)
- Created custom tennis ball SVG icon with realistic curved seam lines and texture details (2025-07-22)
- Updated all page branding to use custom tennis ball icon across Landing, Dashboard, and Admin pages (2025-07-22)
- Integrated user-provided professional tennis ball SVG design with site's tennis green color scheme (#2e6b4a) (2025-07-23)
- Updated favicon to use the new authentic tennis ball design instead of custom-made version (2025-07-23)
- Replaced Trophy icon with tennis ball icon in auth page for consistent branding across all pages (2025-07-23)
- Fixed all remaining LSP type errors for better code quality (2025-07-23)
- Changed time slots from 60-minute to 90-minute intervals while maintaining all existing functionality (2025-07-23)
- Updated pricing calculation to charge 1.5 hours for each 90-minute slot (2025-07-23)
- Fixed timezone issue causing today's future reservations to appear as past reservations (2025-07-23)
- Updated reservation filtering logic to properly work with Europe/Vilnius timezone (2025-07-23)
- Added chronological sorting to admin reservations panel displaying earliest dates/times first (2025-07-23)
- Added www subdomain redirect middleware to handle both www and non-www domains (2025-07-23)
- Implemented comprehensive SEO optimization with canonical tags, meta descriptions, Open Graph tags, and structured data (2025-07-23)
- Added dynamic SEO management system using useSEO hook for page-specific optimization (2025-07-23)
- Created XML sitemap and robots.txt for search engine optimization (2025-07-23)
- Enhanced all pages with Lithuanian-language SEO content and proper meta tags (2025-07-23)
- Updated URL structure to use Lithuanian paths: /auth → /prisijungimas, /dashboard → /savitarna with proper SEO maintenance (2025-07-23)
- Cleared all test reservations from database for clean production deployment (2025-07-23)
- Changed time slots from 90-minute to 30-minute intervals while maintaining all existing functionality (2025-07-23)
- Updated pricing calculation to charge 0.5 hours for each 30-minute slot (2025-07-23)
- Added multi-slot selection functionality allowing users to select multiple consecutive 30-minute time slots for extended reservations (2025-07-23)
- Fixed critical availability bug where existing reservations weren't showing as reserved due to incorrect time overlap detection (2025-07-23)
- Fixed cache invalidation issue where cancelled reservations weren't immediately reflected in time slot display (2025-07-23)
- Added reservation time restrictions: maximum 120 minutes duration and consecutive slots only requirement (2025-07-23)
- Updated pricing system to properly handle 30-minute slot rates throughout the application (2025-07-23)
- Made admin pricing field editable for 30-minute slot rates with automatic conversion to hourly rates for database storage (2025-07-23)
- Fixed pricing display consistency across Landing, Dashboard, and Admin pages to show actual 30-minute slot prices (2025-07-23)
- Increased admin reservation modal size (max-w-4xl, max-h-95vh) for better date picker visibility (2025-07-23)
- Added complete user management functionality: create, edit, and delete users with full admin controls (2025-07-23)
- Implemented user deletion with cascade deletion of associated reservations and confirmation dialogs (2025-07-23)
- Cleaned up test accounts as requested: removed user123, admin123, and user_1753271942891_bebhnk (2025-07-23)

### Reservation Management
- Real-time availability checking
- Time slot conflict prevention
- Status tracking (confirmed, cancelled)
- Price calculation based on court hourly rates
- Email confirmation system

### User Interface
- Responsive design with mobile-first approach
- Custom calendar component for date selection
- Time slot grid with visual availability indicators
- Role-based dashboard routing (admin vs user views)
- Toast notifications for user feedback

### Administrative Features
- Court management (create, update, deactivate)
- Reservation oversight and status management
- User administration capabilities
- Revenue and booking analytics

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit OAuth → Session created → User profile retrieved/created
2. **Reservation Flow**: User selects date/court → Available slots fetched → Reservation created → Email confirmation sent
3. **Admin Flow**: Admin views all reservations → Can modify statuses → Email notifications sent on changes
4. **Public Flow**: Anonymous users can view court availability without authentication

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Local email/password authentication system
- **Email**: Resend API for transactional emails
- **Hosting**: Designed for Replit deployment environment

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting
- **Vite**: Fast development server and optimized builds

## Deployment Strategy

### Production Build Process
1. Frontend built with Vite to static assets
2. Backend compiled with ESBuild to Node.js bundle
3. Database schema applied via Drizzle migrations
4. Environment variables configured for database and external services

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required)
- `REPL_ID`: Replit environment identifier (required for auth)
- `RESEND_API_KEY`: Email service API key (optional)
- `FROM_EMAIL`: Sender address for notifications (optional)

### Deployment Considerations
- Uses Replit-specific plugins for development (cartographer, error overlay)
- Session storage requires PostgreSQL connection
- Email service gracefully degrades if not configured
- Static assets served from Express in production
- WebSocket constructor configured for Neon serverless compatibility

The application follows a monorepo structure with shared TypeScript types between client and server, ensuring type safety across the full stack. The architecture prioritizes developer experience with hot reloading, comprehensive error handling, and integrated tooling.