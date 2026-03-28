import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
}
