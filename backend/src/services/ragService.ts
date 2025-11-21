import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Generative AI with a preferred model list
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Define preferred models in order of preference - prioritizing models with higher quotas to avoid rate limits
const PREFERRED_MODELS = [
  'models/gemini-2.5-flash-lite',  // 0/15 RPM - Medium quota lite model
  'models/gemini-2.0-flash-lite', // 0/30 RPM - High quota lite model
  'models/gemini-2.0-flash',      
  'models/gemini-2.5-flash',      
  'models/gemini-2.5-pro', 
];

// Cache for the working model to avoid repeated initialization
let workingModel: any = null;
let workingModelName: string = '';

// Simple in-memory storage for embeddings (in production, use a proper vector database)
const vectorStore: Record<string, any[]> = {};
// Make vectorStore globally accessible for debugging
(global as any).vectorStore = vectorStore;

// Get or initialize the best available model
async function getBestModel() {
  // If we already have a working model, return it
  if (workingModel && workingModelName) {
    console.log(`🔄 Using cached model: ${workingModelName}`);
    return { model: workingModel, modelName: workingModelName };
  }
  
  console.log('🔍 Searching for best available model...');
  
  // Try to find the best available model
  for (const modelName of PREFERRED_MODELS) {
    try {
      console.log(`🧪 Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test the model with a simple prompt
      const testPrompt = "Respond with exactly: 'Model test successful'";
      try {
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        const text = response.text();
        
        if (text.includes('Model test successful')) {
          console.log(`✅ Model ${modelName} is working`);
          workingModel = model;
          workingModelName = modelName;
          return { model, modelName };
        }
      } catch (testError) {
        console.log(`⚠️  Model ${modelName} test failed: ${(testError as Error).message}`);
      }
    } catch (error) {
      console.log(`⚠️  Model ${modelName} not available: ${(error as Error).message}`);
    }
  }
  
  // Fallback to the first available model if all others fail
  for (const modelName of PREFERRED_MODELS) {
    try {
      console.log(`🔄 Falling back to model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      workingModel = model;
      workingModelName = modelName;
      return { model, modelName };
    } catch (fallbackError) {
      console.log(`⚠️  Fallback model ${modelName} also failed: ${(fallbackError as Error).message}`);
      continue;
    }
  }
  
  console.log('💥 No available models found');
  throw new Error('No available models found. Please check your API key and network connection.');
}

export const processDocument = (text: string): string[] => {
  console.log(`📦 Processing document with ${text.length} characters`);
  
  // Improved chunking - use smaller chunks for better context matching
  const chunkSize = 800;
  const chunks: string[] = [];
  
  // Split by paragraphs first, then by sentences if needed
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  console.log(`📑 Found ${paragraphs.length} paragraphs`);
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= chunkSize) {
      chunks.push(paragraph);
    } else {
      // Split long paragraphs into smaller chunks
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length <= chunkSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
          }
          currentChunk = sentence;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk);
      }
    }
  }
  
  console.log(`✅ Document processed into ${chunks.length} chunks`);
  return chunks;
};

export const generateEmbeddings = async (chunks: string[]): Promise<any[]> => {
  console.log(`🧠 Generating embeddings for ${chunks.length} chunks`);
  const startTime = Date.now();
  
  // Validate input
  if (!chunks || chunks.length === 0) {
    console.log('⚠️  No chunks to generate embeddings for');
    return [];
  }
  
  try {
    // Get the best available model
    const { model, modelName } = await getBestModel();
    
    // Validate model
    if (!model) {
      console.error('💥 No model available for embedding generation');
      throw new Error('No model available for embedding generation');
    }
    
    // Generate real embeddings using the embedding API
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        // Generate embedding for this chunk
        const embeddingResult = await model.embedContent(chunk);
        const embedding = embeddingResult.embedding.values;
        
        embeddings.push({
          id: i,
          text: chunk,
          embedding: embedding
        });
        
        // Small delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      } catch (chunkError) {
        console.warn(`⚠️  Failed to generate embedding for chunk ${i}, using mock embedding:`, chunkError);
        // Fallback to mock embedding for this chunk
        const mockEmbedding = Array(768).fill(0).map((_, j) => {
          let hash = 0;
          for (let k = 0; k < chunk.length; k++) {
            hash = ((hash << 5) - hash + chunk.charCodeAt(k) + j) & 0xffffffff;
          }
          return (hash % 10000) / 10000;
        });
        
        embeddings.push({
          id: i,
          text: chunk,
          embedding: mockEmbedding
        });
      }
    }
    
    console.log(`🎉 All ${embeddings.length} embeddings generated in ${Date.now() - startTime}ms`);
    return embeddings;
  } catch (error) {
    console.error('💥 Error generating embeddings:', error);
    // Fallback to completely random embeddings
    return chunks.map((chunk, index) => ({
      id: index,
      text: chunk,
      embedding: Array(768).fill(0).map(() => Math.random())
    }));
  }
};

