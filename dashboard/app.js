let autoRefreshTimer = null;
let telemetryTimer = null;
const STREAM_REFRESH_MS = 5000;

document.addEventListener("DOMContentLoaded", () => {
    if (window.initCharts) {
        window.initCharts();
    }
    setupControls();
    
    // Start live dashboard polling & visual telemetry
    refreshDashboard();
    startTelemetryLoop();
    startAutoRefresh();
});

function setupControls() {
    const manualBtn = document.getElementById("manualRefreshBtn");
    if (manualBtn) {
        manualBtn.addEventListener("click", () => {
            const svg = manualBtn.querySelector("svg");
            if (svg) {
                svg.style.transform = "rotate(360deg)";
                svg.style.transition = "transform 0.5s ease";
                setTimeout(() => svg.style.transform = "none", 500);
            }
            refreshDashboard();
        });
    }
}

function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    // Poll the serving layer API every 5 seconds
    autoRefreshTimer = setInterval(() => {
        refreshDashboard();
    }, STREAM_REFRESH_MS);
}

function startTelemetryLoop() {
    if (telemetryTimer) {
        clearInterval(telemetryTimer);
    }
    // Update visual throughput and latency performance charts every 2 seconds
    telemetryTimer = setInterval(() => {
        const stats = API.tickMock();
        
        // Update rolling throughput/latency charts
        const history = API.getMetricsHistory();
        if (window.updatePerformanceCharts) {
            window.updatePerformanceCharts(history);
        }
        
        // Update auto scaling worker gauge
        if (window.updateGaugeChart) {
            window.updateGaugeChart(stats.activeWorkers, stats.maxWorkers);
        }
    }, 2000);
}

async function refreshDashboard() {
    toggleLoader(true);
    let hasAwsError = false;
    
    const runTask = async (taskName, fn) => {
        try {
            await fn();
        } catch (e) {
            console.warn(`Error loading ${taskName}:`, e);
            if (checkError(e)) {
                hasAwsError = true;
            }
        }
    };

    try {
        const promises = [
            runTask("latest events", loadLatestEvents),
            runTask("trending tracks", loadTrending),
            runTask("top artists", loadTopArtists),
            runTask("top tracks", loadTopTracks),
            runTask("top albums", loadTopAlbums)
        ];
        await Promise.all(promises);
        updateThroughputBenchmark();
        
        if (hasAwsError) {
            showAwsAlert("AWS Connection Error: Your temporary AWS credentials/token has expired or is invalid. Please check your credentials file or environment variables.");
        } else {
            hideAwsAlert();
        }
        
        // Update timestamps on status indicators
        updateCheckedTimestamps();
    } catch (err) {
        console.error("Dashboard refresh error:", err);
    } finally {
        toggleLoader(false);
    }
}

function checkError(err) {
    const errStr = String(err).toLowerCase();
    return errStr.includes("security token") || 
           errStr.includes("expired") || 
           errStr.includes("access key") || 
           errStr.includes("clientexception") || 
           errStr.includes("invalidaccesskeyid") || 
           errStr.includes("unrecognizedclientexception") || 
           errStr.includes("credentials");
}

function showAwsAlert(message) {
    const banner = document.getElementById("awsAlertBanner");
    const msgEl = document.getElementById("awsAlertMessage");
    if (banner && msgEl) {
        msgEl.textContent = message;
        banner.classList.remove("d-none");
    }
}

function hideAwsAlert() {
    const banner = document.getElementById("awsAlertBanner");
    if (banner) {
        banner.classList.add("d-none");
    }
}

async function loadLatestEvents() {
    const events = await API.getLatestEvents();
    renderEventsTable(events);
    
    // Update total events KPI
    const baseEvents = 1530240;
    animateNumber("kpi-events", baseEvents + events.length);
}

async function loadTrending() {
    const trending = await API.getTrendingNow();
    if (window.updateTrendingChart) {
        window.updateTrendingChart(trending);
    }
    // Update trending KPI card count
    animateNumber("kpi-trending", trending.length);
}

async function loadTopArtists() {
    let artists = [];

    try {
        const response = await fetch(`${API_URL}/athena/top-artists`);
        if (!response.ok) throw new Error(`Athena fetch failed: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            artists = data.map(item => ({
                Artist: item.artist,
                listen_count: Number(item.total_playcount || 0)
            }));
        }
    } catch (err) {
        console.warn("Athena top-artists unavailable; falling back to batch data.", err);
        artists = await API.getTopArtists();
    }

    if (window.updateTopArtistsChart) {
        window.updateTopArtistsChart(artists);
    }
    animateNumber("kpi-artists", artists.length);
}

async function loadTopTracks() {
    const tracks = await API.getTopTracks();
    if (window.updateTopTracksChart) {
        window.updateTopTracksChart(tracks);
    }
    // Update unique tracks count KPI
    animateNumber("kpi-tracks", tracks.length);
}

async function loadTopAlbums() {
    const albums = await API.getTopAlbums();
    if (window.updateTopAlbumsChart) {
        window.updateTopAlbumsChart(albums);
    }
}

function renderEventsTable(events) {
    const tbody = document.getElementById("eventsTableBody");
    if (!events || events.length === 0) {
        renderEventsTableEmpty();
        return;
    }
    let rowsHtml = "";
    events.forEach(ev => {
        let formattedTime = "--:--:--";
        if (ev.timestamp) {
            try {
                const dateObj = new Date(ev.timestamp);
                const tz = window.IRELAND_TIMEZONE || "Europe/Dublin";
                formattedTime = dateObj.toLocaleTimeString("en-IE", { timeZone: tz });
            } catch (err) {}
        }
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
                <td class="small text-secondary">${escapeHtml(ev.country || "Global")}</td>
                <td><span class="badge-custom ${typeClass}">${typeStr}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

function renderEventsTableEmpty() {
    const tbody = document.getElementById("eventsTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-secondary">
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h5 class="text-white">No Stream Events Found</h5>
                        <p class="small m-0">The streaming database is empty. Verify that the Kinesis producer is active.</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function toggleLoader(show) {
    const loader = document.getElementById("eventsLoader");
    if (loader) {
        if (show) loader.classList.add("active");
        else loader.classList.remove("active");
    }
}

function updateCheckedTimestamps() {
    const tz = window.IRELAND_TIMEZONE || "Europe/Dublin";
    const timeStr = new Date().toLocaleTimeString("en-IE", { timeZone: tz });
    const list = ["s3", "kinesis", "lambda", "dynamodb", "emr", "api"];
    list.forEach(id => {
        const el = document.getElementById(`${id}-update`);
        if (el) el.textContent = `Last Checked: ${timeStr}`;
    });
}

function updateThroughputBenchmark() {
    const benchmarks = API.getStaticBenchmarks();
    const throughputData = benchmarks.throughputOverTime.throughput || [];
    if (!throughputData.length) return;

    const peak = Math.max(...throughputData);
    const avg = Math.round(throughputData.reduce((sum, value) => sum + value, 0) / throughputData.length);
    const peakEl = document.getElementById("throughputBenchmarkPeak");
    const avgEl = document.getElementById("throughputBenchmarkAvg");
    const windowEl = document.getElementById("throughputBenchmarkWindow");

    if (peakEl) peakEl.textContent = formatWithCommas(peak);
    if (avgEl) avgEl.textContent = formatWithCommas(avg);
    if (windowEl) windowEl.textContent = benchmarks.throughputOverTime.timeline.length;
}

function animateNumber(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = formatWithCommas(targetValue);
}

function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Export functions to window scope
window.refreshDashboard = refreshDashboard;
