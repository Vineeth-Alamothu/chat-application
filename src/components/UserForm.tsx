import type React from "react"
import { useState } from "react"
import "../styles/UserForm.css"

interface UserFormProps {
  nickname: string
  setNickname: (nickname: string) => void
  userIcon: string
  setUserIcon: (icon: string) => void
}

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
]

const UserForm: React.FC<UserFormProps> = ({ nickname, setNickname, userIcon, setUserIcon }) => {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [customIconUrl, setCustomIconUrl] = useState("")

  const handleAvatarSelect = (avatar: string) => {
    setUserIcon(avatar)
    setShowAvatarSelector(false)
  }

  const handleCustomIconSubmit = () => {
    if (customIconUrl) {
      setUserIcon(customIconUrl)
      setShowAvatarSelector(false)
      setCustomIconUrl("")
    }
  }
  return (
    <div className="user-form">
      <div className="input-group">
        <label htmlFor="nickname">Nickname</label>
        <input
          type="text"
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
        />
      </div>

      <div className="avatar-section">
        <div className="avatar-preview">
          {userIcon ? (
            <img src={userIcon || "/placeholder.svg"} alt="Selected avatar" className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">{nickname ? nickname.charAt(0).toUpperCase() : "?"}</div>
          )}
        </div>

        <button className="avatar-button" onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
          {userIcon ? "Change Avatar" : "Choose Avatar"}
        </button>
      </div>

      {showAvatarSelector && (
        <div className="avatar-selector">
          <div className="avatar-grid">
            {AVATAR_OPTIONS.map((avatar, index) => (
              <div
                key={index}
                className={`avatar-option ${userIcon === avatar ? "selected" : ""}`}
                onClick={() => handleAvatarSelect(avatar)}
              >
                <img src={avatar || "/placeholder.svg"} alt={`Avatar option ${index + 1}`} />
              </div>
            ))}
          </div>

          <div className="custom-avatar-section">
            <input
              type="text"
              value={customIconUrl}
              onChange={(e) => setCustomIconUrl(e.target.value)}
              placeholder="Or enter image URL"
            />
            <button className="custom-avatar-button" onClick={handleCustomIconSubmit}>
              Use
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserForm
