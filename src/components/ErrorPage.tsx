import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ErrorPage.css';

const ErrorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    // Clear all chat history and room-related data from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('chat_history_') || key === 'lastRoomId')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Navigate to home page
    navigate('/');
  };

  return (
    <div className="error-container">
      <div className="error-content">
        <h1>Oops! Room Not Found</h1>
        <p>The chat room you're looking for doesn't exist or has been removed.</p>
        <button 
          className="home-button"
          onClick={handleReturnHome}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default ErrorPage; 