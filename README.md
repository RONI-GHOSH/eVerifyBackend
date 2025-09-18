# Certificate Verification Portal Backend

A Node.js backend application for a government certificate verification portal. This system allows educational institutions to issue and manage digital certificates, which can be verified by authorized parties.

## Features

### User Management
- User registration for institutions (colleges, universities, schools, etc.)
- Authentication with JWT
- Role-based authorization (issuer, admin)

### Certificate Management
- Create and manage certificate categories with customizable fields
- Upload certificate templates with field definitions
- OCR processing for certificate data extraction
- Single and batch certificate uploads
- Certificate verification tracking

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Multer** - File uploads
- **bcryptjs** - Password hashing

## Project Structure

```
├── config/             # Configuration files
├── controllers/        # Request handlers
├── db/                 # Database connection
├── middlewares/        # Express middlewares
├── models/             # Mongoose models
├── routes/             # API routes
├── services/           # Business logic services
├── uploads/            # Uploaded files storage
├── utils/              # Utility functions
├── .env                # Environment variables
├── index.js            # Application entry point
└── package.json        # Project metadata
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new institution
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/logout` - Logout

### Certificate Categories
- `POST /api/v1/categories` - Create a new category
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get a single category
- `PUT /api/v1/categories/:id` - Update a category
- `DELETE /api/v1/categories/:id` - Delete a category

### Certificates
- `POST /api/v1/certificates/upload` - Upload a single certificate
- `POST /api/v1/certificates/confirm` - Confirm certificate data
- `POST /api/v1/certificates/upload-batch` - Upload multiple certificates
- `POST /api/v1/certificates/confirm-batch` - Confirm batch certificates
- `GET /api/v1/certificates/category/:categoryId` - Get certificates by category
- `GET /api/v1/certificates/:id` - Get a single certificate

### Verification
- `GET /api/v1/verify/:id` - Verify a certificate by ID
- `POST /api/v1/verify/hash` - Verify a certificate by hash

## Setup and Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with required environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Environment Variables

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/certificate-verification
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5000000
```

## Future Enhancements

- Integration with Google Document AI for OCR
- AWS S3 integration for file storage
- Email verification for user registration
- QR code generation for certificates
- Blockchain integration for immutable certificate records