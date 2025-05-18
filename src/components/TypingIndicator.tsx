import React, { useEffect } from "react"
import { SessionChatMessage } from "teleparty-websocket-lib"
import "../styles/TypingIndicator.css"

interface TypingIndicatorProps {
  typingUsers: string[]
  messages: SessionChatMessage[]
  typingUsersMap: { [key: string]: string }
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, messages, typingUsersMap }) => {
  useEffect(() => {
    console.log('TypingIndicator Debug:', {
      typingUsers,
      typingUsersMap,
      messages: messages.slice(-5)
    })
  }, [typingUsers, typingUsersMap, messages])

  if (typingUsers.length === 0) return null

  const getUserName = (userId: string): string => {
    if (typingUsersMap[userId]) {
      return typingUsersMap[userId]
    }

    const recentMessage = messages
      .slice()
      .reverse()
      .find(m => m.permId === userId)
    
    if (recentMessage?.userNickname) {
      return recentMessage.userNickname
    }

    return "A user"
  }

  const typingNames = typingUsers.map(userId => getUserName(userId))

  return (
    <div className="typing-indicator">
      {typingNames.map((nickname, index) => (
        <span key={typingUsers[index]}>
          {nickname}
          {index < typingNames.length - 2 ? ", " : 
           index === typingNames.length - 2 ? " and " : ""}
        </span>
      ))}
      {typingNames.length === 1 ? " is " : " are "}typing...
    </div>
  )
}

export default TypingIndicator
