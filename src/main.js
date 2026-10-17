import { createApp } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import './style.css'

const app = createApp(App)
const router = createAppRouter()

// Last-resort handler for errors thrown inside components (≈ Laravel's
// exception Handler). Each feature already shows its own friendly message;
// this just makes sure nothing fails completely silently.
app.config.errorHandler = (error, _instance, info) => {
  console.error(`[app error] ${info}:`, error)
}

// After a new deploy, old chunk filenames no longer exist. A guest who had the
// page open would fail to lazy-load e.g. the admin page. Reload once to fetch
// the new version; the sessionStorage flag prevents an endless reload loop.
// (sessionStorage can throw in some private-browsing modes, hence try/catch.)
router.onError((error, to) => {
  const isChunkError = /dynamically imported module|Importing a module script failed/i.test(error.message)
  try {
    if (isChunkError && !sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.assign(to.fullPath)
    }
  } catch {
    // Storage unavailable: skip the auto-reload rather than risk a loop.
  }
})
router.afterEach(() => {
  try {
    sessionStorage.removeItem('chunk-reload')
  } catch {
    // ignore
  }
})

app.use(router).mount('#app')
