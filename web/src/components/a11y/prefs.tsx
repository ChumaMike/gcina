"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGS, isLang, translate, type Lang, type MsgKey } from "@/lib/i18n/messages";
import "./a11y.css";

// Per-viewer accessibility preferences. A convenience, so they live in localStorage
// (wrapped: private windows and blocked storage just fall back to the defaults).

export type Prefs = { lang: Lang; textSize: 0 | 1 | 2; contrast: boolean; listen: boolean; reduceMotion: boolean };
const DEFAULTS: Prefs = { lang: "en", textSize: 0, contrast: false, listen: true, reduceMotion: false };
const KEY = "gcina:a11y:v1";

function load(): Prefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    return {
      lang: isLang(raw.lang) ? raw.lang : DEFAULTS.lang,
      textSize: raw.textSize === 1 || raw.textSize === 2 ? raw.textSize : 0,
      contrast: raw.contrast === true,
      listen: raw.listen !== false,
      reduceMotion: raw.reduceMotion === true,
    };
  } catch {
    return DEFAULTS;
  }
}

type Ctx = { prefs: Prefs; set: (p: Partial<Prefs>) => void; t: (k: MsgKey) => string; speechLang: string };
const PrefsContext = createContext<Ctx>({ prefs: DEFAULTS, set: () => {}, t: (k) => translate("en", k), speechLang: "en-ZA" });

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Read the saved choices once, after hydration (localStorage is a browser-only external store).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(load());
  }, []);

  // Apply them to <html>: lang for screen readers, root font size (rem-based UI scales), contrast, motion.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = prefs.lang === "en" ? "en-ZA" : `${prefs.lang}-ZA`;
    html.style.fontSize = ["", "112.5%", "125%"][prefs.textSize];
    html.toggleAttribute("data-contrast-high", prefs.contrast);
    html.toggleAttribute("data-reduce-motion", prefs.reduceMotion);
  }, [prefs]);

  const set = useCallback((p: Partial<Prefs>) => {
    setPrefs((old) => {
      const next = { ...old, ...p };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: keep the choice for this visit only */
      }
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      set,
      t: (k) => translate(prefs.lang, k),
      speechLang: LANGS.find((l) => l.code === prefs.lang)?.speech ?? "en-ZA",
    }),
    [prefs, set],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
export const useT = () => useContext(PrefsContext).t;

/** For app-shell (C, redesign branch): the nav label in the chosen language. */
export function useNavLabel() {
  const t = useT();
  return (href: string, english: string) => {
    const k = `nav.${href}` as MsgKey;
    const v = t(k);
    return v === k ? english : v;
  };
}
