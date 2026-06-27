/**
 * popup.js - NeuroLearn AI Chrome Extension (SIMPLIFIED)
 * Categorizes job skills into 3 difficulty levels
 */

const NEUROLEARN_URL = "https://neurolearnai-six.vercel.app/";

function setStatus(message, type = "default") {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = message;
        statusEl.className = type;
    }
}

function showPortalBadge(portal) {
    const badge = document.getElementById("portalBadge");
    const icons = {
        linkedin: "🔗 LinkedIn",
        indeed: "🔍 Indeed",
        naukri: "💼 Naukri",
        glassdoor: "🚪 Glassdoor",
        internshala: "🎓 Internshala",
        generic: "🌐 Job Portal"
    };
    badge.innerText = icons[portal] || "🌐 Job Portal";
    badge.style.display = "block";
}

function showError(message) {
    setStatus(message, "error");
    const container = document.getElementById("skillsContainer");
    if (container) {
        container.innerHTML = "";
    }
}

/**
 * Create a skill button that redirects to NeuroLearn with search query
 */
function createSkillButton(skillName, tab) {
    const button = document.createElement("button");
    button.innerText = skillName;
    button.className = "skill-button";
    
    button.addEventListener("click", () => {
        const encodedSkill = encodeURIComponent(skillName);
        const redirectUrl = `${NEUROLEARN_URL}/search?query=${encodedSkill}&language=Any&difficulty=Beginner&outputType=playlist`;
        chrome.tabs.update(tab.id, { url: redirectUrl });
    });

    return button;
}

/**
 * Render skills organized by difficulty (Beginner, Intermediate, Advanced)
 */
function renderSkillsByDifficulty(skillsData, tab) {
    const container = document.getElementById("skillsContainer");
    if (!container) {
        console.error("[NeuroLearn] skillsContainer not found in DOM");
        return;
    }
    container.innerHTML = "";

    // BEGINNER SECTION
    if (skillsData.beginner && skillsData.beginner.length > 0) {
        const section = document.createElement("div");
        section.className = "difficulty-section";

        const header = document.createElement("div");
        header.className = "difficulty-header";
        header.innerHTML = `<span class="difficulty-badge beginner">🌱 Beginner</span> Start Here`;
        section.appendChild(header);

        const list = document.createElement("div");
        list.className = "skills-list";
        skillsData.beginner.forEach(skill => {
            list.appendChild(createSkillButton(skill, tab));
        });
        section.appendChild(list);
        container.appendChild(section);
    }

    // INTERMEDIATE SECTION
    if (skillsData.intermediate && skillsData.intermediate.length > 0) {
        const section = document.createElement("div");
        section.className = "difficulty-section";

        const header = document.createElement("div");
        header.className = "difficulty-header";
        header.innerHTML = `<span class="difficulty-badge intermediate">📈 Intermediate</span> Next`;
        section.appendChild(header);

        const list = document.createElement("div");
        list.className = "skills-list";
        skillsData.intermediate.forEach(skill => {
            list.appendChild(createSkillButton(skill, tab));
        });
        section.appendChild(list);
        container.appendChild(section);
    }

    // ADVANCED SECTION
    if (skillsData.advanced && skillsData.advanced.length > 0) {
        const section = document.createElement("div");
        section.className = "difficulty-section";

        const header = document.createElement("div");
        header.className = "difficulty-header";
        header.innerHTML = `<span class="difficulty-badge advanced">🚀 Advanced</span> Mastery`;
        section.appendChild(header);

        const list = document.createElement("div");
        list.className = "skills-list";
        skillsData.advanced.forEach(skill => {
            list.appendChild(createSkillButton(skill, tab));
        });
        section.appendChild(list);
        container.appendChild(section);
    }
}

/**
 * Main: When popup opens
 */
document.addEventListener("DOMContentLoaded", async () => {
    const skillsContainer = document.getElementById("skillsContainer");

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("[NeuroLearn] Active tab:", tab?.url);

    if (!tab) {
        showError("No active tab found.");
        return;
    }

    // Guard against non-web pages
    const url = tab.url || "";
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
        showError("Please open a job listing page.");
        skillsContainer.innerHTML = "";
        return;
    }

    // Inject content.js
    setStatus("Reading the job page...");
    console.log("[NeuroLearn] Injecting content.js...");

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });
    } catch (injectionError) {
        showError("Cannot read this page. Please open a job detail page.");
        return;
    }

    // Send message to content.js to scrape the page
    console.log("[NeuroLearn] Sending scrape message...");
    chrome.tabs.sendMessage(tab.id, { action: "performScrape" }, async (response) => {
        if (chrome.runtime.lastError) {
            showError("Could not communicate with the page. Try refreshing.");
            return;
        }

        if (!response || !response.success) {
            showError(response?.error || "Could not find job description.");
            return;
        }

        const { title, description, portal } = response.data;
        console.log("[NeuroLearn] Scrape successful! Portal:", portal);

        showPortalBadge(portal);

        // Call API to categorize skills by difficulty
        setStatus("🤖 Categorizing skills...");
        skillsContainer.innerHTML = '<div class="loading-animation"></div>';

        try {
            const apiResponse = await fetch(`${NEUROLEARN_URL}/api/curate-keywords`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobTitle: title, jobDescription: description })
            });

            const skillsData = await apiResponse.json();
            console.log("[NeuroLearn] API Response:", skillsData);

            if (!apiResponse.ok) {
                showError(`Error: ${skillsData.error}`);
                return;
            }

            // Show skills organized by difficulty
            skillsContainer.innerHTML = "";
            setStatus(`✅ "${skillsData.jobTitle}" — Click a skill to learn!`, "success");
            renderSkillsByDifficulty(skillsData, tab);

            console.log("[NeuroLearn] ═════════════════════════════════");
            console.log("[NeuroLearn] 🎯 SKILLS BY DIFFICULTY:");
            console.log("[NeuroLearn] Beginner:", skillsData.beginner?.length || 0);
            console.log("[NeuroLearn] Intermediate:", skillsData.intermediate?.length || 0);
            console.log("[NeuroLearn] Advanced:", skillsData.advanced?.length || 0);
            console.log("[NeuroLearn] ═════════════════════════════════");

        } catch (networkError) {
            console.error("[NeuroLearn] API call failed:", networkError);
            showError(`Cannot connect to NeuroLearn at ${NEUROLEARN_URL}`);
        }
    });
});
