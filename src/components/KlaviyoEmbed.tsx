'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const KLAVIYO_BOOTSTRAP_ID = 'ducksat-klaviyo-bootstrap'
const KLAVIYO_SCRIPT_ID = 'ducksat-klaviyo-script'
const KLAVIYO_SCRIPT_SRC = 'https://static.klaviyo.com/onsite/js/QSeTJg/klaviyo.js?company_id=QSeTJg'

function isSuppressedPath(pathname: string): boolean {
  return pathname === '/practice-test'
    || pathname.startsWith('/practice/')
    || pathname.startsWith('/group-study/')
    || pathname === '/auth'
    || pathname.startsWith('/auth/')
}

function ensureKlaviyoBootstrap() {
  if (document.getElementById(KLAVIYO_BOOTSTRAP_ID)) {
    return
  }

  const script = document.createElement('script')
  script.id = KLAVIYO_BOOTSTRAP_ID
  script.type = 'text/javascript'
  script.text = "!function(){if(!window.klaviyo){window._klOnsite=window._klOnsite||[];try{window.klaviyo=new Proxy({},{get:function(n,i){return\"push\"===i?function(){var n;(n=window._klOnsite).push.apply(n,arguments)}:function(){for(var n=arguments.length,o=new Array(n),w=0;w<n;w++)o[w]=arguments[w];var t=\"function\"==typeof o[o.length-1]?o.pop():void 0,e=new Promise((function(n){window._klOnsite.push([i].concat(o,[function(i){t&&t(i),n(i)}]))}));return e}}})}catch(n){window.klaviyo=window.klaviyo||[],window.klaviyo.push=function(){var n;(n=window._klOnsite).push.apply(n,arguments)}}}}();"
  document.body.appendChild(script)
}

function ensureKlaviyoScript() {
  if (document.getElementById(KLAVIYO_SCRIPT_ID)) {
    return
  }

  const script = document.createElement('script')
  script.id = KLAVIYO_SCRIPT_ID
  script.async = true
  script.type = 'text/javascript'
  script.src = KLAVIYO_SCRIPT_SRC
  document.body.appendChild(script)
}

function hideKlaviyoUi() {
  const selectors = [
    '[class*="kl-private"]',
    '[id^="klaviyo"]',
    'iframe[src*="klaviyo"]',
  ]

  document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach((element) => {
    element.style.display = 'none'
    element.setAttribute('aria-hidden', 'true')
  })

  document.body.style.removeProperty('overflow')
  document.documentElement.style.removeProperty('overflow')
}

export default function KlaviyoEmbed() {
  const pathname = usePathname()
  const isSuppressed = isSuppressedPath(pathname)

  useEffect(() => {
    if (isSuppressed) {
      hideKlaviyoUi()

      const intervalId = window.setInterval(hideKlaviyoUi, 250)
      const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 5000)

      return () => {
        window.clearInterval(intervalId)
        window.clearTimeout(timeoutId)
      }
    }

    ensureKlaviyoBootstrap()
    ensureKlaviyoScript()
    return undefined
  }, [isSuppressed])

  return null
}