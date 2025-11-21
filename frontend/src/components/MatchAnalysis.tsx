import React from 'react';
import './MatchAnalysis.css';

interface MatchAnalysisProps {
  data: {
    matchScore: number;
    strengths: string[];
    gaps: string[];
    insights: string[];
    structuredAnalysis: any;
  };
}

const MatchAnalysis = ({ data }: MatchAnalysisProps) => {
  const { matchScore, strengths, gaps, insights, structuredAnalysis } = data;

  // If we have structured analysis, use that instead
  if (structuredAnalysis && structuredAnalysis.overallMatch !== 'N/A') {
    return (
      <div className="match-analysis">
        <div className="section">
          <h2>Resume Analysis</h2>
          <div className="score-display">
            <div dangerouslySetInnerHTML={{ __html: structuredAnalysis.overallMatch.replace('⭐', '⭐<br />') }} />
          </div>
        </div>

        <div className="section strengths">
          <h3>✅ Strengths Identified</h3>
          <ul>
            {structuredAnalysis.strengths.map((strength: string, index: number) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="section gaps">
          <h3>❌ Gaps Identified</h3>
          <ul>
            {structuredAnalysis.gaps.map((gap: string, index: number) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </div>

        <div className="section insights">
          <h3>📝 Key Insights</h3>
          <ul>
            {structuredAnalysis.insights.map((insight: string, index: number) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>

        <div className="section summary">
          <h3>🎯 Resume Summary (Extracted Automatically)</h3>
          <p>{structuredAnalysis.summary}</p>
        </div>
      </div>
    );
  }

  // Fallback to basic display
  return (
    <div className="match-analysis">
      <div className="section">
        <h2>Resume Analysis</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score">{matchScore}%</span>
            <span className="score-label">Match</span>
          </div>
        </div>
      </div>

      {strengths && strengths.length > 0 && (
        <div className="section strengths">
          <h3>✅ Strengths</h3>
          <ul>
            {strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {gaps && gaps.length > 0 && (
        <div className="section gaps">
          <h3>❌ Gaps</h3>
          <ul>
            {gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="section insights">
          <h3>Key Insights</h3>
          <ul>
            {insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;