# Random Word Generator Web Frontend

A modern, scalable web frontend application for generating random words from character inputs, built with React, TypeScript, and TailwindCSS.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker >= 24.0.0
- Git >= 2.0.0

## Technology Stack

- React 18.2.0
- TypeScript 5.0+
- TailwindCSS 3.3.0
- Redux Toolkit 1.9.0
- React Query 4.0.0
- Jest 29.6.0
- Playwright 1.39.0

## Getting Started

### Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd random-word-generator/src/web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Docker Development Setup

1. Build and start the container:
```bash
docker-compose up --build
```

The application will be available at `http://localhost:5173`.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types

### Code Style Guide

- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error boundaries
- Follow React Query patterns for data fetching
- Use proper TypeScript types and interfaces
- Implement proper accessibility standards

### Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable components
├── config/          # Configuration files
├── features/        # Feature-based modules
├── hooks/           # Custom React hooks
├── i18n/            # Internationalization
├── layouts/         # Layout components
├── lib/            # Utility libraries
├── pages/          # Page components
├── services/       # API services
├── store/          # Redux store
├── styles/         # Global styles
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Testing

### Unit Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Testing

```bash
# Run Playwright tests
npx playwright test

# Run tests with UI
npx playwright test --ui
```

## Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

### Docker Production Build

```bash
# Build production image
docker build -t word-generator-web:latest .

# Run production container
docker run -p 80:80 word-generator-web:latest
```

## Performance Optimization

- Implement code splitting and lazy loading
- Optimize images and assets
- Use proper caching strategies
- Implement proper bundle optimization
- Monitor and optimize React rendering

## Security

- Implement proper authentication flow
- Use secure HTTP headers
- Implement proper CORS policies
- Follow security best practices
- Regular dependency updates

## Internationalization

The application supports multiple languages through i18next:

- Configure languages in `src/i18n/config.ts`
- Add translations in `public/locales/{lang}/translation.json`
- Use translation hooks: `useTranslation()`

## Troubleshooting

### Common Issues

1. **Development server not starting**
   - Check Node.js version
   - Clear npm cache
   - Delete node_modules and reinstall

2. **Build failures**
   - Check TypeScript errors
   - Update dependencies
   - Clear build cache

3. **Docker issues**
   - Check Docker logs
   - Verify Docker configuration
   - Check resource limits

## Contributing

1. Create a feature branch
2. Implement changes
3. Write/update tests
4. Update documentation
5. Submit pull request

### Pull Request Guidelines

- Follow code style guidelines
- Include proper documentation
- Include test coverage
- Update changelog

## License

This project is licensed under the MIT License - see the LICENSE file for details.