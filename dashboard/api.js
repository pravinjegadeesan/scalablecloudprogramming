/**
 * API client configuration and Mock Data Provider
 * Music Charts Real-Time Analytics
 */

// Configure FastAPI server location here
const API_URL = "http://127.0.0.1:8001";

// Simulation/Demo Mode state
let isSimulationMode = true;

// Cache of historical metrics for charts
const metricsHistory = {
    timestamps: [],
    throughput: [],
    latency: [],
    workerCount: []
};

// Initial benchmark and performance static datasets
const STATIC_BENCHMARKS = {
    // Benchmark 1: Sequential vs Parallel Processing Execution Time
    executionTime: {
        categories: ["Data Ingestion (10k)", "Spark Aggregations", "Serving Layer Updates"],
        sequential: [4.2, 12.8, 3.1],
        parallel: [0.8, 3.4, 0.5] // EMR + Kinesis parallel processing
    },
    // Benchmark 2: Speedup vs Worker Count
    speedup: {
        workers: [1, 2, 4, 8, 10],
        executionTime: [20.1, 11.2, 5.8, 3.2, 2.9],
        speedupFactor: [1.0, 1.8, 3.5, 6.3, 6.9]
    },
    // Benchmark 3: Latency vs Ingestion Rate
    latencyVsIngestion: {
        ingestionRates: [100, 500, 1000, 2000, 5000, 10000],
        sequentialLatency: [12, 45, 120, 480, 1800, 5200], // spikes early
        parallelLatency: [5, 6, 8, 12, 18, 25] // stable thanks to Kinesis partitions + Auto Scaling
    },
    // Benchmark 4: Throughput vs Ingestion Time
    throughputOverTime: {
        timeline: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00"],
        throughput: [120, 450, 950, 1900, 4800, 9800]
    }
};

// Realistic mock datasets based on Last.fm data
const MOCK_DATA = {
    topArtists: [
        { Artist: "Sophie", listen_count: 1181 },
        { Artist: "Madlib", listen_count: 1074 },
        { Artist: "Bicep", listen_count: 766 },
        { Artist: "Taylor Swift", listen_count: 649 },
        { Artist: "Arlo Parks", listen_count: 593 },
        { Artist: "Morrissey", listen_count: 498 },
        { Artist: "Depeche Mode", listen_count: 469 },
        { Artist: "Coldplay", listen_count: 393 },
        { Artist: "New Order", listen_count: 367 },
        { Artist: "MF DOOM", listen_count: 366 }
    ],
    topTracks: [
        { Track: "Aura (Bicep)", listen_count: 412 },
        { Track: "Glue (Bicep)", listen_count: 354 },
        { Track: "Cruel Summer (Taylor Swift)", listen_count: 298 },
        { Track: "Eugene (Arlo Parks)", listen_count: 245 },
        { Track: "Rhinestone Cowboy (MF DOOM)", listen_count: 221 },
        { Track: "Blue Monday (New Order)", listen_count: 198 },
        { Track: "Enjoy the Silence (Depeche Mode)", listen_count: 185 },
        { Track: "BIPP (Sophie)", listen_count: 176 },
        { Track: "Doomsday (MF DOOM)", listen_count: 154 },
        { Track: "All Up In Your Mind (Beyoncé)", listen_count: 140 }
    ],
    topAlbums: [
        { Album: "Oil of Every Pearl's Un-Insides (Sophie)", listen_count: 843 },
        { Album: "Madvillainy (Madlib & MF DOOM)", listen_count: 782 },
        { Album: "Bicep (Bicep)", listen_count: 621 },
        { Album: "Folklore (Taylor Swift)", listen_count: 542 },
        { Album: "Collapsed in Sunbeams (Arlo Parks)", listen_count: 431 },
        { Album: "Power, Corruption & Lies (New Order)", listen_count: 310 },
        { Album: "Violator (Depeche Mode)", listen_count: 290 },
        { Album: "Viva la Vida (Coldplay)", listen_count: 212 },
        { Album: "Limit to Your Love (James Blake)", listen_count: 180 }
    ]
};

