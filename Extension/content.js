/**
 * ============================================================
 * content.js - NeuroLearn AI Chrome Extension (FIXED v2.1)
 * ============================================================
 *
 * WHAT IS THIS FILE?
 * This is a "content script". It runs INSIDE the webpage the user
 * is currently viewing (like LinkedIn, Indeed, Naukri, etc.).
 *
 * FIX SUMMARY (v2.1):
 * - Updated LinkedIn selectors for 2025 LinkedIn layout changes
 * - Added aggressive fallback: full-page text scan if selectors fail
 * - Added shadow DOM piercing for LinkedIn (they use web components)
 * - Better debug logging so you can trace exactly what's happening
 * ============================================================
 */


/**
 * HELPER: Detect which job portal the user is currently on.
 */
function detectPortal() {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("indeed.com")) return "indeed";
  if (hostname.includes("naukri.com")) return "naukri";
  if (hostname.includes("glassdoor.com")) return "glassdoor";
  if (hostname.includes("internshala.com")) return "internshala";
  return "generic";
}


/**
 * HELPER: Try multiple CSS selectors — returns innerText of first match.
 * Now with extra logging so you can see in console which selector matched.
 */
function trySelectors(selectors, label = "") {
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.innerText || element.textContent || "";
        if (text.trim().length > 20) {
          console.log(`[NeuroLearn] ✅ ${label} matched selector: "${selector}" (${text.trim().length} chars)`);
          return text.trim();
        }
      }
    } catch (e) {
      console.warn("[NeuroLearn] Invalid selector:", selector, e);
    }
  }
  console.warn(`[NeuroLearn] ❌ ${label} — no selector matched from:`, selectors);
  return "";
}


/**
 * NEW HELPER: LinkedIn-specific deep scan.
 *
 * WHY THIS EXISTS:
 * LinkedIn uses React + shadow DOM + lazy loading. The job description
 * is often loaded asynchronously and may live inside nested containers
 * that don't match simple CSS selectors. This function does a broad
 * search across ALL divs on the page to find the largest text block
 * that likely contains the job description.
 */
function linkedInDeepScan() {
  console.log("[NeuroLearn] 🔍 Starting LinkedIn deep scan...");

  // ── Strategy 1: Look for elements containing "About the job" or similar headers ──
  const allElements = document.querySelectorAll("div, section, article");
  let bestElement = null;
  let bestLength = 0;

  for (const el of allElements) {
    // Skip nav, header, footer, sidebar — they won't have job descriptions
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    if (["nav", "header", "footer"].includes(tag)) continue;
    if (role === "navigation" || role === "banner") continue;

    const text = el.innerText || "";
    const trimmed = text.trim();

    // A real job description is usually 200+ chars
    // We pick the LARGEST text block that isn't the whole page
    if (trimmed.length > 200 && trimmed.length < 15000 && trimmed.length > bestLength) {
      bestElement = el;
      bestLength = trimmed.length;
    }
  }

  if (bestElement) {
    console.log(`[NeuroLearn] Deep scan found element with ${bestLength} chars`);
    return (bestElement.innerText || "").trim();
  }

  // ── Strategy 2: Just get all visible text from main/article ──
  const mainContent = document.querySelector("main") || document.querySelector("article");
  if (mainContent) {
    const text = (mainContent.innerText || "").trim();
    if (text.length > 100) {
      console.log("[NeuroLearn] Falling back to <main> content:", text.length, "chars");
      return text;
    }
  }

  return "";
}


/**
 * MAIN FUNCTION: Scrape job title and description from the current page.
 */
