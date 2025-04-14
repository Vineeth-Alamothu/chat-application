"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  TelepartyClient,
  type SocketEventHandler,
  SocketMessageTypes,
  type SessionChatMessage,
} from "teleparty-websocket-lib"
import Message from "./Message"
import TypingIndicator from "./TypingIndicator"
import "../styles/ChatRoom.css"

// Define interfaces based on the documentation
interface SendMessageData {
  body: string
}

interface SetTypingMessageData {
  typing: boolean
}

interface TypingMessageData {
  anyoneTyping: boolean
  usersTyping: string[]
}

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<TelepartyClient | null>(null)
  const [messages, setMessages] = useState<SessionChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isJoining, setIsJoining] = useState(true) // Start with joining state
  const [error, setError] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [usersTyping, setUsersTyping] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const roomIdRef = useRef<string | undefined>(roomId)
  const clientRef = useRef<TelepartyClient | null>(null)

  // Get user info from localStorage
  const userNickname = localStorage.getItem("userNickname") || "Anonymous"
  const userIcon = localStorage.getItem("userIcon") || ""

  // Initialize client and set up event handlers
  useEffect(() => {
    console.log("Initializing client...")

    // Set a timeout for connection
    connectionTimeoutRef.current = setTimeout(() => {
      setError("Connection timeout. Please try refreshing the page.")
      setIsJoining(false)
    }, 15000) // 15 seconds timeout

    const joinChatRoom = async (client: TelepartyClient) => {
      if (!roomIdRef.current) {
        setError("Invalid room ID")
        setIsJoining(false)
        return
      }

      try {
        console.log("Joining chat room:", roomIdRef.current)

        // Join the chat room with nickname and userIcon
        await client.joinChatRoom(userNickname, roomIdRef.current, userIcon || undefined)

        console.log("Successfully joined chat room")
        setIsConnected(true)
        setIsJoining(false)

        // We'll identify our own messages by comparing nicknames
        setCurrentUserId("current-user")

        // Add welcome message
        const welcomeMessage: SessionChatMessage = {
          isSystemMessage: true,
          body: `Welcome to room ${roomIdRef.current}! You've joined as ${userNickname}`,
          permId: "system",
          timestamp: Date.now(),
          userNickname: "System",
        }
        setMessages([welcomeMessage])
      } catch (err) {
        console.error("Failed to join chat room:", err)
        setError(`Failed to join chat room: ${err instanceof Error ? err.message : "Unknown error"}`)
        setIsJoining(false)
      }
    }

    // Create event handler
    const eventHandler: SocketEventHandler = {
      onConnectionReady: async () => {
        console.log("Connection established")

        // Clear any pending timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
        }

        // Join the chat room now that the connection is ready
        if (clientRef.current) {
          await joinChatRoom(clientRef.current)
        }
      },
      onClose: () => {
        console.log("Connection closed")
        setIsConnected(false)
        setError("Disconnected from chat room")
      },
      onMessage: (message) => {
        console.log("Received message:", message)
        if (message.type === SocketMessageTypes.SEND_MESSAGE) {
          const chatMessage = message.data as SessionChatMessage

          // If this is our own message, store the permId for future reference
          if (chatMessage.userNickname === userNickname && !chatMessage.isSystemMessage) {
            setCurrentUserId(chatMessage.permId)
          }

          setMessages((prevMessages) => [...prevMessages, chatMessage])
        } else if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
          const typingData = message.data as TypingMessageData
          setUsersTyping(typingData.usersTyping)
        }
      },
    }

    // Create a new client instance with the event handler
    const newClient = new TelepartyClient(eventHandler)
    setClient(newClient)
    clientRef.current = newClient

    return () => {
      // Clean up on component unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }

      if (clientRef.current) {
        try {
          // If there's a way to notify the server we're leaving, do it here
        } catch (err) {
          console.error("Error during cleanup:", err)
        }
      }
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!messageInput.trim() || !client || !isConnected) return

    try {
      const messageData: SendMessageData = {
        body: messageInput,
      }

      await client.sendMessage(SocketMessageTypes.SEND_MESSAGE, messageData)
      setMessageInput("")

      // Reset typing status
      setIsTyping(false)
      if (client) {
        const typingData: SetTypingMessageData = { typing: false }
        client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      setError("Failed to send message")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)

    // Handle typing indicator
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true)
      if (client) {
        const typingData: SetTypingMessageData = { typing: true }
        client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
      }
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        if (client) {
          const typingData: SetTypingMessageData = { typing: false }
          client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
        }
      }
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  const copyRoomIdToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId)
      // Show temporary notification (could be improved with a toast)
      const roomIdElement = document.getElementById("room-id-text")
      if (roomIdElement) {
        const originalText = roomIdElement.textContent
        roomIdElement.textContent = "Copied!"
        setTimeout(() => {
          if (roomIdElement && originalText) {
            roomIdElement.textContent = originalText
          }
        }, 2000)
      }
    }
  }

  const leaveRoom = () => {
    navigate("/")
  }

  return (
    <div className="chat-room">
      <div className="chat-header">
        <div className="room-info">
          <h2>TeleChat</h2>
          <div className="room-id" onClick={copyRoomIdToClipboard}>
            <span>Room ID: </span>
            <span id="room-id-text" className="room-id-value">
              {roomId}
            </span>
            <span className="copy-icon">📋</span>
          </div>
        </div>
        <div className="user-info">
          <span className="user-nickname">{userNickname}</span>
          {userIcon ? (
            <img src={userIcon || "/placeholder.svg"} alt="User avatar" className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">{userNickname.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="chat-messages">
        {isJoining ? (
          <div className="connecting-message">Connecting to chat room...</div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message
                key={index}
                message={message}
                isOwnMessage={message.userNickname === userNickname && !message.isSystemMessage}
                userNickname={userNickname}
                userIcon={userIcon}
              />
            ))}
            {usersTyping.length > 0 && !usersTyping.includes(currentUserId) && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="chat-input">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button className="send-button" onClick={sendMessage} disabled={!isConnected || !messageInput.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatRoom
