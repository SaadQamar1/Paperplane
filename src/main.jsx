import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Excalidraw,
  MainMenu,
  exportToSvg,
  exportToBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import { get, set } from "idb-keyval";
import {
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Search,
  LayoutGrid,
  Star,
  Upload,
  Download,
  Copy,
  Trash2,
  X,
  Check,
  HardDrive,
  PenLine,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import { makeBoard, templates } from "./templates";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

window.EXCALIDRAW_ASSET_PATH = import.meta.env.DEV
  ? "/node_modules/@excalidraw/excalidraw/dist/prod/"
  : "./";
const STORE = "paperplane-boards-v1";
const dateLabel = (time) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    time,
  );
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M5 16 27 5 19 28 14 19 5 16Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="m14 19 13-14" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      paperplane<span className="brand-dot">.</span>
    </span>
  );
}
function Thumbnail({ board }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    let url;
    if (board.elements.some((e) => !e.isDeleted))
      exportToSvg({
        elements: board.elements,
        appState: { ...board.appState, exportBackground: false },
        files: board.files,
      })
        .then((svg) => {
          url = URL.createObjectURL(
            new Blob([svg.outerHTML], { type: "image/svg+xml" }),
          );
          if (alive) setSrc(url);
        })
        .catch(() => {});
    else setSrc("");
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [board.elements, board.files]);
  return (
    <div
      className="thumbnail"
      style={{ backgroundColor: board.color || "#f4f3f1" }}
    >
      {src ? (
        <img src={src} alt={`Preview of ${board.title}`} />
      ) : (
        <div className="blank-preview">
          <PenLine size={30} />
          <span>Something starts here</span>
        </div>
      )}
    </div>
  );
}
function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 480 250">
        <defs>
          <pattern
            id="dots"
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#d7d4e2" />
          </pattern>
        </defs>
        <rect width="480" height="250" fill="url(#dots)" />
        <g transform="rotate(-7 110 105)">
          <rect
            x="42"
            y="57"
            width="132"
            height="93"
            rx="5"
            fill="#ece7ff"
            stroke="#70628e"
            strokeWidth="1.5"
          />
          <text
            x="108"
            y="94"
            textAnchor="middle"
            fontFamily="Georgia"
            fontSize="19"
            fill="#413654"
          >
            what if?
          </text>
          <path d="M73 115q40-6 70 0" stroke="#9385b0" fill="none" />
        </g>
        <path
          d="M185 112q40-65 100-15m-12-16 13 17-22 5"
          fill="none"
          stroke="#4d49fc"
          strokeWidth="2"
        />
        <g transform="rotate(5 343 100)">
          <rect
            x="293"
            y="56"
            width="111"
            height="77"
            rx="38"
            fill="#e9f2db"
            stroke="#788b5b"
            strokeWidth="1.5"
          />
          <text
            x="348"
            y="102"
            textAnchor="middle"
            fontFamily="Georgia"
            fontSize="18"
            fill="#4c6035"
          >
            let’s try.
          </text>
        </g>
        <path
          d="M353 147q-15 52-80 43m11-12-13 12 16 10"
          fill="none"
          stroke="#737078"
          strokeWidth="1.5"
        />
        <g transform="rotate(-3 232 196)">
          <rect
            x="164"
            y="165"
            width="108"
            height="57"
            fill="#ffe7d4"
            stroke="#b48b68"
            strokeWidth="1.5"
          />
          <text
            x="218"
            y="200"
            textAnchor="middle"
            fontFamily="Georgia"
            fontSize="17"
            fill="#745035"
          >
            make it real
          </text>
        </g>
        <path
          d="m424 164 4 12 13 1-11 8 3 13-11-8-11 7 4-12-10-9 13 1Z"
          fill="#e5ddff"
          stroke="#9687bd"
        />
      </svg>
    </div>
  );
}