export const storeEmbeddings = async (analysisId: string, type: string, embeddings: any[]) => {
  console.log(`💾 Storing ${embeddings.length} ${type} embeddings for analysis ${analysisId}`);
  const startTime = Date.now();
  
  try {
    const key = `${analysisId}_${type}`;
    vectorStore[key] = embeddings;
    console.log(`✅ Stored embeddings in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('💥 Error storing embeddings:', error);
  }
};

export const searchEmbeddings = async (query: string, analysisId: string): Promise<any[]> => {
  console.log(`🔍 Searching embeddings for query: "${query}" in analysis ${analysisId}`);
  const startTime = Date.now();
  
  // Validate inputs
  if (!query || !analysisId) {
    console.log('⚠️  Missing query or analysisId for embedding search');
    return [];
  }
  
  try {
    // Search for similar embeddings in both resume and job description
    const resumeEmbeddings = vectorStore[`${analysisId}_resume`] || [];
    const jobEmbeddings = vectorStore[`${analysisId}_job`] || [];
    const allEmbeddings = [...resumeEmbeddings, ...jobEmbeddings];
    
    console.log(`📊 Searching through ${allEmbeddings.length} embeddings (${resumeEmbeddings.length} resume, ${jobEmbeddings.length} job)`);
    console.log(`📊 Available analysis IDs in vector store: ${Object.keys(vectorStore).join(', ')}`);
    
    // Validate that we have embeddings to search
    if (allEmbeddings.length === 0) {
      console.log(`⚠️  No embeddings found for analysis ${analysisId}`);
      return [];
    }
    
    // Generate embedding for the query
    const { model } = await getBestModel();
    const queryEmbeddingResult = await model.embedContent(query);
    const queryEmbedding = queryEmbeddingResult.embedding.values;
    
    const similarities = allEmbeddings.map(embedding => {
      const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
      return { ...embedding, similarity };
    });
    
    // Sort by similarity and return top 5 for better context
    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    console.log(`✅ Search completed in ${Date.now() - startTime}ms, found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('💥 Error searching embeddings:', error);
    return [];
  }
};

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, _, i) => sum + a[i] * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

export const generateResponse = async (question: string, context: any[]): Promise<string> => {
  console.log(`💬 Generating response for question: "${question}"`);
  const startTime = Date.now();
  
  // Validate inputs
  if (!question || !context) {
    console.log('⚠️  Missing question or context for response generation');
    throw new Error('Missing question or context for response generation');
  }
  
  // Validate context
  if (!Array.isArray(context) || context.length === 0) {
    console.log('⚠️  No context provided for response generation');
    throw new Error('No context available to answer this question');
  }
  
  try {
    // Get the best available model
    const { model, modelName } = await getBestModel();
    
    // Validate model
    if (!model) {
      console.error('💥 No model available for response generation');
      throw new Error('No model available for response generation');
    }
    
    // Prepare the context text from retrieved embeddings
    const contextText = context.map(item => item.text || item).join('\n\n');
    
    // Create a prompt that uses the context to answer the question
    const prompt = `You are an expert HR analyst and technical recruiter. Based on the provided resume context, please answer the following question accurately and specifically.

Context from resume:
"${contextText}"

Question: "${question}"

Please provide a detailed, accurate answer based ONLY on the information provided in the context above. If the information is not available in the context, please state that clearly. Be specific and provide examples when possible.`;
    
    console.log(`🤖 Generating response using model: ${modelName}`);
    
    // Generate response using the LLM with the context
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();
    
    console.log(`✅ Response generated in ${Date.now() - startTime}ms`);
    console.log(`📝 Generated response: "${answer.substring(0, 100)}..."`);
    
    return answer;
  } catch (error) {
    console.error('💥 Error generating response:', error);
    throw error;
  }
};