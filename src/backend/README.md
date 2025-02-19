# Random Word Generator - Backend Service

## Overview

Enterprise-grade backend service for the Random Word Generator application, providing secure and scalable word generation, validation, and user management capabilities. Built with Node.js, TypeScript, and a microservices architecture.

### Key Features

- Intelligent word generation with complexity analysis
- Multi-language support (English, Spanish, French, German)
- High-performance dictionary validation
- Real-time user progress tracking
- Comprehensive monitoring and observability
- Enterprise-grade security implementation

## Technical Stack

### Core Technologies
- Node.js (>=18.0.0)
- TypeScript (^5.0.0)
- Express.js (^4.18.0)
- PostgreSQL (15+)
- Redis (7.0+)
- MongoDB (^5.0.0)

### Key Dependencies
- FastAPI (^0.100.0) - API development
- Auth0 (^3.0.0) - Authentication
- Winston (^3.8.2) - Logging
- Datadog (^3.15.0) - APM
- Sentry (^7.0.0) - Error tracking
- Prometheus (^14.2.0) - Metrics

## Getting Started

### Prerequisites

```bash
# Required software versions
Node.js >= 18.0.0
PostgreSQL >= 15.0
Redis >= 7.0
MongoDB >= 5.0
```

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file with the following required variables:

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_SSL=false
REDIS_URL=redis://localhost:6379
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret
OXFORD_API_KEY=your-api-key
OXFORD_APP_ID=your-app-id
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

## Architecture

### Component Overview
- API Gateway - Request routing and security
- Word Generation Service - Core word processing
- Dictionary Service - Word validation and definitions
- User Service - Profile and progress management
- Cache Service - Performance optimization
- Monitoring Service - System observability

### Performance Targets
- Word generation: < 2 seconds
- Dictionary validation: < 500ms
- Total response time: < 2 seconds
- Support for 100+ concurrent users

## API Documentation

### Core Endpoints

#### Word Generation
```http
POST /api/v1/words/generate
Content-Type: application/json

{
  "characters": "string",
  "language": "en",
  "minLength": 2,
  "maxLength": 15
}
```

#### Word Validation
```http
POST /api/v1/words/validate
Content-Type: application/json

{
  "word": "string",
  "language": "en"
}
```

#### User Progress
```http
PUT /api/v1/users/:userId/progress
Content-Type: application/json

{
  "wordsFound": number,
  "successRate": number,
  "level": number
}
```

## Development

### Available Scripts

```bash
# Development
npm run dev         # Start development server
npm run build      # Build TypeScript
npm run test       # Run test suite
npm run lint       # Run linting
npm run format     # Format code

# Production
npm start          # Start production server
npm run migrate    # Run database migrations
npm run seed       # Seed database
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- --grep "Word Generation"
```

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t word-generator-backend .

# Run container
docker run -p 3000:3000 word-generator-backend
```

### Kubernetes Deployment

```bash
# Apply configuration
kubectl apply -f k8s/

# Check status
kubectl get pods -n word-generator
```

## Monitoring

### Health Checks

- `/health` - System health status
- `/health/live` - Kubernetes liveness probe
- `/health/ready` - Kubernetes readiness probe

### Metrics

- Prometheus metrics at `/metrics`
- Datadog APM integration
- Sentry error tracking
- ELK stack for logging

## Security

- JWT authentication
- Rate limiting
- Input validation
- XSS protection
- CSRF protection
- Secure headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details