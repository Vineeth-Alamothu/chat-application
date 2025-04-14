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
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [usersTyping, setUsersTyping] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const roomIdRef = useRef<string | undefined>(roomId)
  const clientRef = useRef<TelepartyClient | null>(null)

  // Use refs instead of variables for static localStorage values
  const userNicknameRef = useRef(localStorage.getItem("userNickname") || "Anonymous")
  const userIconRef = useRef(localStorage.getItem("userIcon") || "")

  useEffect(() => {
    console.log("Initializing client...")

    connectionTimeoutRef.current = setTimeout(() => {
      setError("Connection timeout. Please try refreshing the page.")
      setIsJoining(false)
    }, 15000)

    const joinChatRoom = async (client: TelepartyClient) => {
      if (!roomIdRef.current) {
        setError("Invalid room ID")
        setIsJoining(false)
        return
      }

      try {
        console.log("Joining chat room:", roomIdRef.current)

        await client.joinChatRoom(
          userNicknameRef.current,
          roomIdRef.current,
          userIconRef.current || undefined
        )

        console.log("Successfully joined chat room")
        setIsConnected(true)
        setIsJoining(false)
        setCurrentUserId("current-user")

        const welcomeMessage: SessionChatMessage = {
          isSystemMessage: true,
          body: `Welcome to room ${roomIdRef.current}! You've joined as ${userNicknameRef.current}`,
          permId: "system",
          timestamp: Date.now(),
          userNickname: "System",
        }
        setMessages([welcomeMessage])
      } catch (err) {
        console.error("Failed to join chat room:", err)
        setError(
          `Failed to join chat room: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        )
        setIsJoining(false)
      }
    }

    const eventHandler: SocketEventHandler = {
      onConnectionReady: async () => {
        console.log("Connection established")
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
        }
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

          if (
            chatMessage.userNickname === userNicknameRef.current &&
            !chatMessage.isSystemMessage
          ) {
            setCurrentUserId(chatMessage.permId)
          }

          setMessages((prevMessages) => [...prevMessages, chatMessage])
        } else if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
          const typingData = message.data as TypingMessageData
          setUsersTyping(typingData.usersTyping)
        }
      },
    }

    const newClient = new TelepartyClient(eventHandler)
    setClient(newClient)
    clientRef.current = newClient

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
    }
  }, [])

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

    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true)
      if (client) {
        const typingData: SetTypingMessageData = { typing: true }
        client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

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
          <span className="user-nickname">{userNicknameRef.current}</span>
          {userIconRef.current ? (
            <img
              src={userIconRef.current || "/placeholder.svg"}
              alt="User avatar"
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar-placeholder">
              {userNicknameRef.current.charAt(0).toUpperCase()}
            </div>
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
                isOwnMessage={
                  message.userNickname === userNicknameRef.current &&
                  !message.isSystemMessage
                }
                userNickname={userNicknameRef.current}
                userIcon={userIconRef.current}
              />
            ))}
            {usersTyping.length > 0 &&
              !usersTyping.includes(currentUserId) && <TypingIndicator />}
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
        <button
          className="send-button"
          onClick={sendMessage}
          disabled={!isConnected || !messageInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatRoom
