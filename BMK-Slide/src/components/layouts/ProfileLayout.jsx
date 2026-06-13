import { useMemo } from 'react'
import './layouts.css'

function calcAge(birthYear, birthMonth, birthDay) {
  const today = new Date()
  const birth = new Date(birthYear, birthMonth - 1, birthDay)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

function formatBirthDate(year, month, day) {
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `${day} ${months[month - 1]} ${year + 543}`
}

export default function ProfileLayout({ slide }) {
  const age = useMemo(
    () => calcAge(slide.birthYear, slide.birthMonth, slide.birthDay),
    [slide.birthYear, slide.birthMonth, slide.birthDay]
  )
  const birthDateStr = useMemo(
    () => formatBirthDate(slide.birthYear, slide.birthMonth, slide.birthDay),
    [slide.birthYear, slide.birthMonth, slide.birthDay]
  )

  return (
    <div className="slide slide--profile">
      <div className="profile-layout">

        <div className="profile-left">
          <span className="profile-eyebrow">{slide.eyebrow ?? 'Self Introduction'}</span>
          <h1 className="profile-name-th">
            {slide.nameTh.split(' ').map((word, i) => (
              <span key={i} className="profile-name-word">{word}</span>
            ))}
          </h1>
          <p className="profile-name-en">
            {slide.nameEn.split(' ').map((word, i) => (
              <span key={i} className="profile-name-word">{word}</span>
            ))}
          </p>
          <div className="profile-nick">
            <span className="profile-nick-label">ชื่อเล่น</span>
            <span className="profile-nick-value">{slide.nickname}</span>
          </div>
        </div>

        <div className="profile-divider" />

        <div className="profile-right">
          <ul className="profile-info-list">
            <li className="profile-info-row">
              <span className="profile-info-key">เกิด</span>
              <span className="profile-info-val">{birthDateStr}</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-key">อายุ</span>
              <span className="profile-info-val">{age} ปี</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-key">Email</span>
              <span className="profile-info-val">{slide.email}</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-key">Tel</span>
              <span className="profile-info-val">{slide.phone}</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-key">Line</span>
              <span className="profile-info-val">{slide.line}</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-key">ที่อยู่</span>
              <span className="profile-info-val">{slide.location}</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}
