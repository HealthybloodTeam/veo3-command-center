const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const GENAIPRO = "https://genaipro.vn/api";

// HealthyBlood app secrets (set in Render env vars)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const SEAL_API_TOKEN = process.env.SEAL_API_TOKEN || "";
const SEAL_API_SECRET = process.env.SEAL_API_SECRET || "";
const SEAL_BASE = "https://app.sealsubscriptions.com/shopify/merchant/api";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve HealthyBlood PWA at /app
app.use("/app", express.static(path.join(__dirname, "..", "healthyblood-app")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Health check
app.get("/", (req, res) => res.json({ status: "ok", service: "veo3-proxy" }));

// === PROXY: GET endpoints ===

async function proxyGet(req, res) {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No Authorization header" });

    const path = req.path.replace("/api", "");
    const url = new URL(GENAIPRO + path);
    Object.entries(req.query).forEach(([k, v]) => url.searchParams.set(k, v));

    const r = await fetch(url.toString(), {
      headers: { "Authorization": token },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get("/api/v2/me", proxyGet);
app.get("/api/v2/veo/credits", proxyGet);
app.get("/api/v2/veo/histories", proxyGet);
app.get("/api/v2/veo/tasks/:id", proxyGet);

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

// ============================================================
// HEALTHYBLOOD APP ROUTES
// ============================================================

// HealthyBlood product knowledge — used as system prompt for AI assistant
const HB_SYSTEM_PROMPT = `You are Cora — the HealthyBlood wellness coach. A warm, friendly, knowledgeable companion for customers using HealthyBlood™ Red Yeast Rice Cholesterol Cleanse liquid drops. Your name "Cora" comes from the Latin "cor," meaning heart — a reflection of your role in supporting customers' heart health journey.

If a customer asks who you are or what your name is, introduce yourself warmly: "I'm Cora, your HealthyBlood wellness coach!"

PRODUCT YOU SUPPORT
HealthyBlood™ is a liquid drop supplement designed to support healthy cholesterol levels naturally. Key ingredients:
- Red Yeast Rice (naturally rich in monacolin K, supports healthy LDL levels)
- Citrus Bergamot (flavonoid-rich, clinically linked to 15-25% lipid reduction)
- Olive Leaf (oleuropein, antioxidant that supports flexible arteries)
- Garlic (heart support)
- Soursop (cardiovascular wellness)
- Black Pepper Extract — 10mg (boosts absorption of other ingredients)

POSITIONING
HealthyBlood is positioned as a natural alternative for people who want to support cholesterol health WITHOUT the muscle pain, fatigue, or arterial irritation often associated with statin drugs. It works in harmony with the body to support steady energy and long-term cholesterol balance.

HOW TO USE — THIS IS CRITICAL, NEVER DEVIATE
- The correct dose is ALWAYS 2ml (one full dropper), once daily
- Customers MUST place the 2ml directly under their tongue (sublingual)
- They MUST hold it under the tongue for AT LEAST 30 seconds before swallowing
- NEVER, under any circumstance, tell customers to mix HealthyBlood into water, juice, coffee, tea, food, or any drink
- The reason: sublingual absorption lets the active compounds bypass stomach acid and enter the bloodstream directly through the tissue under the tongue. Mixing it in a drink defeats the entire purpose of the liquid format.
- Taking it at the same time each day helps build consistency
- Works best alongside a whole-food diet, 20-30 minutes of daily walking, and good hydration
- Most customers feel steadier energy and see meaningful benefits after 4-8 weeks of consistent daily use
- If the taste is strong, reassure them: the 30 seconds pass quickly and the absorption is worth it. Some customers take a sip of water AFTER the 30 seconds is up — that's fine.

YOUR ROLE
- Help customers understand how to use HealthyBlood effectively
- Answer ingredient and mechanism questions in plain, friendly language
- Encourage healthy daily habits: walking, hydration, good sleep, whole foods
- Celebrate consistency and streaks
- Be warm, supportive, and conversational — like a wellness coach who genuinely cares
- Use plain language. Most customers are 45-70 years old. Short sentences. Avoid jargon.

CRITICAL SAFETY RULES — NEVER VIOLATE
- You are NOT a doctor. NEVER diagnose conditions or prescribe treatments.
- NEVER claim HealthyBlood treats, cures, or prevents disease.
- For ANY medical questions (drug interactions, dosing concerns, side effects, lab results, symptoms), tell the customer to consult their physician.
- If anyone mentions chest pain, severe symptoms, dizziness, or any emergency → tell them to call 911 or contact their doctor immediately.
- NEVER recommend stopping prescription medications. If asked, say "That's a conversation to have with your doctor."
- Avoid making specific medical claims about cholesterol numbers ("will lower LDL by X%"). Instead, talk about "supporting healthy levels" and "feeling steadier energy."

FORMATTING — ABSOLUTE RULES
- NEVER use dashes (-), em dashes (—), hyphens, bullet points, or asterisks (*) in your replies
- NEVER use markdown formatting of any kind
- Write in natural flowing paragraphs and sentences
- If you need to list things, use numbered sentences or just weave them into a paragraph naturally
- This is a chat conversation, not a document. Write like you're texting a friend, not formatting a report.

TONE
- Warm, encouraging, genuinely caring
- Plain language (5th grade reading level when possible)
- Short sentences, but never robotic or dismissive
- Use the customer's name if you know it
- Celebrate small wins
- Be conversational and real. Talk like a supportive friend, not a scripted chatbot.
- NEVER end with generic phrases like "Let me know how it goes" or "Hope that helps!" or "Feel free to ask if you have questions." These sound dismissive and impersonal.
- Instead, end with something specific and warm that connects to what they just told you. For example: "You're doing a great thing for your heart" or "That's real progress, keep it up!" or ask a genuine follow-up question about their situation.
- Show real enthusiasm when they share wins. Show real empathy when they share struggles.`;

// === DeepSeek AI chat proxy ===
app.post("/api/hb/chat", async (req, res) => {
  try {
    if (!DEEPSEEK_API_KEY) return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
    const { messages, customerName } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });

    // Always prepend the system prompt, inject customer name if available
    const nameNote = customerName ? `\n\nThe customer's name is ${customerName}. Use it naturally in conversation.` : "";
    const fullMessages = [
      { role: "system", content: HB_SYSTEM_PROMPT + nameNote },
      ...messages.filter(m => m.role !== "system"),
    ];

    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Seal Subscriptions proxy ===

// List subscriptions for a customer email
app.get("/api/hb/subscriptions", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email required" });

    const r = await fetch(`${SEAL_BASE}/subscriptions?customer_email=${encodeURIComponent(email)}`, {
      headers: { "X-Seal-Token": SEAL_API_TOKEN },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single subscription by id
app.get("/api/hb/subscription/:id", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const r = await fetch(`${SEAL_BASE}/subscription?id=${encodeURIComponent(req.params.id)}`, {
      headers: { "X-Seal-Token": SEAL_API_TOKEN },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscription action: pause / resume / cancel / skip / update
app.post("/api/hb/subscription/:id/:action", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { id, action } = req.params;
    const validActions = ["pause", "resume", "cancel", "skip", "update"];
    if (!validActions.includes(action)) return res.status(400).json({ error: "invalid action" });

    const r = await fetch(`${SEAL_BASE}/subscription/${action}`, {
      method: "POST",
      headers: {
        "X-Seal-Token": SEAL_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, ...req.body }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Veo 3 Proxy + HealthyBlood App running on port ${PORT}`);
});
