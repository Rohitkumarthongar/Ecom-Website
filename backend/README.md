# BharatBazaar FastAPI Backend

A production-ready FastAPI backend for the BharatBazaar e-commerce platform.

## 🚀 Quick Start

### Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env

# 3. Run the application
python main.py
```

### Production

```bash
# Using Docker (recommended)
docker-compose up -d

# Or using the start script
export ENVIRONMENT=production
./start.sh
```

## 📁 Project Structure

```
backend/
├── main.py                 # Application entry point
├── app/
│   ├── core/              # Core functionality
│   │   ├── config.py      # Configuration
│   │   ├── database.py    # Database setup
│   │   ├── security.py    # Authentication
│   │   └── utils.py       # Utilities
│   ├── api/               # API routes
│   │   └── api_v1/
│   │       └── endpoints/ # Route handlers
│   ├── models.py          # Database models
│   ├── schemas/           # Pydantic models
│   └── services/          # Business logic
├── Dockerfile             # Production container
├── docker-compose.yml     # Development setup
└── requirements.txt       # Dependencies
```

## 🔧 Configuration

Key environment variables:

```env
ENVIRONMENT=production
JWT_SECRET=your-secret-key
DB_HOST=your-database-host
DB_USER=your-username
DB_PASSWORD=your-password
```

See `.env.example` for all options.

## 📚 API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 API Endpoints

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Products**: `/api/products/*`
- **Orders**: `/api/orders/*`
- **Admin**: `/api/admin/*`

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📋 Migration

If migrating from the old structure, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## 🧪 Testing

```bash
# Validate structure
python validate_structure.py

# Run tests (if available)
pytest
```

## 🔒 Security Features

- JWT authentication
- Password hashing
- CORS protection
- SQL injection prevention
- Environment-based secrets

## 📊 Monitoring

- Health check: `/health`
- Application logs
- Built-in FastAPI metrics

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Follow Python PEP 8 style guide

## 📄 License

[Your License Here]

---

**Ready for production deployment!** 🎉