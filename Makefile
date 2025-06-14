# Makefile for Mastra Meme Generator Docker Operations
# Author: Jeff Pascal
# Repository: jeffpascal/mastra-meme-generator

# Variables
DOCKER_REGISTRY = ""
DOCKER_USERNAME = jeffpascal
IMAGE_NAME = mastra-meme-generator
DEV_IMAGE_NAME = mastra-meme-generator-dev

# Version can be overridden: make build VERSION=1.2.0
VERSION ?= latest
COMMIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Full image names
PROD_IMAGE = $(DOCKER_USERNAME)/$(IMAGE_NAME)
DEV_IMAGE = $(DOCKER_USERNAME)/$(DEV_IMAGE_NAME)

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help build build-prod build-dev tag push push-prod push-dev login logout clean run run-dev stop logs test all release

# Default target
.DEFAULT_GOAL := help

## Help target
help: ## Show this help message
	@echo "$(BLUE)Mastra Meme Generator Docker Build System$(NC)"
	@echo "$(BLUE)===========================================$(NC)"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables:"
	@echo "  $(YELLOW)VERSION$(NC)         = $(VERSION)"
	@echo "  $(YELLOW)DOCKER_USERNAME$(NC) = $(DOCKER_USERNAME)"
	@echo "  $(YELLOW)COMMIT_HASH$(NC)     = $(COMMIT_HASH)"

## Build Targets
build: build-prod build-dev ## Build both production and development images

build-prod: ## Build production Docker image
	@echo "$(BLUE)Building production image...$(NC)"
	docker build \
		--file Dockerfile \
		--tag $(PROD_IMAGE):$(VERSION) \
		--tag $(PROD_IMAGE):$(COMMIT_HASH) \
		--tag $(PROD_IMAGE):latest \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT_HASH=$(COMMIT_HASH) \
		.
	@echo "$(GREEN)Production image built successfully!$(NC)"

build-dev: ## Build development Docker image
	@echo "$(BLUE)Building development image...$(NC)"
	docker build \
		--no-cache \
		--file Dockerfile.dev \
		--tag $(DEV_IMAGE):$(VERSION) \
		--tag $(DEV_IMAGE):$(COMMIT_HASH) \
		--tag $(DEV_IMAGE):latest \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT_HASH=$(COMMIT_HASH) \
		.
	@echo "$(GREEN)Development image built successfully!$(NC)"

## Push Targets
push: push-prod 

push-prod: build-prod ## Build and push production image to Docker Hub
	@echo "$(BLUE)Pushing production image to Docker Hub...$(NC)"
	docker push $(PROD_IMAGE):$(VERSION)
	docker push $(PROD_IMAGE):$(COMMIT_HASH)
	docker push $(PROD_IMAGE):latest
	@echo "$(GREEN)Production image pushed successfully!$(NC)"

push-dev: build-dev ## Build and push development image to Docker Hub
	@echo "$(BLUE)Pushing development image to Docker Hub...$(NC)"
	docker push $(DEV_IMAGE):$(VERSION)
	docker push $(DEV_IMAGE):$(COMMIT_HASH)
	docker push $(DEV_IMAGE):latest
	@echo "$(GREEN)Development image pushed successfully!$(NC)"

## Authentication
login: ## Login to Docker Hub
	@echo "$(BLUE)Logging into Docker Hub...$(NC)"
	@echo "Please enter your Docker Hub credentials:"
	docker login $(DOCKER_REGISTRY)
	@echo "$(GREEN)Successfully logged into Docker Hub!$(NC)"

logout: ## Logout from Docker Hub
	docker logout $(DOCKER_REGISTRY)
	@echo "$(GREEN)Logged out from Docker Hub$(NC)"

## Local Development
run: ## Run production container locally
	@echo "$(BLUE)Starting production container...$(NC)"
	docker-compose up -d mastra-app
	@echo "$(GREEN)Production container started!$(NC)"
	@echo "Access the application at: $(YELLOW)http://localhost:4111$(NC)"

run-dev: ## Run development container locally
	@echo "$(BLUE)Starting development container...$(NC)"
	docker-compose --profile dev up -d mastra-dev
	@echo "$(GREEN)Development container started!$(NC)"
	@echo "Access the application at: $(YELLOW)http://localhost:4111$(NC)"

run-webhook: ## Run Tawk.to webhook service
	@echo "$(BLUE)Starting webhook service...$(NC)"
	docker-compose up -d mastra-webhook
	@echo "$(GREEN)Webhook service started!$(NC)"
	@echo "Webhook endpoint: $(YELLOW)http://localhost:3001/webhook$(NC)"

run-webhook-dev: ## Run development webhook service
	@echo "$(BLUE)Starting development webhook service...$(NC)"
	docker-compose --profile dev up -d mastra-webhook-dev
	@echo "$(GREEN)Development webhook service started!$(NC)"
	@echo "Webhook endpoint: $(YELLOW)http://localhost:3001/webhook$(NC)"

run-all: ## Run both main app and webhook services (production)
	@echo "$(BLUE)Starting all production services...$(NC)"
	docker-compose up -d mastra-app mastra-webhook
	@echo "$(GREEN)All services started!$(NC)"
	@echo "Main app: $(YELLOW)http://localhost:4111$(NC)"
	@echo "Webhook: $(YELLOW)http://localhost:3001/webhook$(NC)"

run-all-dev: ## Run both main app and webhook services (development)
	@echo "$(BLUE)Starting all development services...$(NC)"
	docker-compose --profile dev up -d mastra-dev mastra-webhook-dev
	@echo "$(GREEN)All development services started!$(NC)"
	@echo "Main app: $(YELLOW)http://localhost:4111$(NC)"
	@echo "Webhook: $(YELLOW)http://localhost:3001/webhook$(NC)"

