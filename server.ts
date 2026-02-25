import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  let cachedCookies: string[] = [];

  async function getCookies() {
    if (cachedCookies.length > 0) return cachedCookies.join("; ");
    try {
      const response = await fetch("https://www.skh.org.tw/skh/index.html", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      const setCookie = response.headers.raw()["set-cookie"];
      if (setCookie) {
        cachedCookies = setCookie.map(c => c.split(";")[0]);
      }
      return cachedCookies.join("; ");
    } catch (e) {
      console.error("Failed to fetch initial cookies", e);
      return "";
    }
  }

  // Proxy for RegistrationDivision
  app.get("/api/RegistrationDivision", async (req, res) => {
    try {
      const cookies = await getCookies();
      const requestId = randomUUID();
      const xDate = new Date().toISOString();
      const response = await fetch("https://www.skh.org.tw/regis_api/RegistrationDivision", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          "X-Date": xDate,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.skh.org.tw/registration/registration.aspx",
          "Origin": "https://www.skh.org.tw",
          "Connection": "keep-alive",
          "Cookie": cookies
        }
      });
      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Hospital API error (Divisions): ${response.status} - ${errBody}`);
        if (response.status === 400 || response.status === 401) cachedCookies = [];
        return res.status(response.status).json({ error: "Hospital API returned error", details: errBody });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch divisions" });
    }
  });

  // Proxy for AppointmentProgress
  app.get("/api/AppointmentProgress", async (req, res) => {
    const { DivisionCode } = req.query;
    try {
      const cookies = await getCookies();
      const requestId = randomUUID();
      const xDate = new Date().toISOString();
      const response = await fetch(`https://www.skh.org.tw/regis_api/AppointmentProgress?DivisionCode=${DivisionCode}`, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          "X-Date": xDate,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.skh.org.tw/registration/registration.aspx",
          "Origin": "https://www.skh.org.tw",
          "Connection": "keep-alive",
          "Cookie": cookies
        }
      });
      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Hospital API error (Progress): ${response.status} - ${errBody}`);
        if (response.status === 400 || response.status === 401) cachedCookies = [];
        return res.status(response.status).json({ error: "Hospital API returned error", details: errBody });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
