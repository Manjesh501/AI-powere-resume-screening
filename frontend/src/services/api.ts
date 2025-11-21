import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

export const uploadFiles = async (formData: FormData) => {
  try {
    const response = await api.post('/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error: any) {
    console.error('Error uploading files:', error);
    throw new Error(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

export const analyzeResume = async (analysisId: string) => {
  try {
    const response = await api.post('/resume/analyze', { analysisId }, {
      timeout: 60000, // 60 second timeout for analysis
    });
    return response.data;
  } catch (error: any) {
    console.error('Error analyzing resume:', error);
    throw new Error(`Analysis failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

export const getAnalysis = async (id: string) => {
  try {
    const response = await api.get(`/resume/analysis/${id}`, {
      timeout: 10000, // 10 second timeout
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    throw new Error(`Failed to fetch analysis: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

export const askQuestion = async (analysisId: string, question: string) => {
  try {
    const response = await api.post('/chat/ask', { analysisId, question }, {
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error: any) {
    console.error('Error asking question:', error);
    throw new Error(`Question failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

export const getChatHistory = async (analysisId: string) => {
  try {
    const response = await api.get(`/chat/history/${analysisId}`, {
      timeout: 10000, // 10 second timeout
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    throw new Error(`Failed to fetch chat history: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

export default api;