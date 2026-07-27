/**
 * Chart.js Visualizations Controller
 * Music Charts Real-Time Analytics
 */

// Global Chart configurations
Chart.defaults.color = "#94a3b8"; // slate-400
Chart.defaults.borderColor = "rgba(148, 163, 184, 0.1)"; // slate-400 with opacity
Chart.defaults.font.family = "'Inter', 'Outfit', 'Roboto', 'Segoe UI', sans-serif";
Chart.defaults.animation = false;

// Chart Instances
let trendingChart = null;
let topArtistsChart = null;
let topTracksChart = null;
let topAlbumsChart = null;
let throughputChart = null;
let latencyChart = null;
let sequentialVsParallelChart = null;
let latencyVsIngestionChart = null;
let speedupChart = null;
let throughputVsTimeChart = null;
let workerGaugeChart = null;

const THEME_COLORS = {
    primary: "#3b82f6",     // blue
    success: "#22c55e",     // green
    warning: "#f59e0b",     // yellow
    danger: "#ef4444",      // red
    purple: "#a855f7",      // purple
    cyan: "#06b6d4",        // cyan
    cardBg: "#1e293b",      // slate-800
    grid: "rgba(255, 255, 255, 0.05)"
};

/**
 * Initializes all charts on the dashboard
 */
function initCharts() {
    initSpeedLayerChart();
    initBatchLayerCharts();
    initPerformanceCharts();
    initBenchmarkCharts();
    initGaugeChart();
}

/**
 * Speed Layer: Horizontal Bar Chart of Top 5 Trending Songs
 */
function initSpeedLayerChart() {
    const ctx = document.getElementById("trendingChart").getContext("2d");
    trendingChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["-", "-", "-", "-", "-"],
            datasets: [{
                label: "Play Count (Last 5m)",
                data: [0, 0, 0, 0, 0],
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: THEME_COLORS.primary,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: "#f1f5f9" }
                }
            }
        }
    });
}

/**
 * Batch Layer Charts: Top Artists, Top Tracks, Top Albums
 */
function initBatchLayerCharts() {
    // Top Artists
    const ctxArtists = document.getElementById("topArtistsChart").getContext("2d");
    topArtistsChart = new Chart(ctxArtists, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Aggregated Listens",
                data: [],
                backgroundColor: "rgba(168, 85, 247, 0.75)", // purple
                borderColor: THEME_COLORS.purple,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45, color: "#94a3b8" }
                },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                }
            }
        }
    });

    // Top Tracks
    const ctxTracks = document.getElementById("topTracksChart").getContext("2d");
    topTracksChart = new Chart(ctxTracks, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Aggregated Listens",
                data: [],
                backgroundColor: "rgba(6, 182, 212, 0.75)", // cyan
                borderColor: THEME_COLORS.cyan,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45, color: "#94a3b8" }
                },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                }
            }
        }
    });

    // Top Albums (Doughnut)
    const ctxAlbums = document.getElementById("topAlbumsChart").getContext("2d");
    topAlbumsChart = new Chart(ctxAlbums, {
        type: "doughnut",
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    "rgba(59, 130, 246, 0.8)",   // blue
                    "rgba(168, 85, 247, 0.8)",  // purple
                    "rgba(34, 197, 94, 0.8)",   // green
                    "rgba(245, 158, 11, 0.8)",  // yellow
                    "rgba(239, 68, 68, 0.8)",   // red
                    "rgba(6, 182, 212, 0.8)",   // cyan
                    "rgba(236, 72, 153, 0.8)",  // pink
                    "rgba(20, 184, 166, 0.8)",  // teal
                    "rgba(249, 115, 22, 0.8)",  // orange
                    "rgba(100, 116, 139, 0.8)"  // slate
                ],
                borderColor: THEME_COLORS.cardBg,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { boxWidth: 12, padding: 8, color: "#94a3b8" }
                },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            cutout: "60%"
        }
    });
}

/**
 * Performance Dashboard Charts: Throughput & Latency over time
 */
function initPerformanceCharts() {
    // Throughput (Area Chart)
    const ctxThroughput = document.getElementById("throughputChart").getContext("2d");
    throughputChart = new Chart(ctxThroughput, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Ingestion Throughput (events/sec)",
                data: [],
                fill: true,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                borderColor: THEME_COLORS.primary,
                borderWidth: 2.5,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: THEME_COLORS.primary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                }
            }
        }
    });

    // Latency (Line Chart)
    const ctxLatency = document.getElementById("latencyChart").getContext("2d");
    latencyChart = new Chart(ctxLatency, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "End-to-End Latency (ms)",
                data: [],
                fill: false,
                borderColor: THEME_COLORS.success,
                borderWidth: 2.5,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: THEME_COLORS.success
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    ticks: { color: "#94a3b8" }
                }
            }
        }
    });
}

