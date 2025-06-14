# Docker Setup for Mastra Meme Generator

This document provides comprehensive instructions for running the Mastra Meme Generator project using Docker.

## 🐳 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10.0 or later)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0.0 or later)
- API keys for OpenAI and Mem0 (see [Environment Setup](#environment-setup))

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd mastra-agents-meme-generator
```

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
cp env.example .env
```

Edit the `.env` file with your API keys:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
MEM0_API_KEY=your_mem0_api_key_here

# Optional (for enhanced features)
IMGFLIP_USERNAME=your_imgflip_username
IMGFLIP_PASSWORD=your_imgflip_password

# Optional (for tawk.to integration)
TAWK_WEBHOOK_SECRET=your_tawk_webhook_secret_here
WEBHOOK_PORT=3001
```

### 3. Run with Docker Compose

**Production mode:**
```bash
docker-compose up -d
```

**Development mode (with hot reload):**
```bash
docker-compose --profile dev up -d mastra-dev
```

### 4. Access the Application

- **Web Interface**: http://localhost:4111
- **Health Check**: http://localhost:4111/health

## 🛠️ Makefile Commands

We've included a comprehensive Makefile to simplify Docker operations. Use `make help` to see all available commands:

### Quick Commands

```bash
# Show all available commands
make help

# Build and push to Docker Hub
make login              # Login to Docker Hub first
make build              # Build both production and dev images
make push               # Push both images to jeffpascal repository

# Local development
make run                # Start production container
make run-dev            # Start development container with hot reload
make stop               # Stop all containers
make logs               # View container logs

# Create a versioned release
make release VERSION=1.0.0
```

### Build Commands

```bash
make build              # Build both production and development images
make build-prod         # Build only production image
make build-dev          # Build only development image
```

### Push Commands

```bash
make push               # Push both images to Docker Hub
make push-prod          # Push only production image
make push-dev           # Push only development image
```

### Development Commands

```bash
make run                # Run production container locally
make run-dev            # Run development container with hot reload
make stop               # Stop all containers
make restart            # Restart production container
make logs               # Show logs from all containers
make logs-prod          # Show logs from production container only
make logs-dev           # Show logs from development container only
```

### Utility Commands

```bash
make test               # Run tests in container
make lint               # Run code formatting
make clean              # Remove local Docker images and containers
make clean-all          # Remove ALL Docker resources (with confirmation)
make info               # Show build information
make status             # Show container and image status
```

### Docker Hub Repository

Images are pushed to: `docker.io/jeffpascal/mastra-meme-generator`

**Available tags:**
- `latest` - Latest stable version
- `{version}` - Specific version (e.g., `1.0.0`)
- `{commit-hash}` - Specific commit build

## 📋 Available Commands

### Production Commands

```bash
# Start the production container
docker-compose up -d

# View logs
docker-compose logs -f mastra-app

# Stop the container
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Development Commands

```bash
# Start development server with hot reload
docker-compose --profile dev up -d mastra-dev

# View development logs
docker-compose logs -f mastra-dev

# Execute commands in the development container
docker-compose exec mastra-dev npm run build
docker-compose exec mastra-dev npm test

# Access shell in development container
docker-compose exec mastra-dev sh
```

### Maintenance Commands

```bash
# Remove all containers and volumes (⚠️ This will delete your data)
docker-compose down -v

# Remove only containers (keeps data)
docker-compose down

# Pull latest images
docker-compose pull

# View container status
docker-compose ps
```

## 🗂️ Docker Architecture

### Multi-Stage Production Build

The production Dockerfile uses a multi-stage build for optimal performance:

1. **Dependencies Stage**: Installs production dependencies
2. **Builder Stage**: Builds the Mastra application using `mastra build`
3. **Runner Stage**: Creates minimal production image with built application

### Development Setup

The development setup mounts your local code into the container for hot reload:

- Source code is mounted for real-time changes
- `node_modules` is preserved in container for performance
- Development dependencies are available

## 📁 Data Persistence

### Database Files

The following LibSQL database files are persisted using Docker volumes:

- `mastra-system.db` - Main system database
- `mastra-memory.db` - Memory/conversation data
- Associated WAL and SHM files for SQLite

All data and logs are stored in `/data/mastra-ai` within the containers.

### Volume Mounts

```yaml
volumes:
  # Database persistence
  - ./mastra-system.db:/data/mastra-ai/mastra-system.db
  - ./mastra-memory.db:/data/mastra-ai/mastra-memory.db
  # Data directory for additional storage and logs
  - mastra_data:/data/mastra-ai
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for meme caption generation |
| `MEM0_API_KEY` | ✅ Yes | Mem0 API key for intelligent memory |
| `IMGFLIP_USERNAME` | ❌ Optional | Imgflip username for better rate limits |
| `IMGFLIP_PASSWORD` | ❌ Optional | Imgflip password for better rate limits |
| `TAWK_WEBHOOK_SECRET` | ❌ Optional | Tawk.to webhook secret for chat integration |
| `WEBHOOK_PORT` | ❌ Optional | Port for tawk.to webhook (default: 3001) |

### Port Configuration

- **Default Port**: 4111
- **Tawk.to Webhook**: 3001 (configurable)
- **Health Check**: Available on main port at `/health`

### Server Configuration

The Mastra server can be configured through environment variables:

```env
PORT=4111                # Server port
NODE_ENV=production      # Environment mode
```

## 🏥 Health Checks

Both production and development containers include health checks:

```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect <container_name> | grep -A 10 "Health"
```

The health check endpoint tests:
- Server responsiveness
- Basic API functionality
- Database connectivity

## 🔍 Troubleshooting

### Common Issues

**1. Container won't start**
```bash
# Check logs for errors
docker-compose logs mastra-app

# Common causes:
# - Missing required environment variables
# - Port 4111 already in use
# - Database permission issues
```

**2. Database permission errors**
```bash
# Fix database file permissions
sudo chown -R $USER:$USER *.db*

# Or recreate with proper permissions
docker-compose down -v
docker-compose up -d
```

**3. Port conflicts**
```bash
# Change the port in docker-compose.yml
ports:
  - "4112:4111"  # Use port 4112 instead

# Or stop conflicting services
sudo lsof -i :4111
```

**4. Environment variables not loading**
```bash
# Verify .env file exists and has correct format
cat .env

# Recreate containers to pick up changes
docker-compose down
docker-compose up -d
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Add to your .env file
DEBUG=mastra:*
LOG_LEVEL=debug

# Restart containers
docker-compose down
docker-compose up -d
```

### Performance Issues

**Memory optimization:**
```bash
# Limit container memory (add to docker-compose.yml)
services:
  mastra-app:
    mem_limit: 512m
    mem_reservation: 256m
```

**Build optimization:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

## 🚀 Deployment

### Production Deployment

1. **Prepare environment:**
```bash
cp env.example .env
# Edit .env with production values
```

2. **Build and deploy:**
```bash
docker-compose -f docker-compose.yml up -d --build
```

3. **Monitor:**
```bash
docker-compose logs -f --tail=100
```

### Cloud Deployment

The Docker setup works with major cloud platforms:

- **AWS ECS/Fargate**: Use the production Dockerfile
- **Google Cloud Run**: Compatible with the container setup
- **Azure Container Instances**: Direct deployment support
- **DigitalOcean App Platform**: Use Dockerfile for deployment

### Environment-Specific Configs

Create environment-specific compose files:

```bash
# docker-compose.staging.yml
version: '3.8'
services:
  mastra-app:
    extends:
      file: docker-compose.yml
      service: mastra-app
    environment:
      - NODE_ENV=staging
      - LOG_LEVEL=info
```

## 📊 Monitoring

### Container Metrics

```bash
# Resource usage
docker stats

# Container info
docker inspect mastra-app

# Health status
docker-compose ps
```

### Application Logs

```bash
# Real-time logs
docker-compose logs -f mastra-app

# Last 100 lines
docker-compose logs --tail=100 mastra-app

# Filter by timestamp
docker-compose logs --since 2024-01-01T00:00:00 mastra-app
```

## 🛡️ Security

### Best Practices

1. **Never commit .env files**
2. **Use secrets management in production**
3. **Run containers as non-root user** (already configured)
4. **Regularly update base images**
5. **Use specific image tags instead of `latest`**

### Security Scanning

```bash
# Scan for vulnerabilities
docker scout cves mastra-app

# Update base image
docker-compose build --no-cache
```

## 📚 Additional Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

## 🤝 Contributing

When contributing Docker-related changes:

1. Test both development and production builds
2. Update this documentation for any configuration changes
3. Ensure backward compatibility with existing setups
4. Add appropriate health checks for new services

---

**Happy containerizing!** 🐳 Your Mastra meme generator is now ready to run anywhere Docker is supported!

**Images available at:** `docker.io/jeffpascal/mastra-meme-generator`

## 📱 Tawk.to Webhook Service

The project includes a dedicated Tawk.to webhook service for handling live chat integrations.

### Architecture

The webhook service runs as a separate container/process on port 3001, allowing:
- Independent scaling of webhook processing
- Separate monitoring and logging
- Isolation of chat-specific dependencies
- Shared database access with the main application

### Running Webhook Services

**Production webhook service:**
```bash
make run-webhook          # Start webhook service only
make run-all             # Start both main app and webhook
```

**Development webhook service:**
```bash
make run-webhook-dev     # Start development webhook with hot reload
make run-all-dev         # Start all development services
```

### Webhook Endpoints

- **Main endpoint**: `http://localhost:3001/webhook`
- **Alternative endpoint**: `http://localhost:3001/webhooks/tawk`
- **Health check**: `http://localhost:3001/health`
- **Service info**: `http://localhost:3001/`

### Required Environment Variables

For the webhook service to work properly, configure these variables:

```env
# Required for Tawk.to webhook
TAWK_WEBHOOK_SECRET=your_tawk_webhook_secret_here
WEBHOOK_PORT=3001
```

### Monitoring Webhook Services

```bash
# View webhook logs
make logs-webhook         # Production webhook logs
make logs-webhook-dev     # Development webhook logs

# Check webhook status
docker-compose ps         # See all service status
curl http://localhost:3001/health  # Check webhook health
```

### Webhook Configuration

The webhook service:
- Processes incoming Tawk.to chat events
- Integrates with the meme generator and availability agents
- Handles chat start, end, transcript, and ticket events
- Provides signature verification for security
- Provides health monitoring
- All webhook logs and data are stored in `/data/mastra-ai`

## 🔧 Configuration

For comprehensive Docker setup instructions, deployment options, and troubleshooting, see **[DOCKER.md](./DOCKER.md)**. 