const COUNTRIES = ["Ireland", "United Kingdom", "United States", "Germany", "France", "Japan", "Canada", "Australia", "Netherlands", "Sweden"];
const EVENT_TYPES = ["Stream Play", "Skip", "Like", "Add to Playlist", "Purchase"];

// Mock state generator
class MockDataProvider {
    constructor() {
        this.eventsProcessed = 1530240;
        this.activeWorkers = 4;
        this.minWorkers = 2;
        this.maxWorkers = 10;
        this.scalingTrigger = "CPU > 75% or Stream Ingestion > 3000 events/sec";
        this.cooldownPeriod = 300; // seconds
        this.currentLatency = 8.5; // ms
        
        // Generate initial recent events list
        this.recentEvents = [];
        for (let i = 0; i < 20; i++) {
            this.recentEvents.push(this.generateRandomEvent(i * 12));
        }

        // Generate initial metrics history
        const now = new Date();
        for (let i = 9; i >= 0; i--) {
            const timeStr = new Date(now.getTime() - i * 5000).toLocaleTimeString();
            metricsHistory.timestamps.push(timeStr);
            metricsHistory.throughput.push(Math.round(2000 + Math.random() * 800));
            metricsHistory.latency.push(parseFloat((6 + Math.random() * 4).toFixed(1)));
            metricsHistory.workerCount.push(this.activeWorkers);
        }
    }

    generateRandomEvent(offsetSeconds = 0) {
        const timestamp = new Date(Date.now() - offsetSeconds * 1000).toISOString();
        const artistObj = MOCK_DATA.topArtists[Math.floor(Math.random() * MOCK_DATA.topArtists.length)];
        const trackObj = MOCK_DATA.topTracks[Math.floor(Math.random() * MOCK_DATA.topTracks.length)];
        const albumObj = MOCK_DATA.topAlbums[Math.floor(Math.random() * MOCK_DATA.topAlbums.length)];

        return {
            event_id: Math.random().toString(36).substring(2, 15),
            timestamp: timestamp,
            processed_at: new Date(Date.now() - (offsetSeconds * 1000) + 120).toISOString(), // 120ms later
            artist: artistObj.Artist,
            track: trackObj.Track.split(" (")[0],
            album: albumObj.Album.split(" (")[0],
            listeners: Math.floor(5000 + Math.random() * 45000),
            playcount: Math.floor(100000 + Math.random() * 900000),
            country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
            event_type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]
        };
    }

    tick() {
        // Increment events processed
        const newEventsCount = Math.floor(50 + Math.random() * 100);
        this.eventsProcessed += newEventsCount;

        // Auto Scaling visualization simulation
        const currentIngestion = Math.round(1500 + Math.random() * 1800);
        if (currentIngestion > 3000 && this.activeWorkers < this.maxWorkers) {
            // Trigger scaling up
            if (Math.random() > 0.7) {
                this.activeWorkers++;
            }
        } else if (currentIngestion < 2000 && this.activeWorkers > this.minWorkers) {
            // Trigger scaling down
            if (Math.random() > 0.8) {
                this.activeWorkers--;
            }
        }

        // Add new metrics history entry
        const timeStr = new Date().toLocaleTimeString();
        metricsHistory.timestamps.push(timeStr);
        metricsHistory.throughput.push(currentIngestion);
        this.currentLatency = parseFloat((5 + Math.random() * 4 + (this.activeWorkers > 6 ? -2 : 2)).toFixed(1));
        metricsHistory.latency.push(this.currentLatency);
        metricsHistory.workerCount.push(this.activeWorkers);

        // Keep last 15 ticks for histories
        if (metricsHistory.timestamps.length > 15) {
            metricsHistory.timestamps.shift();
            metricsHistory.throughput.shift();
            metricsHistory.latency.shift();
            metricsHistory.workerCount.shift();
        }

        // Prepend new event to recentEvents, keep limit of 20
        const newEvent = this.generateRandomEvent(0);
        this.recentEvents.unshift(newEvent);
        this.recentEvents = this.recentEvents.slice(0, 20);

        return {
            eventsProcessed: this.eventsProcessed,
            latency: this.currentLatency,
            throughput: currentIngestion,
            activeWorkers: this.activeWorkers
        };
    }

    getTrending() {
        // Return 5 trending items sorted by play_count
        const tracks = [
            { track_name: "Glue", artist_name: "Bicep", play_count: Math.floor(300 + Math.random() * 100) },
            { track_name: "BIPP", artist_name: "Sophie", play_count: Math.floor(250 + Math.random() * 80) },
            { track_name: "Cruel Summer", artist_name: "Taylor Swift", play_count: Math.floor(220 + Math.random() * 70) },
            { track_name: "Aura", artist_name: "Bicep", play_count: Math.floor(180 + Math.random() * 60) },
            { track_name: "Eugene", artist_name: "Arlo Parks", play_count: Math.floor(150 + Math.random() * 50) }
        ];
        return tracks.sort((a, b) => b.play_count - a.play_count);
    }
}

