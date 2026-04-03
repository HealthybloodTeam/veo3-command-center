const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3001;
const GENAIPRO = "https://genaipro.vn/api";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Health check
app.get("/", (req, res) => res.json({ status: "ok", service: "veo3-proxy" }));

// === PROXY: JSON endpoints ===

// GET proxy (credits, histories, tasks, user info)
app.get("/api/v2/*", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const path = req.path.replace("/api", "");
    const url = new URL(GENAIPRO + path);
    // Forward query params
    Object.entries(req.query).forEach(([k, v]) => url.searchParams.set(k, v));

    const r = await fetch(url.toString(), {
      headers: { "Authorization": token },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST proxy: text-to-video (JSON body)
app.post("/api/v2/veo/text-to-video", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const r = await fetch(`${GENAIPRO}/v2/veo/text-to-video`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST proxy: frames-to-video (multipart)
app.post("/api/v2/veo/frames-to-video", upload.fields([
  { name: "start_image", maxCount: 1 },
  { name: "end_image", maxCount: 1 },
]), async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const formData = new FormData();
    if (req.files?.start_image?.[0]) {
      const f = req.files.start_image[0];
      formData.append("start_image", new Blob([f.buffer], { type: f.mimetype }), f.originalname);
    }
    if (req.files?.end_image?.[0]) {
      const f = req.files.end_image[0];
      formData.append("end_image", new Blob([f.buffer], { type: f.mimetype }), f.originalname);
    }
    if (req.body.prompt) formData.append("prompt", req.body.prompt);
    if (req.body.aspect_ratio) formData.append("aspect_ratio", req.body.aspect_ratio);
    if (req.body.number_of_videos) formData.append("number_of_videos", req.body.number_of_videos);

    const r = await fetch(`${GENAIPRO}/v2/veo/frames-to-video`, {
      method: "POST",
      headers: { "Authorization": token },
      body: formData,
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST proxy: ingredients-to-video (multipart)
app.post("/api/v2/veo/ingredients-to-video", upload.array("reference_images", 3), async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const formData = new FormData();
    if (req.files) {
      req.files.forEach(f => {
        formData.append("reference_images", new Blob([f.buffer], { type: f.mimetype }), f.originalname);
      });
    }
    if (req.body.prompt) formData.append("prompt", req.body.prompt);
    if (req.body.number_of_videos) formData.append("number_of_videos", req.body.number_of_videos);

    const r = await fetch(`${GENAIPRO}/v2/veo/ingredients-to-video`, {
      method: "POST",
      headers: { "Authorization": token },
      body: formData,
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST proxy: create-image (multipart)
app.post("/api/v2/veo/create-image", upload.array("reference_images", 5), async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const formData = new FormData();
    if (req.files) {
      req.files.forEach(f => {
        formData.append("reference_images", new Blob([f.buffer], { type: f.mimetype }), f.originalname);
      });
    }
    if (req.body.prompt) formData.append("prompt", req.body.prompt);
    if (req.body.aspect_ratio) formData.append("aspect_ratio", req.body.aspect_ratio);
    if (req.body.number_of_images) formData.append("number_of_images", req.body.number_of_images);

    const r = await fetch(`${GENAIPRO}/v2/veo/create-image`, {
      method: "POST",
      headers: { "Authorization": token },
      body: formData,
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Veo 3 Proxy running on port ${PORT}`);
});