stop: ## Stop all running containers
	@echo "$(BLUE)Stopping all containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)All containers stopped!$(NC)"

logs: ## Show logs from running containers
	docker-compose logs -f

logs-prod: ## Show logs from production container
	docker-compose logs -f mastra-app

logs-dev: ## Show logs from development container
	docker-compose logs -f mastra-dev

logs-webhook: ## Show logs from webhook service
	docker-compose logs -f mastra-webhook

logs-webhook-dev: ## Show logs from development webhook service
	docker-compose logs -f mastra-webhook-dev

## Testing
test: ## Run tests in container
	@echo "$(BLUE)Running tests...$(NC)"
	docker-compose exec mastra-app npm test || \
	docker run --rm -v $(PWD):/app -w /app $(PROD_IMAGE):latest npm test
	@echo "$(GREEN)Tests completed!$(NC)"

lint: ## Run linting in container
	@echo "$(BLUE)Running linter...$(NC)"
	docker-compose exec mastra-dev npm run format || \
	docker run --rm -v $(PWD):/app -w /app $(DEV_IMAGE):latest npm run format
	@echo "$(GREEN)Linting completed!$(NC)"

## Cleanup
clean: ## Remove local Docker images and containers
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	docker-compose down -v --remove-orphans
	-docker rmi $(PROD_IMAGE):latest $(PROD_IMAGE):$(VERSION) $(PROD_IMAGE):$(COMMIT_HASH) 2>/dev/null
	-docker rmi $(DEV_IMAGE):latest $(DEV_IMAGE):$(VERSION) $(DEV_IMAGE):$(COMMIT_HASH) 2>/dev/null
	docker system prune -f
	@echo "$(GREEN)Cleanup completed!$(NC)"

clean-all: clean ## Remove all Docker images, containers, volumes, and networks
	@echo "$(YELLOW)Warning: This will remove ALL Docker resources!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -a -f --volumes; \
		echo "$(GREEN)All Docker resources cleaned!$(NC)"; \
	else \
		echo "$(YELLOW)Cleanup cancelled$(NC)"; \
	fi

## Release Management
release: ## Create a new release (build, tag, and push with version)
	@if [ "$(VERSION)" = "latest" ]; then \
		echo "$(RED)Error: Please specify a version for release: make release VERSION=1.0.0$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Creating release $(VERSION)...$(NC)"
	@echo "$(BLUE)Building images...$(NC)"
	$(MAKE) build VERSION=$(VERSION)
	@echo "$(BLUE)Pushing to Docker Hub...$(NC)"
	$(MAKE) push VERSION=$(VERSION)
	@echo "$(GREEN)Release $(VERSION) completed successfully!$(NC)"
	@echo "$(GREEN)Images available at:$(NC)"
	@echo "  - $(YELLOW)$(PROD_IMAGE):$(VERSION)$(NC)"
	@echo "  - $(YELLOW)$(DEV_IMAGE):$(VERSION)$(NC)"

## CI/CD
ci: ## CI pipeline: build, test, and conditionally push
	@echo "$(BLUE)Running CI pipeline...$(NC)"
	$(MAKE) build
	$(MAKE) test
	@if [ "$$CI" = "true" ] && [ -n "$$DOCKER_PASSWORD" ]; then \
		echo "$(BLUE)CI environment detected, pushing images...$(NC)"; \
		echo "$$DOCKER_PASSWORD" | docker login -u "$$DOCKER_USERNAME" --password-stdin; \
		$(MAKE) push; \
	else \
		echo "$(YELLOW)Skipping push (not in CI or credentials not available)$(NC)"; \
	fi

## Information
info: ## Show build information
	@echo "$(BLUE)Build Information$(NC)"
	@echo "=================="
	@echo "Version:      $(YELLOW)$(VERSION)$(NC)"
	@echo "Commit:       $(YELLOW)$(COMMIT_HASH)$(NC)"
	@echo "Build Date:   $(YELLOW)$(BUILD_DATE)$(NC)"
	@echo "Registry:     $(YELLOW)$(DOCKER_REGISTRY)$(NC)"
	@echo "Username:     $(YELLOW)$(DOCKER_USERNAME)$(NC)"
	@echo ""
	@echo "$(BLUE)Image Names$(NC)"
	@echo "============"
	@echo "Production:   $(YELLOW)$(PROD_IMAGE)$(NC)"
	@echo "Development:  $(YELLOW)$(DEV_IMAGE)$(NC)"

status: ## Show status of Docker containers
	@echo "$(BLUE)Container Status$(NC)"
	@echo "================"
	docker-compose ps
	@echo ""
	@echo "$(BLUE)Image Information$(NC)"
	@echo "=================="
	-docker images | grep "$(DOCKER_USERNAME)/$(IMAGE_NAME)"

## Quick commands
up: run ## Alias for run
down: stop ## Alias for stop
restart: stop run ## Restart production container

# Multi-platform build (experimental)
build-multiplatform: ## Build multi-platform images (linux/amd64,linux/arm64)
	@echo "$(BLUE)Building multi-platform production image...$(NC)"
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--file Dockerfile \
		--tag $(PROD_IMAGE):$(VERSION) \
		--tag $(PROD_IMAGE):latest \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT_HASH=$(COMMIT_HASH) \
		--push \
		.
	@echo "$(GREEN)Multi-platform image built and pushed!$(NC)" 