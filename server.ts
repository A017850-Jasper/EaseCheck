import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { HttpsProxyAgent } from "https-proxy-agent";

async function startServer() {
  const app = express();
  const PORT = 3000;

  let cachedCookies: string[] = [];
  const PROXY_URL = process.env.PROXY_URL;
  const agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

  if (PROXY_URL) {
    console.log("Using proxy for hospital requests:", PROXY_URL.split("@").pop());
  }

  // Debug endpoint to check proxy status and test connectivity
  app.get("/api/proxy-status", async (req, res) => {
    const testResults: any = {
      proxyEnabled: !!PROXY_URL,
      proxyHost: PROXY_URL ? PROXY_URL.split("@").pop() : null,
      envKeys: Object.keys(process.env).filter(k => k.includes("PROXY")),
      connectivityTest: {}
    };

    if (PROXY_URL) {
      try {
        // Test 1: Google (to check if proxy works at all)
        const googleStart = Date.now();
        const googleRes = await fetch("https://www.google.com", { agent, timeout: 5000 });
        testResults.connectivityTest.google = {
          ok: googleRes.ok,
          status: googleRes.status,
          time: `${Date.now() - googleStart}ms`
        };

        // Test 2: Hospital (to check if hospital blocks this proxy)
        const hospitalStart = Date.now();
        const hospitalRes = await fetch("https://www.skh.org.tw/skh/index.html", { 
          agent, 
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" }
        });
        testResults.connectivityTest.hospital = {
          ok: hospitalRes.ok,
          status: hospitalRes.status,
          time: `${Date.now() - hospitalStart}ms`
        };
      } catch (e: any) {
        testResults.connectivityTest.error = e.message;
        testResults.connectivityTest.type = e.type;
      }
    }

    res.json(testResults);
  });

  async function getCookies(retries = 3) {
    if (cachedCookies.length > 0) return cachedCookies.join("; ");
    
    for (let i = 0; i < retries; i++) {
      try {
        const viaProxy = agent ? " via proxy" : "";
        console.log(`Fetching initial cookies (Attempt ${i + 1}/${retries})${viaProxy}...`);
        const response = await fetch("https://www.skh.org.tw/skh/index.html", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          },
          timeout: 20000,
          agent
        });
        
        console.log(`Cookie fetch response status: ${response.status} ${response.statusText}`);
        const setCookie = response.headers.raw()["set-cookie"];
        if (setCookie) {
          cachedCookies = setCookie.map(c => c.split(";")[0]);
          console.log("Cookies fetched successfully:", cachedCookies.length);
          return cachedCookies.join("; ");
        } else {
          console.warn("No set-cookie header found in initial response. Headers:", JSON.stringify(response.headers.raw()));
          return "";
        }
      } catch (e) {
        const err = e as any;
        console.error(`Failed to fetch initial cookies (Attempt ${i + 1}):`, {
          message: err.message,
          type: err.type,
          code: err.code
        });
        if (i === retries - 1) return "";
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return "";
  }

  // Proxy for RegistrationDivision
  app.get("/api/RegistrationDivision", async (req, res) => {
    const requestId = randomUUID();
    try {
      const cookies = await getCookies();
      const xDate = new Date().toUTCString();
      const viaProxy = agent ? " via proxy" : "";
      console.log(`Proxying RegistrationDivision request [${requestId}] at ${xDate}${viaProxy}`);
      
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
        timeout: 15000,
        agent
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
      const err = error as any;
      const isTimeout = err.type === 'request-timeout' || err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
      console.error(`Proxy error (Divisions) [${requestId}]:`, error);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(isTimeout ? 504 : 500).json({ 
        error: isTimeout ? "Hospital Server Connection Timeout" : "Failed to fetch divisions", 
        message: err.message || String(error),
        details: isTimeout ? "醫院伺服器連線逾時（Timeout）。這通常是因為醫院端封鎖了雲端伺服器的連線，或是醫院系統目前負載過高。" : "伺服器內部錯誤",
        type: err.type,
        code: err.code,
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
      const viaProxy = agent ? " via proxy" : "";
      console.log(`Proxying AppointmentProgress request for ${DivisionCode} [${requestId}] at ${xDate}${viaProxy}`);
      
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
        timeout: 15000,
        agent
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Hospital API error (Progress) [${requestId}]: ${response.status} - ${errBody.substring(0, 200)}`);
        if (response.status === 400 || response.status === 401) cachedCookies = [];
        
        res.setHeader('Content-Type', 'application/json');
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
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Hospital API returned non-JSON response", 
          details: text.substring(0, 500) 
        });
      }
    } catch (error) {
      const err = error as any;
      const isTimeout = err.type === 'request-timeout' || err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
      console.error(`Proxy error (Progress) [${requestId}]:`, error);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(isTimeout ? 504 : 500).json({ 
        error: isTimeout ? "Hospital Server Connection Timeout" : "Failed to fetch progress", 
        message: err.message || String(error),
        details: isTimeout ? "醫院伺服器連線逾時（Timeout）。這通常是因為醫院端封鎖了雲端伺服器的連線，或是醫院系統目前負載過高。" : "伺服器內部錯誤",
        type: err.type,
        code: err.code,
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
