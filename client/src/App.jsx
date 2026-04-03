import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = "http://localhost:3001/api";

function App() {
  const [tab, setTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("veo-3.1-generate-preview");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState("8");
  const [firstFrame, setFirstFrame] = useState(null);
  const [lastFrame, setLastFrame] = useState(null);
  const [firstFramePreview, setFirstFramePreview] = useState(null);
  const [lastFramePreview, setLastFramePreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [selectedGen, setSelectedGen] = useState(null);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("veo3_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchGenerations();
    pollRef.current = setInterval(fetchGenerations, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function fetchGenerations() {
    try {
      const res = await fetch(`${API}/generations`);
      const data = await res.json();
      setGenerations(data.generations || []);
    } catch {}
  }

  function handleFileSelect(setter, previewSetter) {
    return (e) => {
      const file = e.target.files[0];
      if (file) {
        setter(file);
        const reader = new FileReader();
        reader.onload = (ev) => previewSetter(ev.target.result);
        reader.readAsDataURL(file);
      }
    };
  }

  function clearFile(setter, previewSetter) {
    setter(null);
    previewSetter(null);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError(null);
    setGenerating(true);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("model", model);
      formData.append("aspectRatio", aspectRatio);
      formData.append("resolution", resolution);
      formData.append("duration", duration);
      if (firstFrame) formData.append("firstFrame", firstFrame);
      if (lastFrame) formData.append("lastFrame", lastFrame);

      const headers = {};
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPrompt("");
      setFirstFrame(null);
      setLastFrame(null);
      setFirstFramePreview(null);
      setLastFramePreview(null);
      fetchGenerations();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  const processing = generations.filter((g) => g.status === "processing");
  const completed = generations.filter((g) => g.status === "completed");

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">V3</div>
          <div>
            <h1>VEO 3</h1>
            <span className="subtitle">Command Center</span>
          </div>
        </div>

        <nav className="nav">
          <button
            className={`nav-btn ${tab === "generate" ? "active" : ""}`}
            onClick={() => setTab("generate")}
          >
            <span className="nav-icon">+</span>
            Generate
          </button>
          <button
            className={`nav-btn ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            <span className="nav-icon">#</span>
            History
          </button>
        </nav>

        <div className="api-key-box">
          <label className="api-key-label">API Key</label>
          <div className="api-key-input-wrap">
            <input
              type={showKey ? "text" : "password"}
              className="api-key-input"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem("veo3_api_key", e.target.value);
              }}
              placeholder="Gemini API key..."
            />
            <button
              className="api-key-toggle"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <span className={`api-key-status ${apiKey ? "connected" : ""}`}>
            {apiKey ? "Key saved" : "No key set"}
          </span>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-num">{processing.length}</span>
            <span className="stat-label">Processing</span>
          </div>
          <div className="stat">
            <span className="stat-num">{completed.length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat">
            <span className="stat-num">{generations.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {tab === "generate" && (
          <div className="generate-page">
            <h2>New Generation</h2>

            <form onSubmit={handleGenerate} className="gen-form">
              <div className="field">
                <label>Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate... Veo 3 supports audio — describe sounds, dialogue, and music too"
                  rows={4}
                  required
                />
              </div>

              <div className="settings-row">
                <div className="field">
                  <label>Model</label>
                  <select value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="veo-3.1-generate-preview">Veo 3.1 (Latest)</option>
                    <option value="veo-3-generate-preview">Veo 3</option>
                    <option value="veo-2-generate-preview">Veo 2</option>
                  </select>
                </div>
                <div className="field">
                  <label>Aspect Ratio</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
                <div className="field">
                  <label>Resolution</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
                <div className="field">
                  <label>Duration</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value="4">4 seconds</option>
                    <option value="6">6 seconds</option>
                    <option value="8">8 seconds</option>
                  </select>
                </div>
              </div>

              <div className="frames-row">
                <div className="frame-upload">
                  <label>First Frame (optional)</label>
                  <p className="hint">Image to use as the starting frame</p>
                  {firstFramePreview ? (
                    <div className="frame-preview">
                      <img src={firstFramePreview} alt="First frame" />
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => clearFile(setFirstFrame, setFirstFramePreview)}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect(setFirstFrame, setFirstFramePreview)}
                        hidden
                      />
                      <span className="upload-icon">+</span>
                      <span>Drop or click to upload</span>
                    </label>
                  )}
                </div>

                <div className="frame-upload">
                  <label>
                    Last Frame (optional)
                    <span className="badge">3.1 only</span>
                  </label>
                  <p className="hint">Image to use as the ending frame</p>
                  {lastFramePreview ? (
                    <div className="frame-preview">
                      <img src={lastFramePreview} alt="Last frame" />
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => clearFile(setLastFrame, setLastFramePreview)}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect(setLastFrame, setLastFramePreview)}
                        hidden
                      />
                      <span className="upload-icon">+</span>
                      <span>Drop or click to upload</span>
                    </label>
                  )}
                </div>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="generate-btn" disabled={generating || !prompt}>
                {generating ? "Submitting..." : "Generate Video"}
              </button>
            </form>

            {processing.length > 0 && (
              <div className="active-section">
                <h3>Active Generations</h3>
                {processing.map((gen) => (
                  <div key={gen.id} className="active-card">
                    <div className="pulse" />
                    <div>
                      <p className="active-prompt">{gen.prompt}</p>
                      <p className="active-meta">
                        {gen.model.replace("-generate-preview", "")} | {gen.aspectRatio} | {gen.resolution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="history-page">
            <h2>Generation History</h2>

            {generations.length === 0 ? (
              <div className="empty">
                <p>No generations yet. Go create something!</p>
              </div>
            ) : (
              <div className="history-grid">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className={`history-card ${gen.status}`}
                    onClick={() => gen.videoUrl && setSelectedGen(gen)}
                  >
                    <div className="card-header">
                      <span className={`status-dot ${gen.status}`} />
                      <span className="status-text">{gen.status}</span>
                      <span className="card-time">
                        {new Date(gen.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {gen.status === "completed" && gen.videoUrl ? (
                      <video
                        className="card-video"
                        src={`http://localhost:3001${gen.videoUrl}`}
                        muted
                        loop
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => {
                          e.target.pause();
                          e.target.currentTime = 0;
                        }}
                      />
                    ) : gen.status === "processing" ? (
                      <div className="card-processing">
                        <div className="spinner" />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="card-failed">
                        <span>Failed</span>
                      </div>
                    )}

                    <div className="card-body">
                      <p className="card-prompt">{gen.prompt}</p>
                      <div className="card-tags">
                        <span className="tag">{gen.model.replace("-generate-preview", "")}</span>
                        <span className="tag">{gen.aspectRatio}</span>
                        <span className="tag">{gen.resolution}</span>
                        <span className="tag">{gen.duration}s</span>
                        {gen.hasFirstFrame && <span className="tag frame-tag">1st Frame</span>}
                        {gen.hasLastFrame && <span className="tag frame-tag">Last Frame</span>}
                      </div>
                      {gen.error && <p className="card-error">{gen.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video Modal */}
        {selectedGen?.videoUrl && (
          <div className="modal-overlay" onClick={() => setSelectedGen(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedGen(null)}>
                X
              </button>
              <video
                src={`http://localhost:3001${selectedGen.videoUrl}`}
                controls
                autoPlay
                className="modal-video"
              />
              <div className="modal-info">
                <p className="modal-prompt">{selectedGen.prompt}</p>
                <div className="card-tags">
                  <span className="tag">{selectedGen.model.replace("-generate-preview", "")}</span>
                  <span className="tag">{selectedGen.aspectRatio}</span>
                  <span className="tag">{selectedGen.resolution}</span>
                  <span className="tag">{selectedGen.duration}s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
