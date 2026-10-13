# Resume Intelligence Platform (RIP)

An AI-powered, full-stack resume analysis, generation, and ATS optimization platform. The platform parses resumes, evaluates candidate profiles against targeted job descriptions using local Large Language Models (LLMs), stores vectorized semantic representations for similarity search, and provides interactive resume building and editing capabilities.

---

## Architecture & Technology Stack

The platform implements a polyglot persistence architecture designed for specialized data modeling requirements:

```
                      +-----------------------------+
                      |       React Frontend        |
                      |   (Vite, Tailwind, Lucide)  |
                      +--------------+--------------+
                                     |
                                REST API
                                     |
                      +--------------v--------------+
                      |     Node.js / Express       |
                      |       (REST Backend)        |
                      +---+----------+----------+---+
                          |          |          |
            +-------------+          |          +-------------+
            |                        |                        |
  +---------v---------+    +---------v---------+    +---------v---------+
  |    PostgreSQL     |    |      MongoDB      |    |      Qdrant       |
  |  Relational Data  |    | Document Storage  |    |   Vector Store    |
  | (Users, Resumes,  |    |  (Full Resumes,   |    | (Semantic Resume  |
  |   Junctions)      |    |   ATS Reports)    |    |   Text Chunks)    |
  +-------------------+    +-------------------+    +-------------------+
            ^
            | Local AI Inference
  +---------+---------+
  |      Ollama       |
  | (Qwen2.5 / Nomic) |
  +-------------------+
```

- **Frontend**: React 18, Vite, Tailwind CSS, Axios, Lucide React
- **Backend**: Node.js (ES Modules), Express.js, JWT Authentication, Multer
- **Relational Store (PostgreSQL)**: Handles relational entities (Users, Resumes, Education, Experience, Projects, Skills master table, and Junctions)
- **Document Store (MongoDB)**: Stores unstructured/semi-structured full resume JSON bodies, detailed ATS diagnostic reports, and raw extracted text
- **Vector Database (Qdrant)**: Stores embeddings of segmented resume chunks (`nomic-embed-text`) for similarity retrieval and semantic matching
- **Local AI / LLM (Ollama)**: Local inference engine executing `qwen2.5:7b-instruct` for structured parsing, ATS evaluations, and job description enhancement
- **Infrastructure**: Docker & Docker Compose orchestrating PostgreSQL, MongoDB, and Qdrant

---

## Key Features

1. **Intelligent Resume Parsing & Ingestion**:
   - Accepts multi-format documents (PDF, DOCX).
   - Extracts raw content and employs local AI inference to convert unstructured text into validated schema models (Contact info, Work Experience, Education, Projects, Skills).
   - Safe parsing fallbacks with automated formatting sanitization (date alignment, skill junction normalizing).

2. **Interactive Resume Builder & Editor**:
   - Real-time preview with professional typography and formatting.
   - Dynamic CRUD operations across all resume sections (Add/Edit/Remove items).
   - Dual-database synchronization: updates PostgreSQL relation records while maintaining document state in MongoDB.

3. **ATS Scoring & Gap Analysis**:
   - Evaluates resume alignment against job descriptions.
   - Calculates weighted ATS scores, semantic match ratings, and identifies critical keyword gaps.
   - Generates actionable, role-tailored recommendations.

4. **Job Description Enhancer**:
   - Evaluates employer job descriptions to clarify responsibilities, required skills, and formatting.
   - Produces improved, structured job specs for comparative analysis.

---

## Project Structure

```
.
├── backend/                  # Node.js Express API service
│   ├── src/
│   │   ├── config/          # Database connections (Postgres, Mongo, Qdrant)
│   │   ├── controllers/     # Route handlers (auth, resume, upload, ats, jd)
│   │   ├── middleware/      # Auth JWT & Multer upload middleware
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic & DB interaction services
│   │   └── utils/           # Ollama service, parser, vector chunkers
│   ├── .env.example         # Environment template
│   ├── package.json
│   └── server.js            # Express entry point
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/             # Axios instance & interceptors
│   │   ├── components/      # UI components (Header, Resume Preview, etc.)
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Dashboard, Builder, Login, Register, JDEnhancer
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docker/
│   └── init.sql             # PostgreSQL schema definition & initial tables
├── docker-compose.yml        # Multi-container database setup
├── start-dev.ps1             # Automated local services startup script
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Desktop](https://www.docker.com/)
- [Ollama](https://ollama.com/) installed and running locally
  - Required models:
    ```bash
    ollama pull qwen2.5:7b-instruct
    ollama pull nomic-embed-text
    ```

### 1. Database Setup (Docker)

Start the databases (PostgreSQL, MongoDB, and Qdrant) using Docker Compose:

```bash
docker compose up -d
```

Verify that the containers are healthy:
- **PostgreSQL**: `localhost:5433` (mapped from 5432)
- **MongoDB**: `localhost:27017`
- **Qdrant**: `localhost:6333`

### 2. Backend Configuration & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies and start the backend service:
   ```bash
   npm install
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

### 3. Frontend Configuration & Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies and launch Vite development server:
   ```bash
   npm install
   npm run dev
   ```
   The frontend UI will be available at `http://localhost:5173`.

---

## Automated Startup (Windows PowerShell)

A PowerShell startup script is included to automatically verify databases, boot Ollama, and run both services:

```powershell
.\start-dev.ps1
```

---

## API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT |
| `GET` | `/api/auth/me` | Fetch active user profile |
| `POST` | `/api/upload/resume` | Upload & parse resume document (PDF/DOCX) |
| `GET` | `/api/resumes` | List user resumes |
| `POST` | `/api/resumes` | Create a new resume record |
| `GET` | `/api/resumes/:resumeId` | Retrieve full resume data |
| `PUT` | `/api/resumes/:resumeId` | Update resume metadata |
| `DELETE` | `/api/resumes/:resumeId` | Delete resume across all databases |
| `POST` | `/api/ats/analyze` | Run ATS score analysis against job description |
| `POST` | `/api/jd/enhance` | Enhance and format job descriptions |

---

## License

This project is developed as an academic and engineering software platform. All rights reserved.
