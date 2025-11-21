# Running the Resume Screening Tool

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Google Generative AI API key (formerly OpenAI)

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory with your API keys:
   ```
   PORT=3000
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. Start the backend server:
   ```
   npm run dev
   ```

   The backend server will start on `http://localhost:3000`

## Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the frontend development server:
   ```
   npm start
   ```

   The frontend will start on `http://localhost:3001` (or the next available port)

## Testing the Application

1. Open your browser and navigate to `http://localhost:3001`

2. Upload a resume and job description from the `samples` directory:
   - Resume: `samples/resumes/sample_resume.txt`
   - Job Description: `samples/job-descriptions/sample_job_description.txt`

3. Click "Analyze Resume" to see the match score and analysis

4. Use the chat interface to ask questions about the candidate

## API Endpoints

### Resume Analysis
- `POST /api/resume/upload` - Upload resume and job description
- `POST /api/resume/analyze` - Analyze uploaded files
- `GET /api/resume/analysis/:id` - Get analysis results

### Chat Interface
- `POST /api/chat/ask` - Ask a question about the resume
- `GET /api/chat/history/:analysisId` - Get chat history

## Project Structure

```
resume-screening-tool/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.ts
│   ├── config/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── samples/
│   ├── resumes/
│   └── job-descriptions/
└── README.md
```

## Troubleshooting

### Common Issues

1. **Port already in use**: If port 3000 is already in use, change the PORT value in the `.env` file

2. **API key errors**: Make sure you have a valid Google Generative AI API key in your `.env` file

3. **CORS errors**: The backend and frontend are configured to work together, but if you encounter CORS issues, check the cors configuration in `backend/src/index.ts`

4. **File upload issues**: Make sure you're uploading files in PDF or TXT format

### Need Help?

If you encounter any issues, please check:
1. All dependencies are installed correctly
2. API keys are valid and properly configured
3. The backend server is running before starting the frontend