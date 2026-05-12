// Server component. Renders a <script> tag that runs synchronously in <head>
// before React hydrates so the first paint matches the user's appearance preference.

const BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem('appearance');var d;if(s==='dark'){d=true;}else if(s==='light'){d=false;}else{d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`

export default function AppearanceBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
}
