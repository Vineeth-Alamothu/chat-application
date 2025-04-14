import type React from "react"
import type { SessionChatMessage } from "teleparty-websocket-lib"
import "../styles/Messages.css"

interface MessageProps {
  message: SessionChatMessage
  isOwnMessage: boolean
  userNickname: string
  userIcon: string
}

const Message: React.FC<MessageProps> = ({ message, isOwnMessage, userNickname, userIcon }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (message.isSystemMessage) {
    return (
      <div className="message system-message">
        <div className="message-content">
          <p>{message.body}</p>
        </div>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    )
  }

  // For own messages that don't have userNickname/userIcon from the server
  const displayNickname = isOwnMessage ? message.userNickname || userNickname : message.userNickname || "Unknown User"

  const displayIcon = isOwnMessage ? message.userIcon || userIcon : message.userIcon

  return (
    <div className={`message ${isOwnMessage ? "own-message" : "other-message"}`}>
      {!isOwnMessage && (
        <div className="message-avatar">
          {displayIcon ? (
            <img src={displayIcon || "/placeholder.svg"} alt="User avatar" />
          ) : (
            <div className="avatar-placeholder">{displayNickname.charAt(0).toUpperCase()}</div>
          )}
        </div>
      )}

      <div className="message-bubble">
        {!isOwnMessage && <div className="message-nickname">{displayNickname}</div>}
        <div className="message-content">
          <p>{message.body}</p>
        </div>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}

export default Message
