import { useState } from 'react'
import './App.css'
import { Home } from './pages/Home.tsx'
import { TrackMap } from './pages/TrackMap.tsx'
import styles from './App.module.css'

type Page = 'editor' | 'map'

function App() {
  const [page, setPage] = useState<Page>('editor')

  return (
    <div>
      <nav className={styles.nav}>
        <button
          className={`${styles.navButton} ${page === 'editor' ? styles.active : ''}`}
          onClick={() => setPage('editor')}
        >
          Editor
        </button>
        <button
          className={`${styles.navButton} ${page === 'map' ? styles.active : ''}`}
          onClick={() => setPage('map')}
        >
          Track Map
        </button>
      </nav>
      {page === 'editor' ? <Home /> : <TrackMap />}
    </div>
  )
}

export default App
