import type React from "react"
import { HashRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import ChatRoom from "./components/ChatRoom"
import ErrorPage from "./components/ErrorPage"
import "./styles/App.css"

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
