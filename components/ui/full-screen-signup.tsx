"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Marquee } from "@/components/ui/marquee"
import { useRouter } from "next/navigation"

const AnimatedPaths = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M-100,200 Q300,100 600,300 T1300,250"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
        />
        <motion.path
          d="M-50,400 Q400,200 800,500 T1250,400"
          stroke="rgba(59, 130, 246, 0.2)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 0.5,
          }}
        />
        <motion.path
          d="M-150,600 Q200,400 700,650 T1400,550"
          stroke="rgba(59, 130, 246, 0.15)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 5,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1,
          }}
        />
        <motion.path
          d="M-200,100 Q500,50 900,200 T1500,150"
          stroke="rgba(59, 130, 246, 0.1)"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 6,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1.5,
          }}
        />
        <motion.path
          d="M-80,350 Q350,250 750,450 T1350,350"
          stroke="rgba(59, 130, 246, 0.25)"
          strokeWidth="1.8"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 3.5,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
          }}
        />
        <motion.path
          d="M-120,50 Q250,150 650,80 T1280,120"
          stroke="rgba(59, 130, 246, 0.12)"
          strokeWidth="1.2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 4.5,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2.5,
          }}
        />
        <motion.path
          d="M-180,500 Q300,350 800,580 T1450,480"
          stroke="rgba(59, 130, 246, 0.08)"
          strokeWidth="0.9"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 5.5,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 3,
          }}
        />
        <motion.path
          d="M-10,760 Q410,640 810,780 T1410,740"
          stroke="rgba(59, 130, 246, 0.18)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 3.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 3.5,
          }}
        />
        <motion.path
          d="M-200,120 Q140,40 540,140 T1140,100"
          stroke="rgba(59, 130, 246, 0.12)"
          strokeWidth="0.9"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 4.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 13,
          }}
        />
        <motion.path
          d="M-60,540 Q370,400 770,560 T1370,520"
          stroke="rgba(59, 130, 246, 0.25)"
          strokeWidth="2.0"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 2.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 13.5,
          }}
        />
        <motion.path
          d="M-150,280 Q290,160 690,300 T1290,260"
          stroke="rgba(59, 130, 246, 0.14)"
          strokeWidth="1.1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 4.3,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 14,
          }}
        />
      </svg>
    </div>
  )
}

const reviews = [
  {
    name: "Sarah Chen",
    username: "@sarahc",
    body: "This student management system transformed how we track academic progress. Absolutely brilliant!",
    img: "https://avatar.vercel.sh/sarah",
  },
  {
    name: "Michael Rodriguez",
    username: "@mrodriguez",
    body: "The interface is so intuitive. Managing student records has never been this easy.",
    img: "https://avatar.vercel.sh/michael",
  },
  {
    name: "Dr. Emily Watson",
    username: "@drwatson",
    body: "As an administrator, this platform saves me hours every week. Highly recommended!",
    img: "https://avatar.vercel.sh/emily",
  },
  {
    name: "James Park",
    username: "@jamespark",
    body: "The reporting features are outstanding. Perfect for educational institutions.",
    img: "https://avatar.vercel.sh/james",
  },
  {
    name: "Lisa Thompson",
    username: "@lisathompson",
    body: "Student engagement has improved significantly since we started using this system.",
    img: "https://avatar.vercel.sh/lisa",
  },
  {
    name: "David Kumar",
    username: "@davidk",
    body: "The analytics dashboard provides incredible insights into student performance.",
    img: "https://avatar.vercel.sh/david",
  },
]

const firstRow = reviews.slice(0, Math.ceil(reviews.length / 2))
const secondRow = reviews.slice(Math.ceil(reviews.length / 2))

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string
  name: string
  username: string
  body: string
}) => {
  return (
    <figure
      className={cn(
        "relative h-40 w-[280px] cursor-pointer overflow-hidden rounded-xl p-4",
        // light styles
        "bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        // dark styles
        "dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
        "hover-trigger transition-all duration-200",
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <img className="rounded-full" width="32" height="32" alt="" src={img || "/placeholder.svg"} />
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">{name}</figcaption>
          <p className="text-xs font-medium dark:text-white/40">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{body}</blockquote>
    </figure>
  )
}

export const FullScreenSignup = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const DEMO_CREDENTIALS = {
    admin: { email: "admin@etia.com", password: "admin123" },
    student: { email: "student@etia.com", password: "student123" },
  }

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const validatePassword = (value: string) => {
    return value.length >= 8
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let valid = true

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.")
      valid = false
    } else {
      setEmailError("")
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.")
      valid = false
    } else {
      setPasswordError("")
    }

    setSubmitted(true)

    if (valid) {
      if (email === DEMO_CREDENTIALS.admin.email && password === DEMO_CREDENTIALS.admin.password) {
        router.push("/admin")
      } else if (email === DEMO_CREDENTIALS.student.email && password === DEMO_CREDENTIALS.student.password) {
        router.push("/student")
      } else {
        setEmailError("Invalid credentials. Try admin@etia.com/admin123 or student@etia.com/student123")
        setSubmitted(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden p-4 relative">
      <AnimatedPaths />

      <div className="w-full relative max-w-5xl overflow-hidden flex flex-col md:flex-row shadow-xl z-10">
        <div className="bg-black text-white p-8 md:p-12 md:w-1/2 relative rounded-bl-3xl overflow-hidden">
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden py-8">
            <Marquee pauseOnHover className="[--duration:20s] mb-4">
              {firstRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:20s]">
              {secondRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black"></div>
          </div>
        </div>

        <div className="p-8 md:p-12 md:w-1/2 flex flex-col bg-secondary z-10 text-secondary-foreground rounded-tr-3xl">
          <div className="flex flex-col items-left mb-8">
            <div className="mb-4">
              <Image src="/images/etia-logo.png" alt="ETIA Logo" width={60} height={60} className="object-contain" />
            </div>
            <h2 className="text-3xl font-medium mb-2 tracking-tight">Get Started</h2>
            <p className="text-left opacity-80">Welcome to Edtec Student Management System — Let's get started</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm mb-2">
                Your email
              </label>
              <input
                type="email"
                id="email"
                placeholder="hi@hextastudio.in"
                className={`text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-blue-500 ${
                  emailError ? "border-red-500" : "border-gray-300"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby="email-error"
              />
              {emailError && (
                <p id="email-error" className="text-red-500 text-xs mt-1">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2">
                Create new password
              </label>
              <input
                type="password"
                id="password"
                className={`text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-blue-500 ${
                  passwordError ? "border-red-500" : "border-gray-300"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                aria-describedby="password-error"
              />
              {passwordError && (
                <p id="password-error" className="text-red-500 text-xs mt-1">
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
