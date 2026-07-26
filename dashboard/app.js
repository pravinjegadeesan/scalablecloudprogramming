/**
 * Main Application Orchestrator
 * Music Charts Real-Time Analytics
 */

// Global timers
let autoRefreshTimer = null;
let simulationTickTimer = null;



/**
 * Initialization on DOM Load
 */
document.addEventListener("DOMContentLoaded", async () => {


    // 2. Initialize Chart.js objects
    if (window.initCharts) {
        window.initCharts();
    }

    // 3. Connect HTML controls
    setupControls();

    // 4. Try connecting to live FastAPI server
    const isLiveConnected = await API.checkApiHealth();
    const modeToggle = document.getElementById("modeToggle");
    
    if (isLiveConnected) {
        console.log("Found live FastAPI API! Switching to LIVE mode.");
        // Disable demo mode toggle by default if API is running
        modeToggle.checked = false;
        setSimulationMode(false);
        updateModeBadge(false);
    } else {
        console.log("FastAPI API is offline. Starting in DEMO/SIMULATION mode.");
        modeToggle.checked = true;
        setSimulationMode(true);
        updateModeBadge(true);
        startSimulationTick();
    }

    // 5. Initial dashboard population
    refreshDashboard();

    // 6. Setup auto refresh loop
    setupAutoRefresh();
});



/**
 * Configure UI Handlers
 */
function setupControls() {
    // Mode Switch (Demo Mode vs Live AWS Mode)
    const modeToggle = document.getElementById("modeToggle");
    modeToggle.addEventListener("change", (e) => {
        const simMode = e.target.checked;
        setSimulationMode(simMode);
        updateModeBadge(simMode);
        
        if (simMode) {
            startSimulationTick();
        } else {
            stopSimulationTick();
            // Verify if API is online
            API.checkApiHealth().then(online => {
                const apiCard = document.getElementById("status-api");
                if (!online) {
                    alert("Warning: FastAPI API server at " + window.API_URL + " appears offline. Live charts will show connection errors.");
                    setInfraStatusOffline("fastapi");
                } else {
                    setInfraStatusHealthy("fastapi");
                }
            });
        }
        
        refreshDashboard();
    });

    // Auto Refresh checkbox
    const autoToggle = document.getElementById("autoRefreshToggle");
    autoToggle.addEventListener("change", () => {
        setupAutoRefresh();
    });

    // Manual Refresh button
    const manualBtn = document.getElementById("manualRefreshBtn");
    manualBtn.addEventListener("click", () => {
        // Simple rotation animation
        const svg = manualBtn.querySelector("svg");
        svg.style.transform = "rotate(360deg)";
        svg.style.transition = "transform 0.5s ease";
        setTimeout(() => svg.style.transform = "none", 500);

        refreshDashboard();
    });


}

/**
 * Auto Refresh Scheduler
 */
function setupAutoRefresh() {
    const isAuto = document.getElementById("autoRefreshToggle").checked;
    
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }

    if (isAuto) {
        autoRefreshTimer = setInterval(() => {
            refreshDashboard();
        }, 5000);
    }
}

/**
 * Demo Mode continuous random event tickers (simulates stream activity)
 */
function startSimulationTick() {
    if (simulationTickTimer) return;
    
    simulationTickTimer = setInterval(() => {
        if (!window.isSimulationMode) {
            stopSimulationTick();
            return;
        }

        // Tick mock states
        const stats = API.tickMock();

        // Update real-time metric counters
        animateNumber("kpi-events", stats.eventsProcessed);
        document.getElementById("streamLatencyVal").textContent = stats.latency + " ms";

        // Update real-time table dynamically
        API.getLatestEvents().then(events => {
            renderEventsTable(events);
        });

        // Update rolling throughput/latency charts
        const history = API.getMetricsHistory();
        if (window.updatePerformanceCharts) {
            window.updatePerformanceCharts(history);
        }

        // Update auto scaling gauge
        if (window.updateGaugeChart) {
            window.updateGaugeChart(stats.activeWorkers, stats.maxWorkers);
        }

        // Update individual mock statuses checking timestamps
        updateCheckedTimestamps();

    }, 2000); // refresh mock values every 2s for visual fluidity
}

function stopSimulationTick() {
    if (simulationTickTimer) {
        clearInterval(simulationTickTimer);
        simulationTickTimer = null;
    }
}

/**
 * Refresh Dashboard Data
 */
