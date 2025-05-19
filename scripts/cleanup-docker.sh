#!/bin/bash
# OCDI-304: Docker cleanup script to free disk space
# Following Semantic Seed Venture Studio Coding Standards V2.0

echo "Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No running containers to stop"

echo "Removing all containers..."
docker rm $(docker ps -a -q) 2>/dev/null || echo "No containers to remove"

echo "Removing unused images..."
docker rmi $(docker images -q) 2>/dev/null || echo "No images to remove"

echo "Removing unused volumes..."
docker volume prune -f

echo "Removing unused networks..."
docker network prune -f

echo "Cleaning up Docker system..."
docker system prune -af

echo "Docker cleanup complete."
