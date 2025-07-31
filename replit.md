# Tennis Court Reservation System

## Overview
This is a full-stack tennis court reservation system built to allow users to view available courts, make reservations, and provide an administrative interface for managing courts and bookings. The system integrates with Replit authentication and sends email notifications. Its business vision is to provide a seamless and efficient online booking experience for tennis enthusiasts, increasing court utilization and simplifying management for facility owners.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom tennis theme colors
- **PWA**: Implemented with offline support, installable mobile app experience, and custom icons.

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM
- **Authentication**: Local email/password authentication system
- **Session Management**: Express sessions with PostgreSQL store
- **Email Service**: Resend for transactional emails

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**: `sessions`, `users`, `courts`, `reservations`, `maintenance_periods`

### Core Features
- **Authentication System**: Email/password based, role-based access control (admin/regular user), session persistence.
- **Reservation Management**: Real-time availability checking, time slot conflict prevention, status tracking (confirmed, cancelled), price calculation, email confirmation system, multi-slot selection, and reservation time restrictions (max 120 minutes, consecutive slots).
- **User Interface**: Responsive design with mobile-first approach, custom calendar, time slot grid with visual availability indicators, role-based dashboard routing, and toast notifications.
- **Administrative Features**: Court management (create, update, deactivate), reservation oversight and status management, user administration (create, edit, delete with active reservation protection), comprehensive maintenance management system with CRUD operations and automatic reservation cancellation for conflicting bookings, email testing functionality, and a forgot password system.
- **SEO**: Comprehensive SEO optimization including canonical tags, meta descriptions, Open Graph tags, structured data, XML sitemap, robots.txt, and dynamic SEO management.
- **Branding**: Consistent use of custom tennis ball SVG icon and tennis green color scheme across all pages, favicons, and PWA icons.

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Email**: Resend API for transactional emails
- **Hosting**: Replit deployment environment

### Development Tools
- **TypeScript**: For type safety
- **ESLint/Prettier**: For code quality and formatting
- **Vite**: For fast development and optimized builds