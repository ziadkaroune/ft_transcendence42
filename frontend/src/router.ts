import { renderLandingPage } from './pages/LandingPage';
import { renderRegistrationPage } from './pages/RegistrationPage';
import { renderGamePage } from './pages/GamePage';
export function initRouter() {
  const app = document.getElementById('app');
  if (!app) return;

  const path = window.location.pathname;
  render(path);

  window.onpopstate = () => render(window.location.pathname);
}

function render(path: string) {
  const app = document.getElementById('app');
  if (!app) return;

  if (path === '/game') {
    renderGamePage();
  } else if (path === '/register') {
    renderRegistrationPage();
  } else {
    renderLandingPage();
  }
}
