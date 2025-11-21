import { Request, Response } from 'express';
import { searchEmbeddings, generateResponse } from '../services/ragService';

// In-memory storage for chat history (in production, use a proper database)
const chatHistory: Record<string, any[]> = {};

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { analysisId, question } = req.body;
    
    console.log(`🤖 Received question for analysis ${analysisId}: "${question}"`);
    
    // Validate inputs
    if (!analysisId || !question) {
      return res.status(400).json({ error: 'analysisId and question are required' });
    }
    
    // Additional validation for analysisId format
    if (typeof analysisId !== 'string' || analysisId.length < 5) {
      return res.status(400).json({ error: 'Invalid analysisId format' });
    }
    
    // Additional validation for question format
    if (typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }
    
    // Get the stored analysis data to use as fallback context
    const analysisStorage: Record<string, any> = (global as any).analysisStorage || {};
    const analysis = analysisStorage[analysisId];
    
    console.log(`📊 Analysis storage keys: ${Object.keys(analysisStorage)}`);
    console.log(`📊 Looking for analysis ID: ${analysisId}`);
    console.log(`📊 Found analysis: ${!!analysis}`);
    
    // Validate that analysis exists
    if (!analysis) {
      console.log(`❌ Analysis not found for ID: ${analysisId}`);
      return res.status(404).json({ error: `Analysis not found for ID: ${analysisId}` });
    }
    
    if (analysis) {
      console.log(`📊 Analysis status: ${analysis.status}`);
      if (analysis.results) {
        console.log(`📊 Analysis results available: ${!!analysis.results.resumeText}`);
      }
      
      // Validate analysis status
      if (analysis.status !== 'completed') {
        console.log(`❌ Analysis not completed for ID: ${analysisId}, status: ${analysis.status}`);
        return res.status(400).json({ error: `Analysis not completed. Current status: ${analysis.status}` });
      }
    }
    
    let relevantContext: any[] = [];
    
    // Try to search for relevant context using embeddings
    try {
      relevantContext = await searchEmbeddings(question, analysisId);
      console.log(`🔍 Found ${relevantContext.length} relevant context items from embeddings`);
      
      // Log context items for debugging
      if (relevantContext.length > 0) {
        relevantContext.forEach((item: any, index: number) => {
          console.log(`📝 Context ${index + 1}: "${item.text.substring(0, 100)}..." (similarity: ${item.similarity})`);
        });
      } else {
        console.log(`⚠️  No relevant context found in embeddings for analysis ${analysisId}`);
      }
    } catch (searchError) {
      console.error('Error searching embeddings:', searchError);
      // Return a more user-friendly error
      return res.status(500).json({ error: 'Failed to search context. Please try again.' });
    }
    
    // If no context found from embeddings, use the full resume text as context
    if (relevantContext.length === 0 && analysis && analysis.results && analysis.results.resumeText) {
      console.log('🔄 Using full resume text as fallback context');
      // Split the resume text into chunks for better processing
      const resumeText = analysis.results.resumeText || '';
      const chunks = resumeText.split('\n\n').filter((chunk: string) => chunk.trim().length > 50);
      
      // Create mock embedding objects from chunks
      relevantContext = chunks.slice(0, 10).map((text: string, index: number) => ({
        text: text,
        similarity: 0.5 // Mock similarity score
      }));
      
      console.log(`✅ Created ${relevantContext.length} context items from resume text`);
    }
    
    // If we still don't have context, try to extract key information directly
    if (relevantContext.length === 0 && analysis && analysis.results && analysis.results.resumeText) {
      console.log('🔄 Extracting key information from resume text');
      const resumeText = analysis.results.resumeText || '';
      
      // Look for project-related information
      const projectLines = resumeText.split('\n').filter((line: string) => {
        const lowerLine = line.toLowerCase();
        return (
          lowerLine.includes('project') || 
          lowerLine.includes('achievement') ||
          lowerLine.includes('experience') ||
          lowerLine.includes('work') ||
          lowerLine.includes('role') ||
          lowerLine.includes('responsibility')
        ) && line.length > 20;
      });
      
      if (projectLines.length > 0) {
        relevantContext = projectLines.slice(0, 5).map((text: string, index: number) => ({
          text: text,
          similarity: 0.7
        }));
        console.log(`✅ Extracted ${relevantContext.length} project/experience lines`);
      }
    }
    
    // Validate that we have context to work with
    if (relevantContext.length === 0) {
      console.log(`❌ No context available for question: "${question}"`);
      return res.status(400).json({ error: 'No context available to answer this question. Please ensure the analysis is complete.' });
    }
    
    // Generate response using the context
    let answer = '';
    try {
      answer = await generateResponse(question, relevantContext);
      console.log(`✅ Generated answer: "${answer.substring(0, 100)}..."`);
    } catch (responseError) {
      console.error('Error generating response:', responseError);
      return res.status(500).json({ error: 'Failed to generate response. Please try again.' });
    }
    
    // Store in chat history
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
      sources: relevantContext.map((item: any) => ({
        text: item.text,
        similarity: item.similarity || 0
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