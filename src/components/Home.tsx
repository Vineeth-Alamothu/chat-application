"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { TelepartyClient, type SocketEventHandler } from "teleparty-websocket-lib"
import UserForm from "./UserForm"
import "../styles/Home.css"

const Home: React.FC = () => {
  const [joinRoomId, setJoinRoomId] = useState("")
  const [nickname, setNickname] = useState("")
  const [userIcon, setUserIcon] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [client, setClient] = useState<TelepartyClient | null>(null)
  const [isConnectionReady, setIsConnectionReady] = useState(false)
  const navigate = useNavigate()

  // Initialize client when component mounts
  useEffect(() => {
    // Create event handler
    const eventHandler: SocketEventHandler = {
      onConnectionReady: () => {
        console.log("Connection established for room creation")
        setIsConnectionReady(true)
      },
      onClose: () => {
        console.log("Connection closed for room creation")
        setIsConnectionReady(false)
      },
      onMessage: (message) => {
        console.log("Received message during room creation:", message)
      },
    }

    // Create a new client instance with the event handler
    const newClient = new TelepartyClient(eventHandler)
    setClient(newClient)
  }, [])

  const handleCreateRoom = async () => {
    if (!nickname) {
      setError("Please enter a nickname")
      return
    }

    if (!client) {
      setError("Client not initialized")
      return
    }

    try {
      setIsConnecting(true)
      setError("")

      // Wait for connection to be ready
      if (!isConnectionReady) {
        setError("Connecting to server...")

        // Wait for connection to be ready (max 10 seconds)
        let attempts = 0
        const maxAttempts = 20 // 10 seconds (500ms intervals)

        while (!isConnectionReady && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          attempts++
        }

        if (!isConnectionReady) {
          throw new Error("Connection timeout. Please try again.")
        }
      }

      // Set nickname in localStorage
      localStorage.setItem("userNickname", nickname)
      if (userIcon) localStorage.setItem("userIcon", userIcon)

      // Create a chat room with nickname and userIcon
      const roomId = await client.createChatRoom(nickname, userIcon || undefined)

      // Navigate to the chat room
      navigate(`/chat/${roomId}`)
    } catch (err) {
      console.error("Failed to create room:", err)
      setError(`Failed to create room: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinRoomId) {
      setError("Please enter a room ID")
      return
    }

    if (!nickname) {
      setError("Please enter a nickname")
      return
    }

    try {
      // Store user info in localStorage
      localStorage.setItem("userNickname", nickname)
      if (userIcon) localStorage.setItem("userIcon", userIcon)

      // Navigate to the chat room
      navigate(`/chat/${joinRoomId}`)
    } catch (err) {
      setError("Failed to join room. Please try again.")
      console.error(err)
    }
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="app-title">TeleChat</h1>
        <p className="app-subtitle">Real-time chat made simple</p>

        {!isCreating && !isJoining && (
          <div className="action-buttons">
            <button className="action-button create-button" onClick={() => setIsCreating(true)}>
              Create a Room
            </button>
            <button className="action-button join-button" onClick={() => setIsJoining(true)}>
              Join a Room
            </button>
          </div>
        )}

        {isCreating && (
          <div className="form-container">
            <h2>Create a New Chat Room</h2>
            <UserForm nickname={nickname} setNickname={setNickname} userIcon={userIcon} setUserIcon={setUserIcon} />
            {error && <p className="error-message">{error}</p>}
            <div className="form-buttons">
              <button
                className="form-button back-button"
                onClick={() => {
                  setIsCreating(false)
                  setError("")
                }}
                disabled={isConnecting}
              >
                Back
              </button>
              <button className="form-button create-button" onClick={handleCreateRoom} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Create Room"}
              </button>
            </div>
          </div>
        )}

        {isJoining && (
          <div className="form-container">
            <h2>Join a Chat Room</h2>
            <div className="input-group">
              <label htmlFor="roomId">Room ID</label>
              <input
                type="text"
                id="roomId"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
              />
            </div>
            <UserForm nickname={nickname} setNickname={setNickname} userIcon={userIcon} setUserIcon={setUserIcon} />
            {error && <p className="error-message">{error}</p>}
            <div className="form-buttons">
              <button
                className="form-button back-button"
                onClick={() => {
                  setIsJoining(false)
                  setError("")
                }}
              >
                Back
              </button>
              <button className="form-button join-button" onClick={handleJoinRoom}>
                Join Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