async function refreshDashboard() {
    toggleLoader(true);

    try {
        // Parallel requests to avoid load delays
        const promises = [
            loadLatestEvents(),
            loadTrending(),
            loadTopArtists(),
            loadTopTracks(),
            loadTopAlbums(),
            updateKPIs()
        ];

        await Promise.all(promises);
        
        // Update infrastructural panel last-checked times
        updateCheckedTimestamps();
        setInfraStatusHealthy("fastapi");

    } catch (err) {
        console.error("Dashboard refresh error:", err);
        if (!window.isSimulationMode) {
            // FastAPI is unreachable or DynamoDB error
            setInfraStatusOffline("fastapi");
        }
    } finally {
        toggleLoader(false);
    }
}

/**
 * 1. Load Latest Real-time Events
 */
async function loadLatestEvents() {
    try {
        const events = await API.getLatestEvents();
        renderEventsTable(events);
    } catch (e) {
        renderEventsTableEmpty();
        throw e;
    }
}

/**
 * 2. Load Trending Now
 */
async function loadTrending() {
    try {
        const trending = await API.getTrendingNow();
        if (window.updateTrendingChart) {
            window.updateTrendingChart(trending);
        }
        
        // Update trending KPI card count
        const trendCount = trending.length;
        animateNumber("kpi-trending", trendCount);
    } catch (e) {
        console.warn("Could not load trending now:", e);
    }
}

/**
 * 3. Load Batch Top Artists
 */
async function loadTopArtists() {
    try {
        const artists = await API.getTopArtists();
        if (window.updateTopArtistsChart) {
            window.updateTopArtistsChart(artists);
        }
    } catch (e) {
        console.warn("Could not load top artists:", e);
    }
}

/**
 * 4. Load Batch Top Tracks
 */
async function loadTopTracks() {
    try {
        const tracks = await API.getTopTracks();
        if (window.updateTopTracksChart) {
            window.updateTopTracksChart(tracks);
        }
    } catch (e) {
        console.warn("Could not load top tracks:", e);
    }
}

/**
 * 5. Load Batch Top Albums
 */
async function loadTopAlbums() {
    try {
        const albums = await API.getTopAlbums();
        if (window.updateTopAlbumsChart) {
            window.updateTopAlbumsChart(albums);
        }
    } catch (e) {
        console.warn("Could not load top albums:", e);
    }
}

/**
 * 6. Update KPIs & Scaling Status
 */
async function updateKPIs() {
    const status = API.getMockStatus();

    if (window.isSimulationMode) {
        animateNumber("kpi-events", status.eventsProcessed);
        document.getElementById("streamLatencyVal").textContent = status.latency + " ms";
        
        // Scale gauge
        if (window.updateGaugeChart) {
            window.updateGaugeChart(status.activeWorkers, status.maxWorkers);
        }

        // Telemetry chart histories on load
        const history = API.getMetricsHistory();
        if (window.updatePerformanceCharts) {
            window.updatePerformanceCharts(history);
        }
    } else {
        // In live AWS mode, we pull total events by scanning our database limit or count
        try {
            const events = await API.getLatestEvents();
            // Simple mock count scaling since DynamoDB scan limit is 20
            animateNumber("kpi-events", 1530240 + events.length);
            
            // Render default gauge values for live
            if (window.updateGaugeChart) {
                window.updateGaugeChart(4, 10);
            }
        } catch (e) {
            console.warn("KPI fetching offline:", e);
        }
    }
}

/**
 * Render dynamic rows to Events Table
 */