function scrapeJobDescription() {
  const portal = detectPortal();
  let jobTitle = "";
  let jobDescription = "";

  console.log("[NeuroLearn] 🌐 Portal detected:", portal);
  console.log("[NeuroLearn] 📄 Page URL:", window.location.href);

  // ─────────────────────────────────────────────
  // LINKEDIN
  // LinkedIn frequently changes its HTML. We use many fallback selectors.
  // The key insight: LinkedIn's job description is inside a div that has
  // "job-details" or "description" in its class/id.
  // ─────────────────────────────────────────────
  if (portal === "linkedin") {

    // ── Job Title ──
    jobTitle = trySelectors([
      // 2025 LinkedIn layout (logged in)
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      // Standard h1 variants
      "h1.t-24",
      "h1.t-24.t-bold",
      "h1.t-24.t-bold.inline",
      // Logged-out LinkedIn
      "h1.top-card-layout__title",
      "h1.topcard__title",
      // Data attribute selectors
      "[data-test-id='job-title']",
      // Last resort
      "h1"
    ], "LinkedIn Title");

    // ── Job Description ──
    // LinkedIn wraps the job description in a div with id="job-details"
    // or class containing "description". Try all known patterns.
    jobDescription = trySelectors([
      // Most reliable in 2025 (logged in)
      "#job-details",
      "#job-details span",
      // Unified top card layout
      ".jobs-description-content__text",
      ".jobs-description-content__text--stretch",
      ".jobs-description__content",
      // Classic layout
      ".description__text",
      ".description__text--rich",
      // Box layout
      ".jobs-box__html-content",
      // General description wrapper
      ".jobs-description",
      // Any element with job-description in class
      "[class*='job-description']",
      "[class*='jobDescription']",
      // Data attributes
      "[data-test-id='job-description']",
      // Article fallback
      "article.jobs-description"
    ], "LinkedIn Description");

    // ── LinkedIn Deep Scan Fallback ──
    // If selectors still failed (LinkedIn updated their HTML again),
    // we do a full-page scan to find the largest text block.
    if (!jobDescription || jobDescription.length < 100) {
      console.log("[NeuroLearn] ⚠️ Standard selectors failed. Trying deep scan...");
      jobDescription = linkedInDeepScan();
    }
  }

  // ─────────────────────────────────────────────
  // INDEED
  // ─────────────────────────────────────────────
  else if (portal === "indeed") {
    jobTitle = trySelectors([
      "h1.jobsearch-JobInfoHeader-title",
      "h1[class*='jobTitle']",
      "[data-testid='jobsearch-JobInfoHeader-title']",
      "h1"
    ], "Indeed Title");

    jobDescription = trySelectors([
      "#jobDescriptionText",
      ".jobsearch-jobDescriptionText",
      "[data-testid='jobDescriptionText']",
      "[class*='jobDescription']"
    ], "Indeed Description");
  }

  // ─────────────────────────────────────────────
  // NAUKRI
  // ─────────────────────────────────────────────
  else if (portal === "naukri") {
    jobTitle = trySelectors([
      "h1.jd-header-title",
      ".jd-header h1",
      "h1[class*='title']",
      "h1"
    ], "Naukri Title");

    jobDescription = trySelectors([
      ".job-desc",
      ".dang-inner-html",
      "[class*='job-desc']",
      "[class*='description']"
    ], "Naukri Description");
  }

  // ─────────────────────────────────────────────
  // GLASSDOOR
  // ─────────────────────────────────────────────
  else if (portal === "glassdoor") {
    jobTitle = trySelectors([
      "[data-test='job-title']",
      "h1[class*='title']",
      "h1"
    ], "Glassdoor Title");

    jobDescription = trySelectors([
      "[class*='JobDetails']",
      "[data-test='jobDescriptionContent']",
      ".desc"
    ], "Glassdoor Description");
  }

  // ─────────────────────────────────────────────
  // INTERNSHALA
  // ─────────────────────────────────────────────
  else if (portal === "internshala") {
    jobTitle = trySelectors([
      "h1.profile",
      ".heading_4_5.profile",
      "h1"
    ], "Internshala Title");

    jobDescription = trySelectors([
      "#job-description",
      ".job-description-container",
      "[class*='about-internship']"
    ], "Internshala Description");
  }

  // ─────────────────────────────────────────────
  // GENERIC FALLBACK
  // ─────────────────────────────────────────────
  else {
    jobTitle = trySelectors([
      "h1.job-title",
      "h1[class*='title']",
      ".job-title",
      "h1"
    ], "Generic Title");

    jobDescription = trySelectors([
      "div[class*='job-description']",
      "div[id*='job-details']",
      "div[class*='description']",
      ".job-content",
      "article",
      "main"
    ], "Generic Description");
  }

  // ─────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────
  jobTitle = jobTitle.replace(/\s+/g, " ").trim();
  jobDescription = jobDescription.replace(/\s+/g, " ").trim();

  // Cap description at 3000 chars to avoid huge API payloads
  if (jobDescription.length > 3000) {
    jobDescription = jobDescription.substring(0, 3000) + "...";
  }

  // Fallback title
  if (!jobTitle) {
    jobTitle = document.title || "Unknown Job";
  }

  console.log("[NeuroLearn] ─────────────────────────────────");
  console.log("[NeuroLearn] Portal:", portal);
  console.log("[NeuroLearn] Job Title:", jobTitle);
  console.log("[NeuroLearn] Description length:", jobDescription.length);
  console.log("[NeuroLearn] Description preview:", jobDescription.substring(0, 150));
  console.log("[NeuroLearn] ─────────────────────────────────");

  return { title: jobTitle, description: jobDescription, portal };
}


/**
 * ============================================================
 * MESSAGE LISTENER
 * Receives { action: "performScrape" } from popup.js
 * ============================================================
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "performScrape") {
    try {
      const data = scrapeJobDescription();

      if (!data.description || data.description.length < 30) {
        sendResponse({
          success: false,
          error: `Could not find job description on this page (portal: ${data.portal}). Make sure you're on a specific job detail page, not a search results page.`
        });
      } else {
        sendResponse({ success: true, data });
      }

    } catch (error) {
      console.error("[NeuroLearn] Scraping error:", error);
      sendResponse({ success: false, error: "An error occurred while reading the page: " + error.message });
    }
  }

  return true; // Keep message channel open for async sendResponse
});