export const THEME_KEY = 'rk-theme';

/** Runs before first paint so a saved choice never flashes the wrong theme. */
export const themeInitScript = `document.documentElement.classList.add('js');try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')d.dataset.theme=t;var s=parseFloat(localStorage.getItem('rk-text')||'');if(s>=80&&s<=150)d.style.fontSize=s+'%';if(localStorage.getItem('rk-contrast')==='more')d.dataset.contrast='more'}catch(e){}`;
