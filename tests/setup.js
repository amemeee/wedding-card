// Runs before every test file (see vite.config.js → test.setupFiles).
// jsdom doesn't implement scrolling; Vue Router calls it on navigation.
window.scrollTo = () => {}
