import { Request, Response } from 'express';
import { extractText } from '../utils/pdfParser';
import { calculateMatchScore } from '../services/matchService';
import { processDocument, generateEmbeddings, storeEmbeddings } from '../services/ragService';

// In-memory storage for demo purposes (would use a database in production)
// Add a cache for processed analyses to improve performance
const analysisStorage: Record<string, any> = {};
const processingQueue: Set<string> = new Set();

export const uploadFiles = async (req: Request, res: Response) => {
  try {
    console.log('📥 Starting file upload process');
    
    // Access files from multer
    const resumeFile = (req as any).files?.resume?.[0];
    const jobDescriptionFile = (req as any).files?.jobDescription?.[0];
    
    if (!resumeFile || !jobDescriptionFile) {
      console.log('❌ Missing required files');
      return res.status(400).json({ error: 'Both resume and job description files are required' });
    }
    
    console.log(`📄 Resume file: ${resumeFile.originalname} (${resumeFile.size} bytes)`);
    console.log(`📄 Job description file: ${jobDescriptionFile.originalname} (${jobDescriptionFile.size} bytes)`);
    
    // Generate a unique ID for this analysis
    const analysisId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    console.log(`🆔 Generated analysis ID: ${analysisId}`);
    
    // Store file information
    analysisStorage[analysisId] = {
      id: analysisId,
      status: 'uploaded',
      resume: {
        filename: resumeFile.originalname,
        data: resumeFile.buffer,
        size: resumeFile.buffer.length
      },
      jobDescription: {
        filename: jobDescriptionFile.originalname,
        data: jobDescriptionFile.buffer,
        size: jobDescriptionFile.buffer.length
      },
      createdAt: new Date()
    };
    
    console.log(`✅ Files uploaded successfully for analysis ${analysisId}`);
    
    res.status(200).json({
      message: 'Files uploaded successfully',
      analysisId
    });
  } catch (error) {
    console.error('💥 Error in uploadFiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const analyzeResume = async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`🚀 Starting analysis at ${new Date().toISOString()}`);
  
  try {
    // FIX: Simply extract the analysisId from the parsed body
    const { analysisId } = req.body;
    
    console.log(`📋 Received analysis request for ID: ${analysisId}`);
    
    if (!analysisId || !analysisStorage[analysisId]) {
      console.log('❌ Invalid analysis ID');
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }
    
    // Check if already processing or completed
    if (processingQueue.has(analysisId)) {
      console.log(`⏳ Analysis already in progress for ${analysisId}`);
      return res.status(202).json({ 
        message: 'Analysis already in progress', 
        analysisId,
        status: 'processing'
      });
    }
    
    const analysis = analysisStorage[analysisId];
    console.log(`📊 Found analysis record for ${analysisId}`);
    
    // Check if analysis is already completed
    if (analysis.status === 'completed') {
      console.log(`✅ Analysis already completed for ${analysisId}`);
      return res.status(200).json({
        message: 'Analysis already completed',
        analysisId,
        results: analysis.results,
        processingTime: '0ms'
      });
    }
    
    // Check if there was an error in previous attempt
    if (analysis.status === 'error') {
      console.log(`❌ Previous analysis attempt failed for ${analysisId}`);
      return res.status(500).json({ 
        error: 'Previous analysis attempt failed',
        details: analysis.error || 'Unknown error'
      });
    }
    
    // Update status
    analysis.status = 'processing';
    analysisStorage[analysisId] = analysis;
    processingQueue.add(analysisId);
    
    console.log(`🔄 Starting analysis for ${analysisId}`);
    
    try {
      // Parse resume and job description with better error handling
      console.log(`📄 Parsing documents...`);
      const parseStartTime = Date.now();
      
      const resumeText = await extractText(analysis.resume.data);
      console.log(`✅ Resume parsed in ${Date.now() - parseStartTime}ms (${resumeText.length} characters)`);
      
      const jobParseStartTime = Date.now();
      const jobDescriptionText = await extractText(analysis.jobDescription.data);
      console.log(`✅ Job description parsed in ${Date.now() - jobParseStartTime}ms (${jobDescriptionText.length} characters)`);
      
      // Process documents for RAG with progress tracking
      console.log(`📦 Processing documents for RAG...`);
      const processStartTime = Date.now();
      
      const resumeChunks = processDocument(resumeText);
      console.log(`✅ Resume chunked in ${Date.now() - processStartTime}ms (${resumeChunks.length} chunks)`);
      
      const jobProcessStartTime = Date.now();
      const jobDescriptionChunks = processDocument(jobDescriptionText);
      console.log(`✅ Job description chunked in ${Date.now() - jobProcessStartTime}ms (${jobDescriptionChunks.length} chunks)`);
      
      // Generate embeddings with better error handling
      console.log(`🧠 Generating embeddings...`);
      const embedStartTime = Date.now();
      
      const resumeEmbeddings = await generateEmbeddings(resumeChunks);
      console.log(`✅ Resume embeddings generated in ${Date.now() - embedStartTime}ms (${resumeEmbeddings.length} embeddings)`);
      
      const jobEmbedStartTime = Date.now();
      const jobDescriptionEmbeddings = await generateEmbeddings(jobDescriptionChunks);
      console.log(`✅ Job description embeddings generated in ${Date.now() - jobEmbedStartTime}ms (${jobDescriptionEmbeddings.length} embeddings)`);
      
      // Store embeddings
      console.log(`💾 Storing embeddings...`);
      const storeStartTime = Date.now();
      
      await storeEmbeddings(analysisId, 'resume', resumeEmbeddings);
      console.log(`✅ Resume embeddings stored in ${Date.now() - storeStartTime}ms`);
      
      const jobStoreStartTime = Date.now();
      await storeEmbeddings(analysisId, 'job', jobDescriptionEmbeddings);
      console.log(`✅ Job description embeddings stored in ${Date.now() - jobStoreStartTime}ms`);
      
      // Calculate match score using the new AI-based approach
      console.log(`📈 Calculating match score using AI semantic matching...`);
      const matchStartTime = Date.now();
      
      const matchResult = await calculateMatchScore(resumeText, jobDescriptionText);
      console.log(`✅ Match score calculated in ${Date.now() - matchStartTime}ms (${matchResult.score}%)`);
      
      // Update analysis with results
      analysis.status = 'completed';
      analysis.results = {
        matchScore: matchResult.score,
        strengths: matchResult.strengths,
        gaps: matchResult.gaps,
        insights: matchResult.insights,
        structuredAnalysis: matchResult.structuredAnalysis,
        resumeText,
        jobDescriptionText,
        processedAt: new Date()
      };
      analysisStorage[analysisId] = analysis;
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 Analysis completed successfully for ${analysisId} in ${totalTime}ms`);
      console.log(`📊 Final match score: ${matchResult.score}%`);
      
      res.status(200).json({
        message: 'Analysis completed successfully',
        analysisId,
        results: analysis.results,
        processingTime: `${totalTime}ms`
      });
    } catch (error: any) {
      console.error('💥 Error during analysis processing:', error);
      analysis.status = 'error';
      analysis.error = error.message || 'Unknown error';
      analysisStorage[analysisId] = analysis;
      
      res.status(500).json({ 
        error: 'Error during analysis processing',
        details: error.message || 'Unknown error'
      });
    } finally {
      // Remove from processing queue
      processingQueue.delete(analysisId);
      console.log(`🧹 Cleaned up processing queue for ${analysisId}`);
    }
  } catch (error) {
    console.error('💥 Error in analyzeResume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalysis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Getting analysis for ID: ${id}`);
    
    if (!id || !analysisStorage[id]) {
      console.log(`❌ Analysis not found for ID: ${id}`);
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    const analysis = analysisStorage[id];
    console.log(`✅ Found analysis for ID: ${id} with status: ${analysis.status}`);
    
    res.status(200).json({
      analysis
    });
  } catch (error) {
    console.error('💥 Error in getAnalysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  console.log('🩺 Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeAnalyses: Object.keys(analysisStorage).length,
    processingQueue: Array.from(processingQueue)
  });
};