import type React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import ChatRoom from "./components/ChatRoom"
import "./styles/App.css"

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/chat-application" element={<Home />} />
          <Route path="/chat-application/chat/:roomId" element={<ChatRoom />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
