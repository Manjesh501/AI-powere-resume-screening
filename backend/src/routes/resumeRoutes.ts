import { Router } from 'express';
import upload from '../config/multerConfig';
import { uploadFiles, analyzeResume, getAnalysis, healthCheck } from '../controllers/resumeController';

const router = Router();

// Health check endpoint
router.get('/health', healthCheck);

// Upload resume and job description with multer middleware
router.post('/upload', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'jobDescription', maxCount: 1 }
]), uploadFiles);

// Analyze uploaded files
router.post('/analyze', analyzeResume);

// Get analysis results
router.get('/analysis/:id', getAnalysis);

export default router;