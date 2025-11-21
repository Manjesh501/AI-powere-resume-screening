import axios from 'axios';

// Use environment variable if available, otherwise default to localhost:3000
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

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
    if (error.response) {
      // Server responded with error status
      throw new Error(`Upload failed: ${error.response.status} - ${error.response.data?.error || error.message || 'Server error'}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Upload failed: No response from server. Please check if the backend is running.');
    } else {
      // Something else happened
      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
    }
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
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 404) {
        // Specific handling for 404 errors
        throw new Error(`404: Analysis not found. This might be a timing issue. Please wait and try again.`);
      } else if (error.response.status === 500) {
        // Server error
        throw new Error(`Server error: ${error.response.data?.error || 'Internal server error'}`);
      } else {
        throw new Error(`Analysis failed: ${error.response.status} - ${error.response.data?.error || error.message || 'Server error'}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Analysis failed: No response from server. Please check if the backend is running.');
    } else {
      // Something else happened
      throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
    }
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
    if (error.response) {
      throw new Error(`Failed to fetch analysis: ${error.response.status} - ${error.response.data?.error || error.message || 'Server error'}`);
    } else if (error.request) {
      throw new Error('Failed to fetch analysis: No response from server. Please check if the backend is running.');
    } else {
      throw new Error(`Failed to fetch analysis: ${error.message || 'Unknown error'}`);
    }
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
    if (error.response) {
      throw new Error(`Question failed: ${error.response.status} - ${error.response.data?.error || error.message || 'Server error'}`);
    } else if (error.request) {
      throw new Error('Question failed: No response from server. Please check if the backend is running.');
    } else {
      throw new Error(`Question failed: ${error.message || 'Unknown error'}`);
    }
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
    if (error.response) {
      throw new Error(`Failed to fetch chat history: ${error.response.status} - ${error.response.data?.error || error.message || 'Server error'}`);
    } else if (error.request) {
      throw new Error('Failed to fetch chat history: No response from server. Please check if the backend is running.');
    } else {
      throw new Error(`Failed to fetch chat history: ${error.message || 'Unknown error'}`);
    }
  }
};

export default api;