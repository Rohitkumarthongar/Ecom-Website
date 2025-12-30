#!/bin/bash

# Production startup script for FastAPI application

set -e

echo "Starting BharatBazaar API..."

# Check if running in production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running in production mode"
    
    # Use Gunicorn for production
    exec gunicorn main:app \
        --bind 0.0.0.0:8000 \
        --workers 4 \
        --worker-class uvicorn.workers.UvicornWorker \
        --timeout 120 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --access-logfile - \
        --error-logfile -
else
    echo "Running in development mode"
    
    # Use Uvicorn for development
    exec uvicorn main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --reload
fi