import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  TelepartyClient,
  type SocketEventHandler,
  SocketMessageTypes,
  type SessionChatMessage as BaseSessionChatMessage,
} from "teleparty-websocket-lib"
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
  userId?: string
  userNickname?: string
  typingUsers?: { [key: string]: string }
}

interface SessionChatMessage extends BaseSessionChatMessage {
  isSent?: boolean
  userIcon?: string
}

const CHAT_HISTORY_KEY = "chat_history"
const MAX_HISTORY_MESSAGES = 50
const CONNECTION_TIMEOUT = 10000 
const RECONNECT_DELAY = 2000 
const MAX_RECONNECT_ATTEMPTS = 3 
const JOIN_DELAY = 1000 
const INITIAL_CONNECTION_DELAY = 2000 

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState<SessionChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [usersTyping, setUsersTyping] = useState<string[]>([])
  const [error, setError] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const isConnectingRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialConnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({})
  
  const clientRef = useRef<TelepartyClient | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const userNickname = useRef(localStorage.getItem("userNickname") || "Anonymous")
  const userIcon = useRef(localStorage.getItem("userIcon") || "")
  const functionsRef = useRef<{
    handleReconnect: () => void;
    handleTypingPresence: (data: TypingMessageData) => void;
    initializeConnection: () => void;
  }>({
    handleReconnect: () => {},
    handleTypingPresence: () => {},
    initializeConnection: () => {},
  });

  const handleTypingPresence = useCallback((typingData: TypingMessageData) => {
    const typingUsersList = typingData.usersTyping.filter(id => id !== currentUserId)
    setUsersTyping(typingUsersList)

    setTypingUsers(prev => {
      const newTypingUsers = { ...prev }
      
      if (typingData.typingUsers) {
        Object.assign(newTypingUsers, typingData.typingUsers)
      }
      
      if (typingData.userId && typingData.userNickname) {
        if (typingData.anyoneTyping) {
          newTypingUsers[typingData.userId] = typingData.userNickname
        } else {
          delete newTypingUsers[typingData.userId]
        }
      }

      typingUsersList.forEach(userId => {
        if (!newTypingUsers[userId]) {
          const message = messages.find(m => m.permId === userId)
          if (message?.userNickname) {
            newTypingUsers[userId] = message.userNickname
          }
        }
      })

      return newTypingUsers
    })
  }, [currentUserId, messages])
 
  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    setReconnectAttempts(prev => prev + 1)

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectTimeoutRef.current = setTimeout(() => {
        if (clientRef.current) {
          clientRef.current.teardown()
        }
        isConnectingRef.current = false
        hasJoinedRef.current = false
        functionsRef.current.initializeConnection()
      }, RECONNECT_DELAY)
    } else {
      navigate('/chat-application/error')
    }
  }, [reconnectAttempts, navigate])

  const initializeConnection = useCallback(() => {
    if (isConnectingRef.current) {
      return
    }

    if (!roomId) {
      navigate('/chat-application/error')
      return
    }

    isConnectingRef.current = true
    hasJoinedRef.current = false

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current)
    }
    if (initialConnectionTimeoutRef.current) {
      clearTimeout(initialConnectionTimeoutRef.current)
    }

    if (clientRef.current) {
      clientRef.current.teardown()
    }

    initialConnectionTimeoutRef.current = setTimeout(() => {
      connectionTimeoutRef.current = setTimeout(() => {
        isConnectingRef.current = false
        setError("Connection timeout. Please try again.")
        functionsRef.current.handleReconnect()
      }, CONNECTION_TIMEOUT)

      const eventHandler: SocketEventHandler = {
        onConnectionReady: () => {
          console.log("Connection ready")
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
          }

          joinTimeoutRef.current = setTimeout(() => {
            if (clientRef.current && roomId && !hasJoinedRef.current) {
              hasJoinedRef.current = true
              clientRef.current.joinChatRoom(
                userNickname.current,
                roomId,
                userIcon.current || undefined
              ).then(() => {
                setIsConnected(true)
                setError("")
                isConnectingRef.current = false
                setReconnectAttempts(0)
              }).catch((err) => {
                console.error("Failed to join room:", err)
                navigate('/chat-application/error')
                isConnectingRef.current = false
                hasJoinedRef.current = false
              })
            }
          }, JOIN_DELAY)
        },
        onClose: () => {
          console.log("Connection closed")
          setIsConnected(false)
          isConnectingRef.current = false
          hasJoinedRef.current = false
          
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current)
          }
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
          }
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            functionsRef.current.handleReconnect()
          } else {
            setError("Connection lost. Please refresh the page to try again.")
          }
        },
        onMessage: (message) => {
          if (message.type === SocketMessageTypes.SEND_MESSAGE) {
            const chatMessage = message.data as SessionChatMessage
            
            if (chatMessage.userNickname === userNickname.current && !chatMessage.isSystemMessage) {
              setCurrentUserId(chatMessage.permId)
              chatMessage.isSent = true
              chatMessage.userIcon = userIcon.current
            } else {
              chatMessage.isSent = false
            }

            if (!chatMessage.timestamp) {
              chatMessage.timestamp = Date.now()
            }

            if (!chatMessage.userIcon) {
              chatMessage.userIcon = `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatMessage.userNickname || 'User'}`
            }

            setMessages(prev => {
              const isDuplicate = prev.some(
                msg => msg.permId === chatMessage.permId && msg.timestamp === chatMessage.timestamp
              )
              return isDuplicate ? prev : [...prev, chatMessage]
            })

            if (chatMessage.userNickname && chatMessage.permId) {
              setTypingUsers(prev => {
                const newTypingUsers = { ...prev }
                delete newTypingUsers[chatMessage.permId]
                return newTypingUsers
              })
            }
          } else if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
            functionsRef.current.handleTypingPresence(message.data as TypingMessageData)
          }
        },
      }

      try {
        const newClient = new TelepartyClient(eventHandler)
        clientRef.current = newClient
      } catch (err) {
        console.error("Failed to create client:", err)
        isConnectingRef.current = false
        functionsRef.current.handleReconnect()
      }
    }, INITIAL_CONNECTION_DELAY)
  }, [roomId, reconnectAttempts, navigate])

  useEffect(() => {
    functionsRef.current = {
      handleReconnect,
      handleTypingPresence,
      initializeConnection,
    };
  }, [handleReconnect, handleTypingPresence, initializeConnection]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(`${CHAT_HISTORY_KEY}_${roomId}`)
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        setMessages(parsedHistory)
      } catch (err) {
        console.error("Failed to load chat history:", err)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (messages.length > 0) {
      const historyToSave = messages.slice(-MAX_HISTORY_MESSAGES)
      localStorage.setItem(`${CHAT_HISTORY_KEY}_${roomId}`, JSON.stringify(historyToSave))
    }
  }, [messages, roomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userNickname.current) {
      navigate("/chat-application")
      return
    }

    setReconnectAttempts(0)
    initializeConnection()

    return () => {
      // Clear all timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
      }
      if (initialConnectionTimeoutRef.current) {
        clearTimeout(initialConnectionTimeoutRef.current)
      }
      if (clientRef.current) {
        clientRef.current.teardown()
      }
      isConnectingRef.current = false
      hasJoinedRef.current = false
    }
  }, [initializeConnection, navigate])

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !clientRef.current || !isConnected) return

    try {
      const messageData: SendMessageData = {
        body: messageInput,
      }

      await clientRef.current.sendMessage(SocketMessageTypes.SEND_MESSAGE, messageData)
      setMessageInput("")
      setIsTyping(false)

      if (clientRef.current) {
        const typingData: SetTypingMessageData = { typing: false }
        clientRef.current.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      setError("Failed to send message. Please try again.")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)

    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true)
      if (clientRef.current) {
        const typingData: SetTypingMessageData = { typing: true }
        clientRef.current.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        if (clientRef.current) {
          const typingData: SetTypingMessageData = { typing: false }
          clientRef.current.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData)
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
    localStorage.removeItem(`${CHAT_HISTORY_KEY}_${roomId}`)
    localStorage.removeItem("lastRoomId")
    navigate("/chat-application")
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
          <span className="user-nickname">{userNickname.current}</span>
          {userIcon.current ? (
            <img
              src={userIcon.current}
              alt="User avatar"
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar-placeholder">
              {userNickname.current.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="chat-messages">
        {!isConnected ? (
          <div className="connecting-message">Connecting to chat room...</div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={`${message.permId}-${index}`}
                className={`message ${message.isSent ? "sent-message" : "received-message"}`}
              >
                {!message.isSystemMessage && (
                  <div className="message-header">
                    {message.userIcon ? (
                      <img
                        src={message.userIcon}
                        alt={`${message.userNickname || 'User'}'s avatar`}
                        className="user-avatar"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.userNickname || 'User'}`;
                        }}
                      />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {(message.userNickname || 'User').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="user-name">{message.userNickname || 'Anonymous'}</span>
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className={`message-content ${message.isSystemMessage ? "system-message" : ""}`}>
                  {message.body}
                </div>
              </div>
            ))}
            {usersTyping.length > 0 && !usersTyping.includes(currentUserId) && (
              <TypingIndicator 
                typingUsers={usersTyping}
                messages={messages}
                typingUsersMap={typingUsers}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

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