/**
 * Benchmark Dashboard Static Comparisons
 */
function initBenchmarkCharts() {
    const benchmarks = API.getStaticBenchmarks();

    // 1. Sequential vs Parallel execution time (Grouped Bar Chart)
    const ctxSeqPar = document.getElementById("sequentialVsParallelChart").getContext("2d");
    sequentialVsParallelChart = new Chart(ctxSeqPar, {
        type: "bar",
        data: {
            labels: benchmarks.executionTime.categories,
            datasets: [
                {
                    label: "Sequential Processing",
                    data: benchmarks.executionTime.sequential,
                    backgroundColor: "rgba(239, 68, 68, 0.75)", // red
                    borderColor: THEME_COLORS.danger,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: "Parallel Lambda Stack",
                    data: benchmarks.executionTime.parallel,
                    backgroundColor: "rgba(34, 197, 94, 0.75)", // green
                    borderColor: THEME_COLORS.success,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { color: "#94a3b8", boxWidth: 12 }
                },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    title: { display: true, text: "Execution Time (seconds)", color: "#94a3b8" }
                }
            }
        }
    });

    // 2. Latency vs Ingestion Rate (Multi-Line Chart)
    const ctxLatIng = document.getElementById("latencyVsIngestionChart").getContext("2d");
    latencyVsIngestionChart = new Chart(ctxLatIng, {
        type: "line",
        data: {
            labels: benchmarks.latencyVsIngestion.ingestionRates.map(r => `${r}/s`),
            datasets: [
                {
                    label: "Sequential Stack Latency",
                    data: benchmarks.latencyVsIngestion.sequentialLatency,
                    borderColor: THEME_COLORS.danger,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 4,
                    fill: false,
                    tension: 0.2
                },
                {
                    label: "Parallel Stack (AWS Kinesis + Lambda)",
                    data: benchmarks.latencyVsIngestion.parallelLatency,
                    borderColor: THEME_COLORS.success,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    fill: false,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { color: "#94a3b8", boxWidth: 12 }
                },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: { grid: { color: THEME_COLORS.grid } },
                y: {
                    type: "logarithmic", // logarithmic to handle high scaling differences
                    grid: { color: THEME_COLORS.grid },
                    title: { display: true, text: "Latency (ms) [Log Scale]", color: "#94a3b8" }
                }
            }
        }
    });

    // 3. Speedup Factor & Execution Time vs Workers (Line/Bar combination)
    const ctxSpeedup = document.getElementById("speedupChart").getContext("2d");
    speedupChart = new Chart(ctxSpeedup, {
        type: "line",
        data: {
            labels: benchmarks.speedup.workers.map(w => `${w} Nodes`),
            datasets: [
                {
                    label: "Speedup Factor",
                    type: "line",
                    data: benchmarks.speedup.speedupFactor,
                    borderColor: THEME_COLORS.primary,
                    borderWidth: 2.5,
                    pointBackgroundColor: THEME_COLORS.primary,
                    pointRadius: 5,
                    yAxisID: "y-speedup",
                    tension: 0.2
                },
                {
                    label: "Execution Time (m)",
                    type: "bar",
                    data: benchmarks.speedup.executionTime,
                    backgroundColor: "rgba(245, 158, 11, 0.4)", // amber
                    borderColor: THEME_COLORS.warning,
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: "y-time"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { color: "#94a3b8", boxWidth: 12 }
                },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: { grid: { display: false } },
                "y-speedup": {
                    type: "linear",
                    position: "left",
                    grid: { color: THEME_COLORS.grid },
                    title: { display: true, text: "Speedup Factor (x)", color: "#94a3b8" }
                },
                "y-time": {
                    type: "linear",
                    position: "right",
                    grid: { display: false },
                    title: { display: true, text: "Execution Time (min)", color: "#94a3b8" }
                }
            }
        }
    });

    // 4. Throughput vs Ingestion Rate over Time
    const ctxThruTime = document.getElementById("throughputVsTimeChart").getContext("2d");
    throughputVsTimeChart = new Chart(ctxThruTime, {
        type: "line",
        data: {
            labels: benchmarks.throughputOverTime.timeline,
            datasets: [{
                label: "Spark Ingestion Throughput (events/sec)",
                data: benchmarks.throughputOverTime.throughput,
                borderColor: THEME_COLORS.cyan,
                backgroundColor: "rgba(6, 182, 212, 0.1)",
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: THEME_COLORS.cardBg }
            },
            scales: {
                x: { grid: { color: THEME_COLORS.grid } },
                y: {
                    grid: { color: THEME_COLORS.grid },
                    title: { display: true, text: "Throughput (events/sec)", color: "#94a3b8" }
                }
            }
        }
    });
}