const mockProvider = new MockDataProvider();

// Core API Wrapper
const API = {
    // Checks backend connectivity, if backend fails, sets simulationMode to true
    async checkApiHealth() {
        try {
            const response = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(2000) });
            if (response.ok) {
                const data = await response.json();
                console.log("Serving Layer API connected:", data);
                return true;
            }
            return false;
        } catch (e) {
            console.warn("Serving Layer API offline, falling back to Simulation Mode");
            return false;
        }
    },

    // Fetch latest events
    async getLatestEvents() {
        if (isSimulationMode) {
            return mockProvider.recentEvents;
        }
        try {
            const res = await fetch(`${API_URL}/latest-events`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        } catch (e) {
            console.error("API error for getLatestEvents:", e);
            throw e;
        }
    },

    // Fetch trending tracks (speed layer sliding window)
    async getTrendingNow() {
        if (isSimulationMode) {
            // Mapping format from backend is track, artist, play_count
            return mockProvider.getTrending().map(t => ({
                track: t.track_name,
                artist: t.artist_name,
                play_count: t.play_count
            }));
        }
        try {
            const res = await fetch(`${API_URL}/trending-now`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        } catch (e) {
            console.error("API error for getTrendingNow:", e);
            throw e;
        }
    },

    // Fetch top artists (batch layer)
    async getTopArtists() {
        if (isSimulationMode) {
            return MOCK_DATA.topArtists;
        }
        try {
            const res = await fetch(`${API_URL}/top-artists`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        } catch (e) {
            console.error("API error for getTopArtists:", e);
            throw e;
        }
    },

    // Fetch top tracks (batch layer)
    async getTopTracks() {
        if (isSimulationMode) {
            return MOCK_DATA.topTracks;
        }
        try {
            const res = await fetch(`${API_URL}/top-tracks`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        } catch (e) {
            console.error("API error for getTopTracks:", e);
            throw e;
        }
    },

    // Fetch top albums (batch layer)
    async getTopAlbums() {
        if (isSimulationMode) {
            return MOCK_DATA.topAlbums;
        }
        try {
            const res = await fetch(`${API_URL}/top-albums`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data;
        } catch (e) {
            console.error("API error for getTopAlbums:", e);
            throw e;
        }
    },

    // Returns structural config parameters
    getMockStatus() {
        return {
            eventsProcessed: mockProvider.eventsProcessed,
            latency: mockProvider.currentLatency,
            activeWorkers: mockProvider.activeWorkers,
            minWorkers: mockProvider.minWorkers,
            maxWorkers: mockProvider.maxWorkers,
            scalingTrigger: mockProvider.scalingTrigger,
            cooldownPeriod: mockProvider.cooldownPeriod
        };
    },

    tickMock() {
        return mockProvider.tick();
    },

    getStaticBenchmarks() {
        return STATIC_BENCHMARKS;
    },

    getMetricsHistory() {
        return metricsHistory;
    }
};

// Export to window object for global availability
window.API_URL = API_URL;
window.API = API;
window.isSimulationMode = isSimulationMode;
window.setSimulationMode = function(val) {
    isSimulationMode = val;
    window.isSimulationMode = val;
};
