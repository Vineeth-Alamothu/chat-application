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
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
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
