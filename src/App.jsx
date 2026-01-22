import { useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Heart, X, Github, ExternalLink, ChevronLeft, Sparkles, Play, Menu, RotateCcw, User, LogOut, Loader } from 'lucide-react'
// Tinder-style: Swipe RIGHT to like, Swipe LEFT to pass
import './App.css'

// Import project data
import projectsData from './data/projects.json'

// Supabase
import { supabase, signInWithGoogle, signOut, saveUserData, loadUserData } from './lib/supabase'

// Seeded random number generator for consistent shuffling
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

function shuffleWithSeed(array, seed) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Helper to extract YouTube video ID
function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/)
  return match ? match[1] : null
}

// Fixed seed for consistent ordering
const SHUFFLE_SEED = 42

function App() {
  const [projects, setProjects] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [liked, setLiked] = useState([])
  const [passed, setPassed] = useState([])
  const [history, setHistory] = useState([]) // Track all swiped projects with their status
  const [showLiked, setShowLiked] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewingProject, setViewingProject] = useState(null) // For viewing a project from history
  const [direction, setDirection] = useState(null)

  // Initialize projects
  const initializeProjects = useCallback(() => {
    const withVideo = projectsData.filter(p => getYouTubeId(p.youtube))
    const withoutVideo = projectsData.filter(p => !getYouTubeId(p.youtube))
    const shuffledWithVideo = shuffleWithSeed(withVideo, SHUFFLE_SEED)
    const shuffledWithoutVideo = shuffleWithSeed(withoutVideo, SHUFFLE_SEED + 1000)
    return [...shuffledWithVideo, ...shuffledWithoutVideo]
  }, [])

  // Load user data from Supabase
  const loadData = useCallback(async (userId) => {
    const { data, error } = await loadUserData(userId)
    if (!error && data) {
      setLiked(data.liked_projects || [])
      setHistory(data.history || [])
      setCurrentIndex(data.current_index || 0)
      setPassed(data.passed_projects || [])
    }
  }, [])

  // Save user data to Supabase (debounced)
  const saveData = useCallback(async () => {
    if (!user) return
    setSaving(true)
    await saveUserData(user.id, {
      likedProjects: liked,
      history: history,
      currentIndex: currentIndex,
      passedProjects: passed
    })
    setSaving(false)
  }, [user, liked, history, currentIndex, passed])

  // Auto-save when data changes (with debounce)
  useEffect(() => {
    if (!user || loading) return
    const timeout = setTimeout(() => {
      saveData()
    }, 1000) // Debounce saves by 1 second
    return () => clearTimeout(timeout)
  }, [liked, history, currentIndex, passed, user, loading, saveData])

  // Check for existing session and set up auth listener
  useEffect(() => {
    setProjects(initializeProjects())

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      } else {
        // Reset to defaults when logged out
        setLiked([])
        setHistory([])
        setCurrentIndex(0)
        setPassed([])
      }
    })

    return () => subscription.unsubscribe()
  }, [initializeProjects, loadData])

  const currentProject = projects[currentIndex]

  const handleSwipe = (dir) => {
    if (!currentProject) return

    setDirection(dir)

    // Add to history with status
    setHistory(prev => [...prev, { project: currentProject, liked: dir === 'right' }])

    if (dir === 'right') {
      setLiked(prev => [...prev, currentProject])
    } else {
      setPassed(prev => [...prev, currentProject])
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setDirection(null)
    }, 300)
  }

  const handleReset = async () => {
    setCurrentIndex(0)
    setLiked([])
    setPassed([])
    setHistory([])
    setProjects(initializeProjects())
    setShowResetConfirm(false)

    // Clear data in Supabase if logged in
    if (user) {
      await saveUserData(user.id, {
        likedProjects: [],
        history: [],
        currentIndex: 0,
        passedProjects: []
      })
    }
  }

  const handleViewFromHistory = (project) => {
    setViewingProject(project)
    setShowHistory(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) {
      console.error('Google login error:', error.message)
    }
    // OAuth will redirect, so no need to close modal
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') handleSwipe('right')
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') handleSwipe('left')
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject])

  // Loading state
  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <Loader className="spinner" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Login modal
  if (showLogin) {
    return <LoginModal onGoogleLogin={handleGoogleLogin} onClose={() => setShowLogin(false)} />
  }

  // Reset confirmation modal
  if (showResetConfirm) {
    return (
      <div className="app">
        <div className="confirm-modal">
          <h2>Reset Progress?</h2>
          <p>This will clear all your liked projects and history. Are you sure?</p>
          <div className="confirm-buttons">
            <button className="confirm-yes" onClick={handleReset}>Yes, Reset</button>
            <button className="confirm-no" onClick={() => setShowResetConfirm(false)}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // Viewing a single project from history
  if (viewingProject) {
    return (
      <div className="app shorts-layout">
        <header className="top-bar">
          <button className="back-btn" onClick={() => setViewingProject(null)}>
            <ChevronLeft size={20} />
            Back
          </button>
          <div className="logo">HackSwipe</div>
          <div style={{ width: 36 }} />
        </header>
        <div className="shorts-container">
          <ShortsCard
            project={viewingProject}
            onSwipe={() => {}}
            direction={null}
            isViewOnly={true}
          />
        </div>
      </div>
    )
  }

  // History view
  if (showHistory) {
    return (
      <div className="app">
        <header className="header">
          <button className="back-btn" onClick={() => setShowHistory(false)}>
            <ChevronLeft size={20} />
            Back
          </button>
          <h1><Menu size={18} /> History ({history.length})</h1>
        </header>

        <div className="history-grid">
          {history.length === 0 ? (
            <p className="empty-state">No projects viewed yet. Start swiping!</p>
          ) : (
            history.map((item, idx) => (
              <HistoryCard
                key={idx}
                item={item}
                onClick={() => handleViewFromHistory(item.project)}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  if (showLiked) {
    return (
      <div className="app">
        <header className="header">
          <button className="back-btn" onClick={() => setShowLiked(false)}>
            <ChevronLeft size={20} />
            Back
          </button>
          <h1><Sparkles size={18} /> Liked ({liked.length})</h1>
        </header>

        <div className="liked-grid">
          {liked.length === 0 ? (
            <p className="empty-state">No projects liked yet. Start swiping!</p>
          ) : (
            liked.map((project, idx) => (
              <LikedCard key={idx} project={project} onClick={() => handleViewFromHistory(project)} />
            ))
          )}
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="app">
        <div className="end-screen">
          <h1>You've seen all projects!</h1>
          <p>You liked {liked.length} out of {projects.length} projects</p>
          <button className="view-liked-btn" onClick={() => setShowLiked(true)}>
            <Heart size={18} /> View Liked Projects
          </button>
          <button className="restart-btn" onClick={handleReset}>
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app shorts-layout">
      {/* Top Stats Bar */}
      <header className="top-bar">
        <button className="icon-btn" onClick={() => setShowHistory(true)} title="History">
          <Menu size={22} />
        </button>
        <div className="logo">HackSwipe</div>
        <div className="stats-row">
          <span className="stat-pill liked"><Heart size={14} /> {liked.length}</span>
          <span className="stat-pill passed"><X size={14} /> {passed.length}</span>
          <span className="stat-pill remaining">{projects.length - currentIndex}</span>
        </div>
        <button className="icon-btn sparkle" onClick={() => setShowLiked(true)} title="Liked Projects">
          <Sparkles size={20} />
        </button>
        {saving && <Loader className="spinner" size={16} />}
        {user ? (
          <>
            <button className="icon-btn danger" onClick={() => setShowResetConfirm(true)} title="Reset">
              <RotateCcw size={20} />
            </button>
            <button className="icon-btn danger" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <button className="icon-btn" onClick={() => setShowLogin(true)} title="Login">
            <User size={20} />
          </button>
        )}
      </header>

      {/* Main Card Area */}
      <div className="shorts-container">
        <AnimatePresence mode="wait">
          <ShortsCard
            key={currentIndex}
            project={currentProject}
            onSwipe={handleSwipe}
            direction={direction}
          />
        </AnimatePresence>
      </div>

    </div>
  )
}

function ShortsCard({ project, onSwipe, direction, isViewOnly = false }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25])

  const likeOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1])
  const passOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0])

  const handleDragEnd = (_, info) => {
    if (isViewOnly) return
    // Horizontal swipe like Tinder
    if (info.offset.x > 100) {
      onSwipe('right') // Swipe right = like
    } else if (info.offset.x < -100) {
      onSwipe('left') // Swipe left = pass
    }
  }

  const exitX = direction === 'right' ? 500 : direction === 'left' ? -500 : 0

  const youtubeId = getYouTubeId(project.youtube)

  return (
    <motion.div
      className="shorts-card"
      style={isViewOnly ? {} : { x, rotate }}
      drag={isViewOnly ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      exit={{ x: exitX, opacity: 0, rotate: exitX > 0 ? 15 : -15, transition: { duration: 0.3 } }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* Swipe Indicators - only show when not view only */}
      {!isViewOnly && (
        <>
          <motion.div className="swipe-overlay like-overlay" style={{ opacity: likeOpacity }}>
            <Heart size={64} />
            <span>LIKE</span>
          </motion.div>
          <motion.div className="swipe-overlay pass-overlay" style={{ opacity: passOpacity }}>
            <X size={64} />
            <span>SKIP</span>
          </motion.div>
        </>
      )}

      {/* Video Section */}
      <div className="video-section">
        {youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={project.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="no-video">
            <Play size={48} />
            <span>No demo video</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="content-section">
        {/* Prize Badge */}
        {project.prize && (
          <div className="prize-row">
            <span className="prize-tag">{project.prize}</span>
          </div>
        )}

        {/* Title */}
        <h2 className="project-title">{project.title}</h2>

        {/* Full Summary - scrollable */}
        <div className="project-summary">{project.summary}</div>

        {/* Tech Stack - show all */}
        {project.techStack && (
          <div className="tech-row">
            {project.techStack.split(', ').map((tech, i) => (
              <span key={i} className="tech-chip">{tech}</span>
            ))}
          </div>
        )}

        {/* Team & Date */}
        <div className="meta-row">
          {project.team && <span className="team-info">{project.team}</span>}
          {project.date && <span className="date-info">{project.date}</span>}
        </div>

        {/* All Links Section */}
        <div className="links-row">
          {project.github && (
            <a href={project.github} target="_blank" rel="noopener noreferrer" className="link-btn github">
              <Github size={16} /> GitHub
            </a>
          )}
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noopener noreferrer" className="link-btn demo">
              <ExternalLink size={16} /> Live Demo
            </a>
          )}
          {project.youtube && (
            <a href={project.youtube} target="_blank" rel="noopener noreferrer" className="link-btn youtube">
              <Play size={16} /> YouTube
            </a>
          )}
          {project.projectUrl && (
            <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="link-btn devpost">
              <Sparkles size={16} /> Devpost
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function LikedCard({ project, onClick }) {
  const youtubeId = getYouTubeId(project.youtube)

  return (
    <div className="liked-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      {youtubeId && (
        <div className="liked-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
            title={project.title}
            frameBorder="0"
            allowFullScreen
          />
        </div>
      )}
      <div className="liked-content">
        <h3>{project.title}</h3>
        {project.prize && <p className="prize">{project.prize}</p>}
        <p className="summary">{project.summary?.substring(0, 120)}...</p>
        <div className="tech-stack">
          {project.techStack?.split(', ').slice(0, 4).map((tech, i) => (
            <span key={i} className="tech-chip">{tech}</span>
          ))}
        </div>
        <div className="links">
          {project.github && (
            <a href={project.github} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              <Github size={14} /> GitHub
            </a>
          )}
          {project.projectUrl && (
            <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              <ExternalLink size={14} /> View
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryCard({ item, onClick }) {
  const { project, liked } = item

  return (
    <div className={`history-card ${liked ? 'liked' : 'passed'}`} onClick={onClick}>
      <div className="history-status">
        {liked ? <Heart size={16} /> : <X size={16} />}
      </div>
      <div className="history-content">
        <h3>{project.title}</h3>
        {project.prize && <p className="prize">{project.prize}</p>}
        <p className="summary">{project.summary?.substring(0, 80)}...</p>
      </div>
    </div>
  )
}

function LoginModal({ onGoogleLogin, onClose }) {
  return (
    <div className="app">
      <div className="login-modal">
        <h2>Sign In</h2>
        <p className="login-subtitle">Sign in to save your liked projects and history</p>
        <button className="google-btn" onClick={onGoogleLogin}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button className="login-cancel-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default App
