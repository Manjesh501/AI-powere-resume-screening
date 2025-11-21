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
      
      // Retry mechanism for analysis
      let analysisSuccess = false;
      let retries = 0;
      const maxRetries = 5;
      
      while (!analysisSuccess && retries < maxRetries) {
        try {
          // Start analysis
          await analyzeResume(analysisId);
          analysisSuccess = true;
          // Navigate to analysis page
          navigate(`/analysis/${analysisId}`);
        } catch (error: any) {
          retries++;
          console.error(`Attempt ${retries} failed:`, error);
          
          // If it's the last retry, show the error
          if (retries >= maxRetries) {
            throw new Error(`Analysis failed after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
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
    </div>
  );
};

export default HomePage;