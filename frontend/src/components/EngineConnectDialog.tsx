import "./EngineConnectDialog.css";
import React, { useEffect, useId, useRef, useState } from "react";
import { Cpu, Check, Copy, X } from "lucide-react";
import { LOCAL_ENGINE_URL, normalizeEngineUrl } from "../utils/engineUrl";

interface EngineConnectDialogProps {
  open: boolean;
  onClose: () => void;
  /** The address the app talks to right now */
  currentUrl: string;
  /** True when currentUrl came from this dialog rather than the built-in default */
  usingSavedUrl: boolean;
  online: boolean;
  /** Probe and switch to a URL (null = back to the built-in address). Resolves true on success. */
  onConnect: (url: string | null) => Promise<boolean>;
}

type Result = { kind: "ok" | "fail" | "reset"; text: string } | null;

/** Lets a player point this copy of the app (even the public link) at the engine server on their own computer. */
export const EngineConnectDialog: React.FC<EngineConnectDialogProps> = ({
  open,
  onClose,
  currentUrl,
  usingSavedUrl,
  online,
  onConnect,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [value, setValue] = useState(LOCAL_ENGINE_URL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const isPublicCopy = !/^http:\/\/(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(origin);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setValue(usingSavedUrl ? currentUrl : LOCAL_ENGINE_URL);
      setResult(null);
      dialog.showModal();
      inputRef.current?.select();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    const url = normalizeEngineUrl(value);
    if (!url) {
      setResult({ kind: "fail", text: "That doesn't look like an address. Try http://localhost:8000." });
      return;
    }
    setBusy(true);
    setResult(null);
    const ok = await onConnect(url);
    setBusy(false);
    setValue(url);
    setResult(
      ok
        ? { kind: "ok", text: `Connected to ${url}. This browser will use it from now on.` }
        : {
            kind: "fail",
            text: `No answer from ${url}. Check that the server window is still open, that the address is right, and that this site is in FRONTEND_ORIGINS (step 2).`,
          }
    );
  };

  const reset = async () => {
    setBusy(true);
    await onConnect(null);
    setBusy(false);
    setValue(LOCAL_ENGINE_URL);
    setResult({ kind: "reset", text: "Back to the built-in address." });
  };

  const copyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the address is selectable text anyway
    }
  };

  return (
    <dialog
      ref={ref}
      className="engine-dialog"
      aria-labelledby={`${inputId}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <form onSubmit={connect}>
        <div className="engine-dialog__head">
          <span className="engine-dialog__icon" aria-hidden="true">
            <Cpu size={20} />
          </span>
          <div>
            <h2 id={`${inputId}-title`} className="engine-dialog__title">
              Connect your engine
            </h2>
            <p className="engine-dialog__lede">
              The bots, the coach and the analysis run on the ChessWise server (FastAPI and Stockfish). This page can
              use one that's running on your own computer.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" aria-label="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <ol className="engine-dialog__steps">
          <li>
            On your computer, start the server: double-click <code>start-chesswise.bat</code>, or run{" "}
            <code>uvicorn chess_trainer.api:app --app-dir backend --port 8000</code>. Leave its window open.
          </li>
          <li>
            Let this site talk to it: add{" "}
            <span className="engine-dialog__origin">
              <code>{origin}</code>
              <button type="button" className="btn btn--ghost btn--sm" onClick={copyOrigin}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </span>{" "}
            to <code>FRONTEND_ORIGINS</code> in your <code>.env</code>, then restart the server.
            {origin === "https://chesswise-ai.vercel.app" && " The latest start script already includes it."}
          </li>
          <li>Enter the server's address and press Connect.</li>
        </ol>

        <label className="engine-dialog__label" htmlFor={inputId}>
          Engine address
        </label>
        <div className="engine-dialog__row">
          <input
            ref={inputRef}
            id={inputId}
            className="engine-dialog__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={LOCAL_ENGINE_URL}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Connecting" : "Connect"}
          </button>
        </div>

        <p className="engine-dialog__now">
          Now using <code>{currentUrl}</code>: <strong>{online ? "connected" : "not answering"}</strong>
          {usingSavedUrl && (
            <>
              {" · "}
              <button type="button" className="engine-dialog__link" onClick={reset} disabled={busy}>
                Use the built-in address
              </button>
            </>
          )}
        </p>

        {result && (
          <p className={`engine-dialog__result is-${result.kind}`} role="status">
            {result.text}
          </p>
        )}

        <p className="engine-dialog__note">
          {isPublicCopy
            ? "Only this browser connects to your computer. Friends who open the link see the offline mode unless they run their own engine. Use Chrome, Edge or Firefox, and allow it if the browser asks to reach devices on your network."
            : "Phones on the same Wi-Fi can use your computer's network address, like http://192.168.1.5:8000."}
        </p>
      </form>
    </dialog>
  );
};
