import { Request, Response } from 'express';
import { searchEmbeddings, generateResponse } from '../services/ragService';

// In-memory storage for chat history (in production, use a proper database)
const chatHistory: Record<string, any[]> = {};

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { analysisId, question } = req.body;
    
    // 1. Search for relevant context using embeddings
    const relevantContext = await searchEmbeddings(question, analysisId);
    
    // 2. Generate response using Gemini with the retrieved context
    const answer = await generateResponse(question, relevantContext);
    
    // 3. Store in chat history
    if (!chatHistory[analysisId]) {
      chatHistory[analysisId] = [];
    }
    
    const chatEntry = {
      question,
      answer,
      timestamp: new Date().toISOString()
    };
    
    chatHistory[analysisId].push(chatEntry);
    
    res.status(200).json({
      answer,
      sources: relevantContext.map(item => ({
        text: item.text,
        similarity: item.similarity
      }))
    });
  } catch (error) {
    console.error('Error in askQuestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    
    const history = chatHistory[analysisId] || [];
    
    res.status(200).json({
      history
    });
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};