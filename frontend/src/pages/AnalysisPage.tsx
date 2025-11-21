import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAnalysis } from '../services/api';
import MatchAnalysis from '../components/MatchAnalysis';
import ChatInterface from '../components/ChatInterface';
import './AnalysisPage.css';

const AnalysisPage = () => {
  const { id } = useParams<{ id: string }>();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        if (!id) {
          throw new Error('No analysis ID provided');
        }
        
        const response = await getAnalysis(id);
        setAnalysisData(response.analysis.results);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to load analysis data');
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  if (loading) {
    return <div className="analysis-page">Loading analysis...</div>;
  }

  if (error) {
    return <div className="analysis-page">Error: {error}</div>;
  }

  return (
    <div className="analysis-page">
      <h1>Resume Analysis</h1>
      {analysisData && (
        <>
          <MatchAnalysis data={analysisData} />
          <ChatInterface analysisId={id || ''} />
        </>
      )}
    </div>
  );
};

export default AnalysisPage;