/**
 * Auto Scaling Gauge Chart (Semi-Doughnut)
 */
function initGaugeChart() {
    const ctx = document.getElementById("workerGaugeChart").getContext("2d");
    workerGaugeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Active Workers", "Available Scaling Capacity"],
            datasets: [{
                data: [4, 6], // e.g. 4 active, max 10
                backgroundColor: [
                    THEME_COLORS.success,
                    "rgba(148, 163, 184, 0.1)"
                ],
                borderWidth: 0,
                weight: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rotation: 270,
            circumference: 180,
            cutout: "80%",
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

/**
 * Update the Speed Layer Trending chart
 */
function updateTrendingChart(items) {
    if (!trendingChart) return;

    // Sort and grab top 5
    const labels = items.map(item => `${item.track} (${item.artist})`);
    const values = items.map(item => item.play_count);

    // Padding if we get less than 5 items
    while (labels.length < 5) {
        labels.push("-");
        values.push(0);
    }

    trendingChart.data.labels = labels;
    trendingChart.data.datasets[0].data = values;
    trendingChart.update();
}

/**
 * Update the Top Artists chart
 */
function updateTopArtistsChart(records) {
    if (!topArtistsChart) return;

    // Take top 10
    const sorted = records.slice(0, 10);
    topArtistsChart.data.labels = sorted.map(r => r.Artist);
    topArtistsChart.data.datasets[0].data = sorted.map(r => r.listen_count);
    topArtistsChart.update();
}

/**
 * Update the Top Tracks chart
 */
function updateTopTracksChart(records) {
    if (!topTracksChart) return;

    // Take top 10
    const sorted = records.slice(0, 10);
    topTracksChart.data.labels = sorted.map(r => {
        // Truncate track name if too long
        let t = r.Track;
        if (t.includes(" (")) {
            t = t.split(" (")[0];
        }
        return t.length > 15 ? t.substring(0, 13) + "..." : t;
    });
    topTracksChart.data.datasets[0].data = sorted.map(r => r.listen_count);
    topTracksChart.update();
}

/**
 * Update the Top Albums chart
 */
function updateTopAlbumsChart(records) {
    if (!topAlbumsChart) return;

    const sorted = records.slice(0, 7); // Show top 7 for readability in doughnut
    topAlbumsChart.data.labels = sorted.map(r => {
        let a = r.Album;
        if (a.includes(" (")) {
            a = a.split(" (")[0];
        }
        return a.length > 18 ? a.substring(0, 15) + "..." : a;
    });
    topAlbumsChart.data.datasets[0].data = sorted.map(r => r.listen_count);
    topAlbumsChart.update();
}

/**
 * Update the Performance graphs (Throughput & Latency)
 */
function updatePerformanceCharts(history) {
    if (!throughputChart || !latencyChart) return;

    throughputChart.data.labels = history.timestamps;
    throughputChart.data.datasets[0].data = history.throughput;
    throughputChart.update("none"); // skip animation for continuous stream update performance

    latencyChart.data.labels = history.timestamps;
    latencyChart.data.datasets[0].data = history.latency;
    latencyChart.update("none");
}

/**
 * Update the gauge for Auto Scaling
 */
function updateGaugeChart(current, max) {
    if (!workerGaugeChart) return;

    const capacity = Math.max(0, max - current);

    // Dynamic color depending on workers load
    let workerColor = THEME_COLORS.success;
    if (current >= max * 0.8) {
        workerColor = THEME_COLORS.danger;
    } else if (current >= max * 0.6) {
        workerColor = THEME_COLORS.warning;
    }

    workerGaugeChart.data.datasets[0].backgroundColor[0] = workerColor;
    workerGaugeChart.data.datasets[0].data = [current, capacity];
    workerGaugeChart.update();

    // Update center DOM text
    const numDisplay = document.getElementById("gaugeValue");
    if (numDisplay) {
        numDisplay.innerHTML = `<span class="fw-bold fs-2 text-white">${current}</span> <span class="text-secondary">/ ${max}</span>`;
    }
}

// Export functions to window
window.initCharts = initCharts;
window.updateTrendingChart = updateTrendingChart;
window.updateTopArtistsChart = updateTopArtistsChart;
window.updateTopTracksChart = updateTopTracksChart;
window.updateTopAlbumsChart = updateTopAlbumsChart;
window.updatePerformanceCharts = updatePerformanceCharts;
window.updateGaugeChart = updateGaugeChart;
window.THEME_COLORS = THEME_COLORS;
