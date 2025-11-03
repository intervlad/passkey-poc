# Passkey Authentication POC

This project demonstrates a Proof of Concept (POC) for Passkey authentication using a modern web stack. It includes both a frontend application and a backend server with Keycloak integration.

## Project Structure

- `front/` - Frontend application built with React and TypeScript
- `server/` - Backend server with authentication services

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

## Setup Instructions

### Backend Server

1. Navigate to the server directory:
   ```bash
   cd server/
   ```

2. Start the required services using Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Install dependencies and build the project:
   ```bash
   npm install
   npm run build
   ```

4. Start the server:
   ```bash
   npm run start
   ```

### Frontend Application

1. Navigate to the frontend directory:
   ```bash
   cd front/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Configuration

Both the server and frontend directories contain `.env.example` files that show the required environment variables. Make sure to create `.env` files with your specific configuration before running the applications.

## Features

- Passkey registration and authentication
- Integration with Keycloak for identity management
- Redis caching for improved performance
- TypeScript for type safety
- Modern React frontend with Vite

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: Prisma ORM
- **Authentication**: Keycloak
- **Caching**: Redis
- **Containerization**: Docker

## Development

For development, you can run the server and frontend in separate terminals to enable hot reloading:

1. Start the backend server with auto-restart on changes:
   ```bash
   cd server/
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd front/
   npm run dev
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.