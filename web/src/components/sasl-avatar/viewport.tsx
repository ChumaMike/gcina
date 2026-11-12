"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { createAvatarScene, ViewOptions } from "./scene";

export function AvatarViewport({ paused, reduced, demo, slow, speaking }: ViewOptions) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createAvatarScene> | null>(null);
  const currentOptions = useRef({ paused, reduced, demo, slow, speaking });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const description = useId();

  useEffect(() => {
    currentOptions.current = { paused, reduced, demo, slow, speaking };
    scene.current?.setOptions(currentOptions.current);
  }, [paused, reduced, demo, slow, speaking]);

  useEffect(() => {
    let cancelled = false;
    // Three.js and all character geometry are fetched only after opening the preview.
    import("./scene").then(({ createAvatarScene }) => {
      if (cancelled || !host.current) return;
      scene.current = createAvatarScene(host.current, () => setStatus("error"));
      scene.current.setOptions(currentOptions.current);
      return scene.current.ready.then(() => { if (!cancelled) setStatus("ready"); });
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [attempt]);

  return (
    <div className="sasl-studio relative isolate overflow-hidden rounded-2xl border border-teal-900/10 bg-[#e5efeb]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#ffffff_0%,#edf4ef_38%,#d2e3dc_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] bottom-[-4%] h-[13%] rounded-[100%] bg-teal-950/15 blur-xl" />
      <div className="pointer-events-none absolute left-4 top-3 z-10 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-teal-900">
        <span className="size-1.5 rounded-full bg-teal-700" /> GCINA AVATAR
      </div>
      <div
        ref={host}
        tabIndex={status === "ready" ? 0 : -1}
        role="group"
        aria-label="Interactive 3D human avatar"
        aria-describedby={description}
        className="relative h-full w-full cursor-grab touch-pan-y rounded-2xl outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-teal-700 active:cursor-grabbing"
      />
      <span id={description} className="sr-only">A front-facing human character wearing a teal uniform, with articulated hands. Drag horizontally or use left and right arrow keys to turn slightly. Home resets the view. Movement is a rig demonstration, not South African Sign Language.</span>
      {status !== "ready" && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#e5efeb] px-8 text-center text-sm text-teal-950">
          <p>{status === "loading" ? "Preparing your avatar…" : "The 3D preview is unavailable. You can still select and read page text below."}</p>
          {status === "error" && <button type="button" onClick={() => { setStatus("loading"); setAttempt((n) => n + 1); }} className="min-h-10 rounded-full border border-teal-800/30 px-4 font-medium focus-visible:outline-2">Retry 3D preview</button>}
        </div>
      )}
      {status === "ready" && <>
        <button type="button" aria-label="Reset avatar view" title="Reset avatar view" onClick={() => scene.current?.resetView()} className="absolute right-2 top-1.5 flex size-10 items-center justify-center rounded-full text-teal-900 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-teal-700">
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-medium tracking-wide text-teal-900">
          <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 backdrop-blur-sm">{reduced ? "Reduced motion · still pose" : paused ? "Motion paused" : demo ? "Rig demonstration · not SASL" : "Drag to explore · arrows to turn"}</span>
        </p>
      </>}
    </div>
  );
}
