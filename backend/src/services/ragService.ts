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
      // Test the model with a simple request
      await model.generateContent('Hello');
      console.log(`✅ Model ${modelName} is available and working`);
      workingModel = model;
      workingModelName = modelName;
      return { model, modelName };
    } catch (error) {
      console.log(`⚠️  Model ${modelName} not available: ${(error as Error).message}`);
      continue;
    }
  }
  
  // If none of our preferred models work, try to get any available model
  try {
    console.log('🔄 Trying to list available models...');
    // As a fallback, try the project default model
    const fallbackModelName = 'models/gemini-2.0-flash';
    console.log(`🧪 Testing fallback model: ${fallbackModelName}`);
    const model = genAI.getGenerativeModel({ model: fallbackModelName });
    await model.generateContent('Hello');
    console.log(`✅ Fallback model ${fallbackModelName} is working`);
    workingModel = model;
    workingModelName = fallbackModelName;
    return { model, modelName: fallbackModelName };
  } catch (error) {
    console.log(`⚠️  Fallback model also failed: ${(error as Error).message}`);
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
  
  try {
    const { model, modelName } = await getBestModel();
    console.log(`🤖 Using model ${modelName} for embedding generation`);
    
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStartTime = Date.now();
      
      try {
        console.log(`📝 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        // Generate a pseudo-embedding using Gemini (in practice, you'd use an embedding model)
        const prompt = `Generate a numerical representation for this text: "${chunk}". Respond with only numbers separated by commas.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the response into numbers
        const embedding = text.split(',').map((num: string) => parseFloat(num.trim()) || 0);
        
        embeddings.push({
          id: i,
          text: chunk,
          embedding: embedding
        });
        
        console.log(`✅ Chunk ${i + 1} processed in ${Date.now() - chunkStartTime}ms`);
      } catch (chunkError: any) {
        console.error(`💥 Error processing chunk ${i + 1}:`, chunkError.message);
        // Fallback to mock embedding for this chunk
        embeddings.push({
          id: i,
          text: chunk,
          embedding: Array(100).fill(0).map(() => Math.random())
        });
      }
    }
    
    console.log(`🎉 All ${embeddings.length} embeddings generated in ${Date.now() - startTime}ms`);
    return embeddings;
  } catch (error) {
    console.error('💥 Error generating embeddings:', error);
    // Fallback to mock implementation
    return chunks.map((chunk, index) => ({
      id: index,
      text: chunk,
      embedding: Array(100).fill(0).map(() => Math.random())
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
  
  try {
    const { model, modelName } = await getBestModel();
    console.log(`🤖 Using model ${modelName} for query embedding generation`);
    
    // Generate embedding for the query
    const prompt = `Generate a numerical representation for this text: "${query}". Respond with only numbers separated by commas.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const queryText = response.text();
    
    // Parse the response into numbers
    const queryEmbedding = queryText.split(',').map((num: string) => parseFloat(num.trim()) || 0);
    
    // Search for similar embeddings in both resume and job description
    const resumeEmbeddings = vectorStore[`${analysisId}_resume`] || [];
    const jobEmbeddings = vectorStore[`${analysisId}_job`] || [];
    const allEmbeddings = [...resumeEmbeddings, ...jobEmbeddings];
    
    console.log(`📊 Searching through ${allEmbeddings.length} embeddings`);
    
    // Simple cosine similarity calculation
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
  
  try {
    const { model, modelName } = await getBestModel();
    console.log(`🤖 Using model ${modelName} for response generation`);
    
    const contextText = context.map(item => item.text || item).join('\n\n');
    const prompt = `Based on the following context, please answer the question: "${question}"

Context:
${contextText}

Answer in a concise and focused manner. Provide only the most relevant information. Format as a list if appropriate. Keep the response under 100 words.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();
    
    console.log(`✅ Response generated in ${Date.now() - startTime}ms`);
    return answer;
  } catch (error) {
    console.error('💥 Error generating response:', error);
    // Fallback to a more concise response based on the context
    const contextText = context.map(item => item.text || item).join('\n\n');
    
    // Extract skills, experience, and education more effectively
    const skillsPattern = /(?:skills|technical skills|proficiency|knowledge|familiarity|experience):\s*([^\n\r]+)/i;
    const experiencePattern = /(?:experience|professional experience|work experience):\s*([^\n\r]+)/i;
    const educationPattern = /(?:education|degree|bachelor|master):\s*([^\n\r]+)/i;
    
    const skillsMatch = contextText.match(skillsPattern);
    const experienceMatch = contextText.match(experiencePattern);
    const educationMatch = contextText.match(educationPattern);
    
    // For the specific question about skills, provide a focused answer
    if (question.toLowerCase().includes('skill')) {
      if (skillsMatch) {
        // Extract individual skills from the skills section
        const skillsText = skillsMatch[1];
        const skillItems = skillsText.split(/[,;]|and/i).map(skill => skill.trim()).filter(skill => skill.length > 0);
        return `Key skills: ${skillItems.slice(0, 5).join(', ')}`;
      } else {
        // Fallback to extracting common technical terms
        const technicalTerms = ['AWS', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Python', 'Bash', 'Linux', 
                              'Jenkins', 'GitLab', 'CI/CD', 'Monitoring', 'Prometheus', 'Grafana', 'Cloud'];
        const foundSkills = technicalTerms.filter(term => 
          contextText.toLowerCase().includes(term.toLowerCase())
        );
        if (foundSkills.length > 0) {
          return `Identified skills: ${foundSkills.slice(0, 5).join(', ')}`;
        }
      }
    }
    
    // For general questions, provide a concise summary
    let fallbackResponse = '';
    
    if (skillsMatch) {
      fallbackResponse += `Skills: ${skillsMatch[1].substring(0, 50)}...\n`;
    }
    
    if (experienceMatch) {
      fallbackResponse += `Experience: ${experienceMatch[1].substring(0, 50)}...\n`;
    }
    
    if (educationMatch) {
      fallbackResponse += `Education: ${educationMatch[1].substring(0, 50)}...\n`;
    }
    
    if (!fallbackResponse) {
      fallbackResponse = "Based on the provided context, I can see information about a candidate. For your specific question, I would need more detailed context to provide a precise answer.";
    }
    
    return fallbackResponse.trim();
  }
};