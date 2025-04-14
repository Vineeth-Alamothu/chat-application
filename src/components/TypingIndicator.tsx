import type React from "react"
import "../styles/TypingIndicator.css"

const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-indicator">
      <div className="typing-animation">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="typing-text">Someone is typing...</span>
    </div>
  )
}

export default TypingIndicator
