# Overview

"Quero Sair" is a Portuguese parking communication app designed to resolve parking conflicts peacefully in Lisbon. The system allows users to communicate with drivers blocking their vehicles through QR codes and notifications instead of aggressive honking. Users register their vehicles, generate QR codes for display, and can scan other vehicles' QR codes to send exit requests.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript SPA** using Vite for build tooling and hot module replacement
- **shadcn/ui component library** with Radix UI primitives for accessible, customizable components
- **Tailwind CSS** for utility-first styling with CSS variables for theming
- **TanStack Query** for server state management and caching
- **React Hook Form + Zod** for form validation and type-safe schemas
- **Wouter** for lightweight client-side routing

## Progressive Web App (PWA)
- **Service Worker** for offline caching and push notifications
- **Web App Manifest** configured for mobile installation
- **Camera API integration** for QR code scanning functionality
- **Share API** for QR code sharing capabilities

## Backend Architecture
- **Express.js REST API** with TypeScript
- **Replit Authentication** using OpenID Connect for user management
- **WebSocket integration** for real-time notifications between users
- **Session-based authentication** with PostgreSQL session storage

## Database Design
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Neon serverless PostgreSQL** as the database provider
- **Schema includes**:
  - Users table for authentication data
  - Vehicles table linking users to their registered cars/motorcycles
  - Parking sessions for tracking blocking incidents
  - Exit requests for communication between drivers
  - Sessions table for authentication state

## Real-time Communication
- **WebSocket server** for instant notification delivery
- **Event-driven architecture** for parking session management
- **Push notifications** for mobile engagement

## Development Tooling
- **Shared schema validation** between client and server using Zod
- **Path aliases** for clean imports (@/, @shared/, @assets/)
- **Hot module replacement** in development with Vite
- **ESBuild** for production server bundling

# External Dependencies

## Database & ORM
- **Neon Database** - Serverless PostgreSQL hosting
- **Drizzle ORM** - Type-safe database queries and migrations
- **connect-pg-simple** - PostgreSQL session store for Express

## Authentication & Security
- **Replit Auth** - OpenID Connect authentication provider
- **Passport.js** - Authentication middleware
- **Express Sessions** - Session management with PostgreSQL storage

## Frontend Libraries
- **Radix UI** - Headless accessible component primitives
- **shadcn/ui** - Pre-built component library
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling and validation
- **Zod** - Runtime type validation
- **Wouter** - Lightweight React router

## Real-time & Communication
- **WebSocket (ws)** - Real-time bidirectional communication
- **QRCode library** - QR code generation for vehicle identification

## Utilities & Tooling
- **date-fns** - Date manipulation utilities
- **clsx + tailwind-merge** - Conditional CSS class management
- **Lucide React** - Icon library
- **Vite** - Build tool and development server

## Mobile & PWA
- **Native Web APIs** - Camera, Share, Service Worker for PWA functionality
- **PWA manifest** - Mobile app installation and theming