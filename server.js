const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", assistant: "FRIDAY" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const cleanMessages = messages
      .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

    if (!cleanMessages.length || cleanMessages[cleanMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Please send a message first." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "FRIDAY is online, but its AI key has not been added yet. Add OPENAI_API_KEY in the Render environment settings."
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are FRIDAY, a helpful, calm, capable AI assistant. Your voice and personality should feel clear, friendly, confident, and respectful. Give practical answers and be honest about limitations. Do not claim to have performed actions you have not performed."
          },
          ...cleanMessages
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status === 429 ? 429 : 502).json({
        error: data.error?.message || "The AI service could not complete that request."
      });
    }

    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: "FRIDAY received an empty response. Please try again." });
    res.json({ reply: answer });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FRIDAY is listening on port ${PORT}`);
});
