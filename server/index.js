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
// Shopify Admin API (optional — for future use if access token becomes available)
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || "";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";

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
// === Seal Subscriptions API ===
// Docs: https://docs.sealsubscriptions.com/merchant-api
// All Seal actions use PUT to /subscription with { id, action } in body.
// Listing uses GET /subscriptions?query=email&with-items=true

// List subscriptions by customer email
app.get("/api/hb/subscriptions", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email required" });

    // Seal uses "query" param for search, "with-items=true" for line items, "with-billing-attempts=true" for next delivery dates
    const sealUrl = `${SEAL_BASE}/subscriptions?query=${encodeURIComponent(email)}&with-items=true&with-billing-attempts=true`;
    console.log("[Seal] Fetching:", sealUrl);
    const r = await fetch(sealUrl, {
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
    });
    const data = await r.json();
    console.log("[Seal] Status:", r.status, "| Top keys:", Object.keys(data), "| Type:", Array.isArray(data) ? "array" : typeof data);

    // Debug: log the full payload structure so we can see exactly what Seal returns
    if (data.payload !== undefined) {
      const p = data.payload;
      console.log("[Seal] payload type:", Array.isArray(p) ? "array" : typeof p,
        Array.isArray(p) ? `(${p.length} items)` : p && typeof p === "object" ? `keys: ${Object.keys(p).join(", ")}` : String(p));
      // If payload is an object, log deeper
      if (p && typeof p === "object" && !Array.isArray(p)) {
        for (const k of Object.keys(p)) {
          const v = p[k];
          console.log(`[Seal]   payload.${k}:`, Array.isArray(v) ? `array(${v.length})` : typeof v, Array.isArray(v) && v.length > 0 ? `first keys: ${Object.keys(v[0]).join(",")}` : "");
        }
      }
    }

    // Normalize — handle every possible shape Seal might return
    let subs = [];
    if (Array.isArray(data)) {
      subs = data;
    } else if (data.payload) {
      const p = data.payload;
      if (Array.isArray(p)) {
        subs = p;
      } else if (typeof p === "object") {
        // payload might be { subscriptions: [...] } or contain the subs under some key
        subs = p.subscriptions || p.data || p.results || (p.items && Array.isArray(p.items) ? p.items : []);
        // If payload itself looks like a single subscription (has id + status), wrap it
        if (subs.length === 0 && p.id && p.status) {
          subs = [p];
        }
      }
    } else if (data.subscriptions) {
      subs = data.subscriptions;
    } else if (data.data) {
      subs = data.data;
    }
    console.log("[Seal] Final parsed:", subs.length, "subscriptions");
    if (subs.length > 0) console.log("[Seal] First sub keys:", Object.keys(subs[0]).join(", "));

    res.json({ subscriptions: subs });
  } catch (err) {
    console.error("[Seal] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a single subscription by id (returns full details with items + billing attempts)
app.get("/api/hb/subscription/:id", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const r = await fetch(`${SEAL_BASE}/subscription?id=${encodeURIComponent(req.params.id)}`, {
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
    });
    const data = await r.json();
    // Seal returns { success: true, payload: { ...subscription } }
    res.json(data.payload || data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT: Specific routes MUST come before the wildcard :id/:action route
// or Express will match "edit", "skip-next", "edit-items" as :action params.

// Edit subscription (interval/frequency changes)
// Seal uses PUT to /subscription with { id, action: "edit", edit: { ... } }
app.post("/api/hb/subscription/:id/edit", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { id } = req.params;
    const editPayload = req.body;

    console.log("[Seal] Edit subscription:", id, "payload:", JSON.stringify(editPayload));
    const r = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT",
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ id: parseInt(id), action: "edit", edit: editPayload }),
    });
    const data = await r.json();
    console.log("[Seal] Edit response:", r.status, data);
    res.status(r.status).json(data);
  } catch (err) {
    console.error("[Seal] Edit error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Skip next billing attempt
// Seal uses PUT to /subscription-billing-attempt with { id, subscription_id, action: "skip" }
app.post("/api/hb/subscription/:subId/skip-next", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { subId } = req.params;
    const { billingAttemptId } = req.body;

    if (!billingAttemptId) return res.status(400).json({ error: "billingAttemptId required" });

    console.log("[Seal] Skip billing attempt:", billingAttemptId, "on subscription:", subId);
    const r = await fetch(`${SEAL_BASE}/subscription-billing-attempt`, {
      method: "PUT",
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ id: parseInt(billingAttemptId), subscription_id: parseInt(subId), action: "skip" }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit subscription item quantity: add new item first, then remove old
// Seal has no direct qty edit — must do add_items + remove_items
// Adding first ensures the subscription always has at least one item
app.post("/api/hb/subscription/:id/edit-items", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { itemId, quantity, product_id, variant_id, title, sku, price, taxable, requires_shipping } = req.body;
    const subId = parseInt(req.params.id);

    // Build add_items payload with ALL required fields
    // SKU: use actual sku, fallback to variant_id (Seal requires non-empty sku)
    // one_time: required by Seal, 0 = recurring subscription item
    const newItem = {
      product_id: String(product_id),
      variant_id: String(variant_id),
      quantity: String(quantity),
      title: title || "HealthyBlood Cholesterol Cleanse",
      sku: (sku && sku.trim()) ? sku.trim() : String(variant_id),
      price: parseFloat(price) || 0,
      taxable: taxable || 1,
      requires_shipping: requires_shipping || 1,
      one_time: 0,
    };

    console.log("[Seal] Qty change — sub:", subId, "old item:", itemId, "new qty:", quantity);
    console.log("[Seal] add_items payload:", JSON.stringify(newItem));

    // Step 1: Add item with new quantity
    const r1 = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT",
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ id: subId, action: "add_items", add_items: [newItem] }),
    });
    const d1 = await r1.json();
    console.log("[Seal] add_items response:", r1.status, JSON.stringify(d1));
    if (!d1.success && !r1.ok) return res.status(r1.status).json(d1);

    // Step 2: Remove old item (now safe — subscription has 2 items)
    const r2 = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT",
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ id: subId, action: "remove_items", remove_items: [itemId] }),
    });
    const d2 = await r2.json();
    console.log("[Seal] remove_items response:", r2.status, JSON.stringify(d2));
    res.status(r2.status).json(d2);
  } catch (err) {
    console.error("[Seal] Edit items error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Subscription actions: pause, resume, reactivate, cancel
// MUST be LAST — this wildcard route catches :id/:action so specific routes above take priority
app.post("/api/hb/subscription/:id/:action", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "SEAL_API_TOKEN not configured" });
    const { id, action } = req.params;
    const validActions = ["pause", "resume", "reactivate", "cancel"];
    if (!validActions.includes(action)) return res.status(400).json({ error: "invalid action: " + action });

    console.log("[Seal] Action:", action, "on subscription:", id);
    const r = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT",
      headers: { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ id: parseInt(id), action }),
    });
    const data = await r.json();
    console.log("[Seal] Action response:", r.status, data.success !== undefined ? `success=${data.success}` : "");
    res.status(r.status).json(data);
  } catch (err) {
    console.error("[Seal] Action error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Loyalty Reward — Permanent discount on Seal subscription
// Base: 20% off | Tier 1 (3 orders): 30% off | Tier 2 (6 orders): 35% off
// Miss an order → resets to base 20%
// Applies by editing item price directly in Seal (remove old, add at discounted price)
// ==========================================
app.post("/api/hb/loyalty-reward", async (req, res) => {
  try {
    if (!SEAL_API_TOKEN) return res.status(500).json({ error: "Seal API not configured" });
    const { subscriptionId, discountPercent, email } = req.body;
    if (!subscriptionId || !discountPercent) return res.status(400).json({ error: "subscriptionId and discountPercent required" });

    const subId = parseInt(subscriptionId);
    const sealHeaders = { "X-Seal-Token": SEAL_API_TOKEN, "Content-Type": "application/json" };
    console.log(`[Loyalty] Applying ${discountPercent}% permanent discount to sub ${subId} for ${email}`);

    // Step 1: Fetch the subscription to get current item details
    const fetchUrl = `${SEAL_BASE}/subscriptions?query=${encodeURIComponent(email)}&with-items=true`;
    const fr = await fetch(fetchUrl, { headers: sealHeaders });
    const fd = await fr.json();
    const subs = fd.payload?.subscriptions || fd.payload || [];
    const sub = (Array.isArray(subs) ? subs : [subs]).find(s => s.id === subId || String(s.id) === String(subId));

    if (!sub || !sub.items?.[0]) {
      console.error("[Loyalty] Subscription or items not found:", subId);
      return res.status(404).json({ error: "Subscription not found" });
    }

    const item = sub.items[0];
    const originalPrice = parseFloat(item.price || item.original_price);
    const discountedPrice = (originalPrice * (1 - discountPercent / 100)).toFixed(2);
    console.log(`[Loyalty] Item: ${item.title} | Original: $${originalPrice} → Discounted: $${discountedPrice} (${discountPercent}% off)`);

    // Step 2: Add new item at discounted price
    const newItem = {
      product_id: String(item.product_id),
      variant_id: String(item.variant_id),
      quantity: String(item.quantity || 1),
      title: item.title,
      sku: (item.sku && item.sku.trim()) ? item.sku.trim() : String(item.variant_id),
      price: parseFloat(discountedPrice),
      taxable: item.taxable || 1,
      requires_shipping: item.requires_shipping || 1,
      one_time: 0,
    };

    const r1 = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT", headers: sealHeaders,
      body: JSON.stringify({ id: subId, action: "add_items", add_items: [newItem] }),
    });
    const d1 = await r1.json();
    console.log("[Loyalty] add_items response:", r1.status, JSON.stringify(d1));
    if (!d1.success && !r1.ok) return res.status(r1.status).json({ error: d1.error || "Failed to add discounted item" });

    // Step 3: Remove old item
    const r2 = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT", headers: sealHeaders,
      body: JSON.stringify({ id: subId, action: "remove_items", remove_items: [item.id] }),
    });
    const d2 = await r2.json();
    console.log("[Loyalty] remove_items response:", r2.status, JSON.stringify(d2));

    // Step 4: Also update the subscription's total_value
    const totalValue = (parseFloat(discountedPrice) * (item.quantity || 1)).toFixed(2);
    const r3 = await fetch(`${SEAL_BASE}/subscription`, {
      method: "PUT", headers: sealHeaders,
      body: JSON.stringify({ id: subId, action: "edit", edit: { admin_note: `Loyalty ${discountPercent}% off applied — ${new Date().toISOString().split("T")[0]}` } }),
    });
    const d3 = await r3.json();
    console.log("[Loyalty] admin_note response:", r3.status);

    console.log(`[Loyalty] Done — ${discountPercent}% permanent discount applied to sub ${subId}`);
    res.json({ success: true, discountPercent, newPrice: discountedPrice, originalPrice });
  } catch (err) {
    console.error("[Loyalty] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Veo 3 Proxy + HealthyBlood App running on port ${PORT}`);
});
