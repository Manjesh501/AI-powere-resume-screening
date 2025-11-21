import React, { useState, useEffect } from 'react';
import { askQuestion, getChatHistory } from '../services/api';
import './ChatInterface.css';

interface ChatInterfaceProps {
  analysisId: string;
}

interface ChatEntry {
  question: string;
  answer: string;
  timestamp: string;
}

const ChatInterface = ({ analysisId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hello! Ask me anything about this candidate.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState<string>('');

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await getChatHistory(analysisId);
        if (response.history && response.history.length > 0) {
          const historyMessages = response.history.flatMap((entry: ChatEntry) => [
            { text: entry.question, isUser: true },
            { text: entry.answer, isUser: false }
          ]);
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [analysisId]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = { text: inputValue, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    const question = inputValue;
    setInputValue('');

    try {
      // Send question to backend and get response from RAG system
      const response = await askQuestion(analysisId, question);
      const botMessage = { 
        text: response.answer, 
        isUser: false 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage = { 
        text: "Sorry, I encountered an error while processing your question. Please try again.", 
        isUser: false 
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-interface">
      <h2>Ask Questions About This Candidate</h2>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.isUser ? 'user' : 'bot'}`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question here..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatInterface;