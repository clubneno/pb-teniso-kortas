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

### Reservation Management
- Real-time availability checking
- Time slot conflict prevention
- Status tracking (pending, confirmed, cancelled)
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