function renderEventsTable(events) {
    const tbody = document.getElementById("eventsTableBody");
    
    if (!events || events.length === 0) {
        renderEventsTableEmpty();
        return;
    }

    let rowsHtml = "";
    events.forEach(ev => {
        // Format ISO timestamp
        let formattedTime = "--:--:--";
        if (ev.timestamp) {
            try {
                const dateObj = new Date(ev.timestamp);
                formattedTime = dateObj.toLocaleTimeString();
            } catch (err) {}
        }

        // Map Event Type class
        let typeClass = "badge-play";
        const typeStr = ev.event_type || "Stream Play";
        if (typeStr.includes("Skip")) typeClass = "badge-skip";
        else if (typeStr.includes("Like")) typeClass = "badge-like";
        else if (typeStr.includes("Playlist")) typeClass = "badge-playlist";
        else if (typeStr.includes("Purchase")) typeClass = "badge-purchase";

        rowsHtml += `
            <tr class="animate-row">
                <td class="font-monospace text-info">${formattedTime}</td>
                <td class="fw-bold">${escapeHtml(ev.artist)}</td>
                <td class="text-white-50">${escapeHtml(ev.track)}</td>
                <td class="text-secondary" style="font-size: 0.75rem;">${escapeHtml(ev.album || "-")}</td>
                <td class="small text-secondary">${escapeHtml(ev.country || "Global")}</td>
                <td><span class="badge-custom ${typeClass}">${typeStr}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

function renderEventsTableEmpty() {
    const tbody = document.getElementById("eventsTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5 text-secondary">
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <h5 class="text-white">No Stream Events Found</h5>
                    <p class="small m-0">The streaming database is empty. Verify that the Kinesis producer is active.</p>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Visual Helpers
 */
function toggleLoader(show) {
    const loader = document.getElementById("eventsLoader");
    if (loader) {
        if (show) loader.classList.add("active");
        else loader.classList.remove("active");
    }
}

function updateModeBadge(sim) {
    const badge = document.getElementById("modeBadge");
    const headerTitle = document.getElementById("mainHeaderTitle");
    const regionText = document.querySelector(".bg-dark strong");
    
    if (sim) {
        badge.textContent = "Simulating";
        badge.className = "mode-badge simulated";
        headerTitle.innerHTML = "Music Charts Real-Time Analytics <span class='fs-6 text-success fw-normal border border-success-glow px-2 py-0.5 rounded'>Demo Mode</span>";
        
        // Show healthy colors for mock AWS infra
        setInfraStatusHealthy("s3");
        setInfraStatusHealthy("kinesis");
        setInfraStatusHealthy("lambda");
        setInfraStatusHealthy("dynamodb");
        setInfraStatusHealthy("emr");
        setInfraStatusHealthy("fastapi");
    } else {
        badge.textContent = "Live AWS Stack";
        badge.className = "mode-badge live";
        headerTitle.innerHTML = "Music Charts Real-Time Analytics <span class='fs-6 text-warning fw-normal border border-warning-glow px-2 py-0.5 rounded'>Live AWS Stack</span>";
        
        // Set offline until checked
        setInfraStatusDegraded("s3");
        setInfraStatusDegraded("kinesis");
        setInfraStatusDegraded("lambda");
        setInfraStatusDegraded("dynamodb");
        setInfraStatusDegraded("emr");
    }
}

function updateCheckedTimestamps() {
    const timeStr = new Date().toLocaleTimeString();
    const list = ["s3", "kinesis", "lambda", "dynamodb", "emr", "api"];
    list.forEach(id => {
        const el = document.getElementById(`${id}-update`);
        if (el) el.textContent = `Last Checked: ${timeStr}`;
    });
}

/**
 * AWS Infrastructure status badge helpers
 */
function setInfraStatusHealthy(id) {
    const badge = document.getElementById(`status-${id}`);
    if (badge) {
        badge.className = "status-pill healthy";
        badge.innerHTML = `<span class="status-dot"></span>Healthy`;
    }
    
    // Update matching KPI statuses
    if (id === "kinesis") {
        const kpi = document.getElementById("kpi-kinesis");
        if (kpi) { kpi.textContent = "ACTIVE"; kpi.className = "kpi-val text-success"; }
    } else if (id === "lambda") {
        const kpi = document.getElementById("kpi-lambda");
        if (kpi) { kpi.textContent = "HEALTHY"; kpi.className = "kpi-val text-success"; }
    } else if (id === "fastapi") {
        const kpi = document.getElementById("kpi-api");
        if (kpi) { kpi.textContent = "CONNECTED"; kpi.className = "kpi-val text-success"; }
    }
}

function setInfraStatusDegraded(id) {
    const badge = document.getElementById(`status-${id}`);
    if (badge) {
        badge.className = "status-pill degraded";
        badge.innerHTML = `<span class="status-dot"></span>Checking...`;
    }
}

function setInfraStatusOffline(id) {
    const badge = document.getElementById(`status-${id}`);
    if (badge) {
        badge.className = "status-pill offline";
        badge.innerHTML = `<span class="status-dot"></span>Offline`;
    }

    if (id === "fastapi") {
        const kpi = document.getElementById("kpi-api");
        if (kpi) { kpi.textContent = "DISCONNECTED"; kpi.className = "kpi-val text-danger"; }
    }
}

/**
 * Animated Number Counters
 */
function animateNumber(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startVal = parseInt(el.textContent.replace(/,/g, "")) || 0;
    if (startVal === targetValue) return;

    const duration = 800; // ms
    const startTime = performance.now();

    function updateCount(currentTime) {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime >= duration) {
            el.textContent = formatWithCommas(targetValue);
            return;
        }

        const progress = elapsedTime / duration;
        // Ease out quad
        const easeProgress = progress * (2 - progress);
        const currentValue = Math.floor(startVal + (targetValue - startVal) * easeProgress);

        el.textContent = formatWithCommas(currentValue);
        requestAnimationFrame(updateCount);
    }

    requestAnimationFrame(updateCount);
}

function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// XSS Sanitizer helper
function escapeHtml(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
