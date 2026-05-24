import React from 'react'
import { useNavigate } from 'react-router-dom'
import HowToPlay from '../components/HowToPlay.jsx'

export default function HowToPlayPage() {
  const nav = useNavigate()
  return <HowToPlay onBack={() => nav('/')} />
}
