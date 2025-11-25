import { useEffect, useRef, useState } from "react";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  if (window.turnstile) return Promise.resolve();

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => {
        turnstileScriptPromise = null;
        reject(err);
      };
      document.body.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

export function useTurnstile() {
  const [token, setToken] = useState("");
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;

    let isMounted = true;

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (value) => setToken(value || ""),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch((err) => {
        console.error("Turnstile failed to load", err);
      });

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      setToken("");
    };
  }, []);

  const resetTurnstile = () => {
    if (widgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setToken("");
  };

  return {
    isEnabled: Boolean(TURNSTILE_SITE_KEY),
    containerRef,
    turnstileToken: token,
    resetTurnstile,
  };
}
