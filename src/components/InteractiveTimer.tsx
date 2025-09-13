'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Zap, AlertTriangle } from 'lucide-react'

interface InteractiveTimerProps {
  duration: number
  onTimeUp: () => void
  onTick?: (timeLeft: number) => void
  isActive?: boolean
  size?: 'small' | 'medium' | 'large'
  showWarnings?: boolean
}

const InteractiveTimer: React.FC<InteractiveTimerProps> = ({
  duration,
  onTimeUp,
  onTick,
  isActive = true,
  size = 'medium',
  showWarnings = true
}) => {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isWarning, setIsWarning] = useState(false)
  const [isCritical, setIsCritical] = useState(false)

  useEffect(() => {
    setTimeLeft(duration)
    setIsWarning(false)
    setIsCritical(false)
  }, [duration])

  useEffect(() => {
    if (!isActive) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        
        if (showWarnings) {
          const warningThreshold = Math.max(10, duration * 0.3)
          const criticalThreshold = Math.max(5, duration * 0.15)
          
          setIsWarning(newTime <= warningThreshold && newTime > criticalThreshold)
          setIsCritical(newTime <= criticalThreshold && newTime > 0)
        }
        
        if (onTick) onTick(newTime)
        
        if (newTime <= 0) {
          onTimeUp()
          return 0
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, duration, onTimeUp, onTick, showWarnings])

  const progress = (timeLeft / duration) * 100
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return { container: 'w-16 h-16', text: 'text-sm', icon: 'w-4 h-4' }
      case 'large': return { container: 'w-32 h-32', text: 'text-2xl', icon: 'w-8 h-8' }
      default: return { container: 'w-24 h-24', text: 'text-lg', icon: 'w-6 h-6' }
    }
  }

  const getTimerColors = () => {
    if (isCritical) {
      return {
        gradient: 'from-red-500 to-pink-500',
        stroke: '#ef4444',
        glow: 'shadow-red-500/50',
        background: 'from-red-500/20 to-pink-500/20'
      }
    }
    if (isWarning) {
      return {
        gradient: 'from-orange-500 to-yellow-500',
        stroke: '#f97316',
        glow: 'shadow-orange-500/50',
        background: 'from-orange-500/20 to-yellow-500/20'
      }
    }
    return {
      gradient: 'from-blue-500 to-purple-500',
      stroke: '#3b82f6',
      glow: 'shadow-blue-500/50',
      background: 'from-blue-500/20 to-purple-500/20'
    }
  }

  const sizeClasses = getSizeClasses()
  const colors = getTimerColors()

  return (
    <div className={`relative ${sizeClasses.container} mx-auto`}>
      {/* Glow effect */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${colors.background} blur-xl ${colors.glow} shadow-2xl ${
          isCritical ? 'animate-pulse' : ''
        }`}
      />
      
      {/* Main timer circle */}
      <div className={`relative ${sizeClasses.container} rounded-full bg-gradient-to-r ${colors.gradient} p-1 shadow-2xl ${colors.glow}`}>
        <div className="w-full h-full rounded-full bg-slate-900/90 flex items-center justify-center relative overflow-hidden">
          {/* SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke={colors.stroke}
              strokeWidth="4"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 8px ${colors.stroke})`
              }}
            />
          </svg>
          
          {/* Timer Content */}
          <div className="flex flex-col items-center justify-center text-white z-10">
            {isCritical && (
              <AlertTriangle className={`${sizeClasses.icon} text-red-400 animate-bounce mb-1`} />
            )}
            {isWarning && !isCritical && (
              <Zap className={`${sizeClasses.icon} text-orange-400 animate-pulse mb-1`} />
            )}
            {!isWarning && !isCritical && (
              <Clock className={`${sizeClasses.icon} text-blue-400 mb-1`} />
            )}
            
            <span className={`font-bold ${sizeClasses.text} ${isCritical ? 'animate-pulse text-red-400' : 'text-white'}`}>
              {timeLeft}
            </span>
            
            <span className="text-xs text-gray-400 -mt-1">sec</span>
          </div>
        </div>
      </div>
      
      {/* Pulse animation for critical time */}
      {isCritical && (
        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-30" />
      )}
    </div>
  )
}

export default InteractiveTimer