function App() {
  const [boards, setBoards] = useState([]),
    [ready, setReady] = useState(false),
    [active, setActive] = useState(null),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("recent"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Saved locally"),
    [sidebar, setSidebar] = useState(true),
    [menu, setMenu] = useState(null);
  const records = useRef([]),
    pending = useRef(null),
    api = useRef(null),
    timer = useRef(null),
    queue = useRef(Promise.resolve()),
    input = useRef(null),
    currentId = useRef(null),
    lastScene = useRef(new Map());
  const [libraryItems, setLibraryItems] = useState([]);
  const libraryQueue = useRef(Promise.resolve());
  function saveLibrary(items) {
    libraryQueue.current = libraryQueue.current
      .catch(() => {})
      .then(() => set("paperplane-library", items))
      .catch((err) => setError(err.message));
  }
  function persist(next) {
    records.current = next;
    setBoards(next);
    setStatus("Saving…");
    queue.current = queue.current
      .catch(() => {})
      .then(() => set(STORE, next))
      .then(() => setStatus("Saved locally"))
      .catch((err) => {
        setStatus("Not saved");
        setError(
          `Your browser could not save this board. Export a backup before closing. ${err.message}`,
        );
      });
    return queue.current;
  }
  useEffect(() => {
    get(STORE)
      .then((data) => {
        const initial = Array.isArray(data)
          ? data
          : templates.slice(1).map(makeBoard);
        records.current = initial;
        setBoards(initial);
        if (!Array.isArray(data)) return set(STORE, initial);
      })
      .catch((err) => setError(`Local storage is unavailable: ${err.message}`))
      .finally(() => setReady(true));
    return () => clearTimeout(timer.current);
  }, []);
  function flush() {
    clearTimeout(timer.current);
    const update = pending.current;
    pending.current = null;
    if (update)
      return persist(
        records.current.map((b) =>
          b.id === update.id
            ? { ...b, ...update.scene, updated: Date.now() }
            : b,
        ),
      );
    return queue.current;
  }
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const unload = (e) => {
      if (pending.current || status === "Saving…" || status === "Not saved") {
        flush();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", unload);
    };
  }, [status]);
  async function openBoard(board) {
    await flush();
    await libraryQueue.current;
    try {
      setLibraryItems((await get("paperplane-library")) || []);
    } catch (err) {
      setError(err.message);
      setLibraryItems([]);
    }
    currentId.current = board.id;
    api.current = null;
    setActive(board.id);
    setMenu(null);
  }
  async function create(template) {
    await flush();
    const board = makeBoard(template);
    await persist([board, ...records.current]);
    setModal(null);
    openBoard(board);
  }
  async function patch(id, changes) {
    await flush();
    await persist(
      records.current.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    );
  }
  async function duplicate(id) {
    await flush();
    const source = records.current.find((b) => b.id === id);
    const board = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      title: `${source.title} copy`,
      created: Date.now(),
      updated: Date.now(),
    };
    await persist([board, ...records.current]);
    setMenu(null);
  }
  async function remove(id) {
    await flush();
    await persist(records.current.filter((b) => b.id !== id));
    if (active === id) {
      setActive(null);
      currentId.current = null;
    }
    setModal(null);
  }
  function onChange(elements, appState, files) {
    if (!currentId.current) return;
    const serialized = serializeAsJSON(elements, appState, files, "local");
    if (lastScene.current.get(currentId.current) === serialized) return;
    lastScene.current.set(currentId.current, serialized);
    const scene = JSON.parse(serialized);
    pending.current = {
      id: currentId.current,
      scene: {
        elements: scene.elements,
        appState: scene.appState,
        files: scene.files || {},
      },
    };
    setStatus("Saving…");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }
  async function exportBoard(type, boardId = active) {
    try {
      await flush();
      const board = records.current.find((b) => b.id === boardId);
      if (!board) return;
      const name = board.title.replace(/[\\/:*?"<>|]/g, "_");
      if (type === "json")
        download(
          new Blob(
            [
              serializeAsJSON(
                board.elements,
                board.appState,
                board.files,
                "local",
              ),
            ],
            { type: "application/json" },
          ),
          `${name}.excalidraw`,
        );
      else {
        const options = {
          elements: board.elements.filter((e) => !e.isDeleted),
          appState: { ...board.appState, exportBackground: true },
          files: board.files,
        };
        if (!options.elements.length)
          throw new Error(
            "Add something to the canvas before exporting an image.",
          );
        if (type === "svg") {
          const svg = await exportToSvg(options);
          download(
            new Blob([svg.outerHTML], { type: "image/svg+xml" }),
            `${name}.svg`,
          );
        } else {
          const blob = await exportToBlob({
            ...options,
            mimeType: "image/png",
          });
          download(blob, `${name}.png`);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setMenu(null);
  }
  async function importBoard(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Please import a file smaller than 50 MB.");
      const scene = JSON.parse(await file.text());
      if (scene.type !== "excalidraw" || !Array.isArray(scene.elements))
        throw new Error("Choose a valid .excalidraw file.");
      const board = {
        ...makeBoard(),
        title: file.name.replace(/\.(excalidraw|json)$/i, ""),
        elements: scene.elements,
        appState: { ...scene.appState, collaborators: undefined },
        files: scene.files || {},
      };
      await flush();
      await persist([board, ...records.current]);
      await openBoard(board);
    } catch (err) {
      setError(err.message);
    }
  }
  const selected = boards.find((b) => b.id === active);
  const visible = boards
    .filter(
      (b) =>
        (filter !== "favorites" || b.favorite) &&
        b.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title) : b.updated - a.updated,
    );
  if (!ready)
    return (
      <div className="loading">
        <Logo />
        <p>Opening your studio…</p>
      </div>
    );
  return (
    <div className={selected ? "app editor-app" : "app"}>
      <input
        ref={input}
        hidden
        type="file"
        accept=".excalidraw,.json"
        onChange={importBoard}
      />
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {selected ? (
        <>
          <header className="editor-header">
            <button
              className="icon-button"
              aria-label="Back to boards"
              onClick={async () => {
                await flush();
                currentId.current = null;
                setActive(null);
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <span className="header-divider" />
            <Logo />
            <input
              className="board-title"
              aria-label="Board title"
              value={selected.title}
              onChange={(e) => patch(selected.id, { title: e.target.value })}
              onBlur={() => {
                if (!selected.title.trim())
                  patch(selected.id, { title: "Untitled board" });
              }}
            />
            <span className="save-state">
              <span
                className={
                  status === "Not saved" ? "status-dot failed" : "status-dot"
                }
              />
              {status}
            </span>
            <button
              className="icon-button"
              aria-label="Favorite board"
              aria-pressed={selected.favorite}
              onClick={() =>
                patch(selected.id, { favorite: !selected.favorite })
              }
            >
              <Star
                size={18}
                fill={selected.favorite ? "currentColor" : "none"}
              />
            </button>
            <div className="export-wrap">
              <button
                className="button primary small"
                onClick={() => setMenu(menu === "export" ? null : "export")}
              >
                <Download size={16} />
                Export
              </button>
              {menu === "export" && (
                <div className="dropdown export-menu">
                  <button onClick={() => exportBoard("png")}>PNG image</button>
                  <button onClick={() => exportBoard("svg")}>SVG vector</button>
                  <button onClick={() => exportBoard("json")}>
                    Editable .excalidraw
                  </button>
                </div>
              )}
            </div>
          </header>
          <main className="editor-canvas">
            <Excalidraw
              key={selected.id}
              excalidrawAPI={(value) => {
                api.current = value;
              }}
              initialData={{
                elements: selected.elements,
                appState: selected.appState,
                files: selected.files,
                libraryItems,
                scrollToContent: !selected.appState.zoom,
              }}
              onChange={onChange}
              onLibraryChange={saveLibrary}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  toggleTheme: true,
                },
              }}
            >
              <MainMenu>
                <MainMenu.DefaultItems.SaveAsImage />
                <MainMenu.DefaultItems.ClearCanvas />
                <MainMenu.DefaultItems.ToggleTheme />
                <MainMenu.DefaultItems.ChangeCanvasBackground />
                <MainMenu.DefaultItems.Help />
              </MainMenu>
            </Excalidraw>
          </main>
          <footer className="editor-footer">
            <span>
              <ShieldCheck size={14} />
              Private by design. Saved in this browser.
            </span>
            <span>
              Powered by Excalidraw <ArrowUpRight size={13} />
            </span>
          </footer>
        </>
      ) : (
        <>
          {sidebar && (
            <aside className="sidebar">
              <Logo />
              <div className="workspace-label">YOUR PERSONAL STUDIO</div>
              <nav>
                <button
                  className={filter === "all" ? "nav-item active" : "nav-item"}
                  onClick={() => setFilter("all")}
                >
                  <LayoutGrid size={18} />
                  All boards<span>{boards.length}</span>
                </button>
                <button
                  className={
                    filter === "favorites" ? "nav-item active" : "nav-item"
                  }
                  onClick={() => setFilter("favorites")}
                >
                  <Star size={18} />
                  Favorites
                  <span>{boards.filter((b) => b.favorite).length}</span>
                </button>
                <button
                  className="nav-item"
                  onClick={() => setModal({ type: "new" })}
                >
                  <PenLine size={18} />
                  Start from a template
                  <ArrowUpRight size={15} />
                </button>
              </nav>
              <div className="sidebar-note">
                <span className="note-icon">✳</span>
                <h3>
                  Your ideas.
                  <br />
                  Your space.
                </h3>
                <p>
                  No accounts. No cloud.
                  <br />
                  Just a little room to think.
                </p>
              </div>
              <div className="local-badge">
                <HardDrive size={17} />
                <div>
                  <strong>Local workspace</strong>
                  <span>Only on this device</span>
                </div>
                <span className="status-dot" />
              </div>
            </aside>
          )}
          <div className="main-shell">
            <header className="topbar">
              <div>
                <button
                  className="icon-button"
                  aria-label="Toggle sidebar"
                  onClick={() => setSidebar(!sidebar)}
                >
                  {sidebar ? (
                    <PanelLeftClose size={18} />
                  ) : (
                    <PanelLeftOpen size={18} />
                  )}
                </button>
                <span>Workspace</span>
                <span className="breadcrumb">/</span>
                <strong>
                  {filter === "favorites" ? "Favorites" : "All boards"}
                </strong>
              </div>
              <div>
                <span className="private-pill">
                  <ShieldCheck size={14} />
                  Private & local
                </span>
                <span className="avatar">You</span>
              </div>
            </header>
            <main className="library">
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    A LITTLE SPACE. ENDLESS POSSIBILITIES.
                  </span>
                  <h1>
                    Good ideas
                    <br />
                    start with <em>room.</em>
                  </h1>
                  <p>
                    Sketch a thought. Connect the dots.
                    <br />
                    Make something only you could make.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "new" })}
                  >
                    <Plus size={18} />
                    Create a board
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <HeroArt />
              </section>
              <section className="templates-section">
                <div className="section-heading">
                  <h2>A place to begin</h2>
                  <span>Skip the blank-page feeling</span>
                </div>
                <div className="template-grid">
                  {templates.map((t) => (
                    <button
                      className="template-card"
                      key={t.id}
                      onClick={() => create(t)}
                    >
                      <span
                        className="template-icon"
                        style={{ background: t.color }}
                      >
                        {t.icon}
                      </span>
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.category}</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </section>
              <section className="boards-section">
                <div className="boards-heading">
                  <div>
                    <h2>
                      {filter === "favorites"
                        ? "Your favorites"
                        : "Your boards"}
                      <span className="count">{visible.length}</span>
                    </h2>
                    <p>
                      Little thoughts, big plans, and everything in between.
                    </p>
                  </div>
                  <div className="board-actions">
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Search boards"
                        placeholder="Find a board…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <button
                      className="button ghost small"
                      onClick={() => input.current.click()}
                    >
                      <Upload size={15} />
                      Import
                    </button>
                    <select
                      aria-label="Sort boards"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Last edited</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </div>
                </div>
                <div className="board-grid">
                  {visible.map((b) => (
                    <article className="board-card" key={b.id}>
                      <button
                        className="board-open"
                        onClick={() => openBoard(b)}
                      >
                        <Thumbnail board={b} />
                        <div className="board-info">
                          <strong>{b.title || "Untitled board"}</strong>
                          <span>
                            Edited {dateLabel(b.updated)} <span>•</span>{" "}
                            {b.elements.filter((e) => !e.isDeleted).length}{" "}
                            elements
                          </span>
                        </div>
                      </button>
                      <button
                        className="favorite-button"
                        aria-label={`Favorite ${b.title}`}
                        aria-pressed={b.favorite}
                        onClick={() => patch(b.id, { favorite: !b.favorite })}
                      >
                        <Star
                          size={16}
                          fill={b.favorite ? "currentColor" : "none"}
                        />
                      </button>
                      <div className="card-menu">
                        <button
                          className="icon-button"
                          aria-label={`Options for ${b.title}`}
                          onClick={() => setMenu(menu === b.id ? null : b.id)}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                        {menu === b.id && (
                          <div className="dropdown">
                            <button
                              onClick={() => {
                                setModal({
                                  type: "rename",
                                  id: b.id,
                                  title: b.title,
                                });
                                setMenu(null);
                              }}
                            >
                              <PenLine size={14} />
                              Rename
                            </button>
                            <button onClick={() => duplicate(b.id)}>
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <button onClick={() => exportBoard("json", b.id)}>
                              <Download size={14} />
                              Export backup
                            </button>
                            <button
                              className="danger"
                              onClick={() => {
                                setModal({
                                  type: "delete",
                                  id: b.id,
                                  title: b.title,
                                });
                                setMenu(null);
                              }}
                            >
                              <Trash2 size={14} />
                              Delete board
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {!query && filter === "all" && (
                    <button
                      className="new-board-card"
                      onClick={() => setModal({ type: "new" })}
                    >
                      <span>
                        <Plus size={24} />
                      </span>
                      <strong>Make room for another idea</strong>
                      <small>Create a new board</small>
                    </button>
                  )}
                </div>
                {visible.length === 0 && (
                  <div className="empty-state">
                    <FolderOpen size={34} />
                    <h3>
                      {query
                        ? "No boards found"
                        : "A little space waiting for you"}
                    </h3>
                    <p>
                      {query
                        ? "Try another name."
                        : filter === "favorites"
                          ? "Star a board to keep it close."
                          : "Create your first board to get started."}
                    </p>
                  </div>
                )}
              </section>
              <footer className="library-footer">
                <span>
                  <span className="status-dot" />
                  All yours. Saved locally.
                </span>
                <span>
                  Built with{" "}
                  <a
                    href="https://github.com/excalidraw/excalidraw"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Excalidraw
                  </a>{" "}
                  · No account needed
                </span>
              </footer>
            </main>
          </div>
        </>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.type === "new"
                ? "Create a board"
                : modal.type === "delete"
                  ? "Delete board"
                  : "Rename board"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal.type === "new" ? (
              <>
                <span className="eyebrow">THE FIRST LITTLE STEP</span>
                <h2>What’s on your mind?</h2>
                <p>Pick a starting point. Make it your own.</p>
                <div className="modal-templates">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => create(t)}>
                      <span
                        className="template-icon"
                        style={{ background: t.color }}
                      >
                        {t.icon}
                      </span>
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                      </span>
                      <ArrowUpRight size={19} />
                    </button>
                  ))}
                </div>
              </>
            ) : modal.type === "rename" ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await patch(modal.id, {
                    title: modal.title.trim() || "Untitled board",
                  });
                  setModal(null);
                }}
              >
                <h2>A name for your idea</h2>
                <input
                  autoFocus
                  aria-label="New board name"
                  className="rename-input"
                  value={modal.title}
                  onChange={(e) =>
                    setModal({ ...modal, title: e.target.value })
                  }
                  maxLength={120}
                />
                <button className="button primary" type="submit">
                  <Check size={17} />
                  Save name
                </button>
              </form>
            ) : (
              <>
                <h2>Delete this board?</h2>
                <p>
                  “{modal.title}” will be permanently deleted from this browser.
                  Export a backup first if you want to keep it.
                </p>
                <div className="modal-actions">
                  <button
                    className="button ghost"
                    onClick={() => setModal(null)}
                  >
                    Keep board
                  </button>
                  <button
                    className="button delete-button"
                    onClick={() => remove(modal.id)}
                  >
                    Delete board
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
