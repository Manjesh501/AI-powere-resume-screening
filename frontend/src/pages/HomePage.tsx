import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { uploadFiles, analyzeResume } from '../services/api';
import './HomePage.css';

const HomePage = () => {
  const [resume, setResume] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!resume || !jobDescription) {
      alert('Please select both resume and job description files');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create FormData and upload files to backend
      const formData = new FormData();
      formData.append('resume', resume);
      formData.append('jobDescription', jobDescription);
      
      const uploadResponse = await uploadFiles(formData);
      const { analysisId } = uploadResponse;
      
      // Improved retry mechanism for analysis with better error handling
      let analysisSuccess = false;
      let retries = 0;
      const maxRetries = 8; // Increased retries
      const baseDelay = 1500; // Base delay of 1.5 seconds
      
      while (!analysisSuccess && retries < maxRetries) {
        try {
          console.log(`Attempt ${retries + 1} to analyze resume...`);
          // Start analysis
          await analyzeResume(analysisId);
          analysisSuccess = true;
          console.log('Analysis successful!');
          // Navigate to analysis page
          navigate(`/analysis/${analysisId}`);
        } catch (error: any) {
          retries++;
          console.error(`Attempt ${retries} failed:`, error);
          
          // If it's a 404 error, wait longer as it might be a timing issue
          if (error.message && error.message.includes('404')) {
            console.log('404 error detected, waiting longer before retry...');
          }
          
          // If it's the last retry, show the error
          if (retries >= maxRetries) {
            throw new Error(`Analysis failed after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(1.5, retries) + Math.random() * 1000;
          console.log(`Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert(`Error uploading files: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="home-page">
      <h1>Resume Screening Tool</h1>
      <p>Upload a resume and job description to get an instant match score</p>
      
      <div className="upload-section">
        <FileUpload 
          label="Upload Resume (PDF/TXT)" 
          onFileSelect={setResume} 
        />
        <FileUpload 
          label="Upload Job Description (PDF/TXT)" 
          onFileSelect={setJobDescription} 
        />
      </div>
      
      <button 
        onClick={handleUpload} 
        className="analyze-button"
        disabled={isUploading}
      >
        {isUploading ? 'Analyzing...' : 'Analyze Resume'}
      </button>
      
      <div className="info-section">
        <p><strong>Note:</strong> Analysis may take a few moments. Please be patient.</p>
      </div>
    </div>
  );
};

export default HomePage;