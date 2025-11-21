import { Router } from 'express';
import { askQuestion, getChatHistory } from '../controllers/chatController';

const router = Router();

// Ask a question about the resume
router.post('/ask', askQuestion);

// Get chat history
router.get('/history/:analysisId', getChatHistory);

export default router;