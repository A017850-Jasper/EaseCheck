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
      console.log("Fetching initial cookies...");
      const response = await fetch("https://www.skh.org.tw/skh/index.html", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        },
        timeout: 10000
      });
      const setCookie = response.headers.raw()["set-cookie"];
      if (setCookie) {
        cachedCookies = setCookie.map(c => c.split(";")[0]);
        console.log("Cookies fetched successfully:", cachedCookies.length);
      } else {
        console.warn("No set-cookie header found in initial response");
      }
      return cachedCookies.join("; ");
    } catch (e) {
      console.error("Failed to fetch initial cookies:", e);
      return "";
    }
  }

  // Proxy for RegistrationDivision
  app.get("/api/RegistrationDivision", async (req, res) => {
    const requestId = randomUUID();
    try {
      const cookies = await getCookies();
      const xDate = new Date().toUTCString();
      console.log(`Proxying RegistrationDivision request [${requestId}] at ${xDate}`);
      
      const response = await fetch("https://www.skh.org.tw/regis_api/RegistrationDivision", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          "X-Date": xDate,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.skh.org.tw/registration/registration.aspx",
          "Origin": "https://www.skh.org.tw",
          "Connection": "keep-alive",
          "Cookie": cookies
        },
        timeout: 15000
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Hospital API error (Divisions) [${requestId}]: ${response.status} - ${errBody.substring(0, 200)}`);
        if (response.status === 400 || response.status === 401) cachedCookies = [];
        return res.status(response.status).json({ 
          error: "Hospital API returned error", 
          status: response.status, 
          details: errBody.substring(0, 500) 
        });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error(`Hospital API returned non-JSON response (Divisions) [${requestId}]: ${text.substring(0, 200)}`);
        res.status(500).json({ 
          error: "Hospital API returned non-JSON response", 
          details: text.substring(0, 500) 
        });
      }
    } catch (error) {
      const isTimeout = error instanceof Error && (error.name === 'FetchError' && (error as any).code === 'ETIMEDOUT' || error.message.includes('timeout'));
      console.error(`Proxy error (Divisions) [${requestId}]:`, error);
      res.status(isTimeout ? 504 : 500).json({ 
        error: isTimeout ? "Hospital Server Connection Timeout" : "Failed to fetch divisions", 
        message: error instanceof Error ? error.message : String(error),
        details: isTimeout ? "醫院伺服器連線逾時，可能是醫院端暫時封鎖了雲端伺服器的 IP，或醫院系統正在維護中。" : undefined,
        requestId
      });
    }
  });

  // Proxy for AppointmentProgress
  app.get("/api/AppointmentProgress", async (req, res) => {
    const { DivisionCode } = req.query;
    const requestId = randomUUID();
    try {
      const cookies = await getCookies();
      const xDate = new Date().toUTCString();
      console.log(`Proxying AppointmentProgress request for ${DivisionCode} [${requestId}] at ${xDate}`);
      
      const response = await fetch(`https://www.skh.org.tw/regis_api/AppointmentProgress?DivisionCode=${DivisionCode}`, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          "X-Date": xDate,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.skh.org.tw/registration/registration.aspx",
          "Origin": "https://www.skh.org.tw",
          "Connection": "keep-alive",
          "Cookie": cookies
        },
        timeout: 15000
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Hospital API error (Progress) [${requestId}]: ${response.status} - ${errBody.substring(0, 200)}`);
        if (response.status === 400 || response.status === 401) cachedCookies = [];
        return res.status(response.status).json({ 
          error: "Hospital API returned error", 
          status: response.status, 
          details: errBody.substring(0, 500) 
        });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error(`Hospital API returned non-JSON response (Progress) [${requestId}]: ${text.substring(0, 200)}`);
        res.status(500).json({ 
          error: "Hospital API returned non-JSON response", 
          details: text.substring(0, 500) 
        });
      }
    } catch (error) {
      const isTimeout = error instanceof Error && (error.name === 'FetchError' && (error as any).code === 'ETIMEDOUT' || error.message.includes('timeout'));
      console.error(`Proxy error (Progress) [${requestId}]:`, error);
      res.status(isTimeout ? 504 : 500).json({ 
        error: isTimeout ? "Hospital Server Connection Timeout" : "Failed to fetch progress", 
        message: error instanceof Error ? error.message : String(error),
        details: isTimeout ? "醫院伺服器連線逾時，可能是醫院端暫時封鎖了雲端伺服器的 IP，或醫院系統正在維護中。" : undefined,
        requestId
      });
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
