(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__3822f3ee._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/lib/mock-data.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOCK_USER_DATA",
    ()=>MOCK_USER_DATA
]);
const MOCK_USER_DATA = {
    walletAddress: "0x71C...4f32",
    balances: {
        tot: 12450.75,
        tof: 350.20,
        usdt: 1200.50
    },
    // --- Home: Announcements ---
    announcements: [
        {
            id: 1,
            title: "NFTA 节点 V2 升级上线",
            date: "2026-03-20",
            type: "update",
            content: "所有 NFTA 节点已升级至 V2，收益提升 15%。"
        },
        {
            id: 2,
            title: "TOT 登陆主流交易所",
            date: "2026-03-18",
            type: "news",
            content: "TOT 代币已上线 Top 5 中心化交易所。"
        },
        {
            id: 3,
            title: "3月25日计划维护",
            date: "2026-03-15",
            type: "maintenance",
            content: "平台将于 3 月 25 日 02:00-04:00 UTC 进行维护。"
        },
        {
            id: 4,
            title: "NFTB 黄金档位奖励活动",
            date: "2026-03-12",
            type: "event",
            content: "黄金档位 NFTB 持有者本月可获得双倍分红。"
        }
    ],
    // --- Home: Prices ---
    prices: [
        {
            symbol: "TOT",
            name: "TOT Token",
            price: 0.245,
            change24h: 5.32,
            volume: "12.4M"
        },
        {
            symbol: "TOF",
            name: "TOF Token",
            price: 1.82,
            change24h: -2.15,
            volume: "3.2M"
        },
        {
            symbol: "ETH",
            name: "Ethereum",
            price: 3842.50,
            change24h: 1.87,
            volume: "18.6B"
        },
        {
            symbol: "BTC",
            name: "Bitcoin",
            price: 97250.00,
            change24h: 0.65,
            volume: "42.1B"
        }
    ],
    // --- Nodes ---
    nftaNodes: [
        {
            nodeId: "A-001",
            status: "运行中",
            yieldPerDay: 45.5,
            startDate: "2024-01-15",
            uptime: "99.9%",
            tier: "Pro"
        },
        {
            nodeId: "A-012",
            status: "运行中",
            yieldPerDay: 42.0,
            startDate: "2024-02-01",
            uptime: "98.5%",
            tier: "Pro"
        },
        {
            nodeId: "A-045",
            status: "待机",
            yieldPerDay: 0,
            startDate: "2024-02-10",
            uptime: "0%",
            tier: "Basic"
        }
    ],
    nftbNodes: [
        {
            nodeId: "B-202",
            level: 3,
            weight: 4,
            tier: "Advanced",
            paymentMethod: "USDT",
            dividendShare: 40,
            historicalDividends: [
                {
                    date: "2024-02-15",
                    totAmount: 120,
                    usdtAmount: 15
                },
                {
                    date: "2024-02-01",
                    totAmount: 115,
                    usdtAmount: 14.5
                },
                {
                    date: "2024-01-15",
                    totAmount: 110,
                    usdtAmount: 14
                }
            ]
        },
        {
            nodeId: "B-501",
            level: 1,
            weight: 1,
            tier: "Junior",
            paymentMethod: "TOF",
            dividendShare: 20,
            historicalDividends: [
                {
                    date: "2024-02-15",
                    totAmount: 45,
                    usdtAmount: 5
                },
                {
                    date: "2024-02-01",
                    totAmount: 42,
                    usdtAmount: 4.8
                }
            ]
        }
    ],
    nftaTiers: [
        {
            tier: "Basic",
            price: 500,
            currency: "USDT",
            dailyYield: 25,
            description: "入门级挖矿节点"
        },
        {
            tier: "Pro",
            price: 2000,
            currency: "USDT",
            dailyYield: 55,
            description: "高性能节点"
        },
        {
            tier: "Elite",
            price: 5000,
            currency: "USDT",
            dailyYield: 150,
            description: "最大收益企业级节点"
        }
    ],
    nftbTiers: [
        {
            tier: "Junior",
            tierZh: "初级",
            name: "Ordinary Scepter",
            nameZh: "普通权杖",
            price: 500,
            currency: "USDT/TOF",
            level: 1,
            weight: 1,
            maxSupply: 2000,
            usdtQuota: 1000,
            tofQuota: 1000,
            dividendShare: 20,
            predictionFlow: 0.4,
            description: "初级股东节点 – 20% 分红比例"
        },
        {
            tier: "Intermediate",
            tierZh: "中级",
            name: "Rare Crown",
            nameZh: "稀有王冠",
            price: 1000,
            currency: "USDT/TOF",
            level: 2,
            weight: 2,
            maxSupply: 2000,
            usdtQuota: 1000,
            tofQuota: 1000,
            dividendShare: 30,
            predictionFlow: 0.5,
            description: "中级股东节点 – 30% 分红比例"
        },
        {
            tier: "Advanced",
            tierZh: "高级",
            name: "Legendary Throne",
            nameZh: "传说神座",
            price: 2000,
            currency: "USDT/TOF",
            level: 3,
            weight: 4,
            maxSupply: 2000,
            usdtQuota: 1000,
            tofQuota: 1000,
            dividendShare: 40,
            predictionFlow: 0.6,
            description: "高级股东节点 – 40% 分红比例"
        }
    ],
    // --- Purchase Records ---
    purchaseRecords: [
        {
            id: "TX-001",
            type: "NFTA",
            tier: "Pro",
            price: 2000,
            currency: "USDT",
            date: "2024-01-15",
            status: "completed",
            nodeId: "A-001"
        },
        {
            id: "TX-002",
            type: "NFTA",
            tier: "Pro",
            price: 2000,
            currency: "USDT",
            date: "2024-02-01",
            status: "completed",
            nodeId: "A-012"
        },
        {
            id: "TX-003",
            type: "NFTA",
            tier: "Basic",
            price: 500,
            currency: "USDT",
            date: "2024-02-10",
            status: "completed",
            nodeId: "A-045"
        },
        {
            id: "TX-004",
            type: "NFTB",
            tier: "Advanced",
            price: 2000,
            currency: "USDT",
            date: "2024-01-10",
            status: "completed",
            nodeId: "B-202"
        },
        {
            id: "TX-005",
            type: "NFTB",
            tier: "Junior",
            price: 500,
            currency: "TOF",
            date: "2024-02-12",
            status: "completed",
            nodeId: "B-501"
        }
    ],
    // --- Swap ---
    swapTokens: [
        {
            symbol: "TOT",
            name: "TOT Token",
            balance: 12450.75,
            price: 0.245
        },
        {
            symbol: "TOF",
            name: "TOF Token",
            balance: 350.20,
            price: 1.82
        },
        {
            symbol: "USDT",
            name: "Tether USD",
            balance: 1200.50,
            price: 1.00
        },
        {
            symbol: "ETH",
            name: "Ethereum",
            balance: 0.85,
            price: 3842.50
        }
    ],
    // --- Earnings ---
    earningsHistory: [
        {
            date: "2026-03-21",
            type: "NFTA Yield",
            nodeId: "A-001",
            totAmount: 45.5,
            usdtEquiv: 11.15,
            status: "claimed"
        },
        {
            date: "2026-03-21",
            type: "NFTA Yield",
            nodeId: "A-012",
            totAmount: 42.0,
            usdtEquiv: 10.29,
            status: "claimed"
        },
        {
            date: "2026-03-20",
            type: "NFTB Dividend",
            nodeId: "B-202",
            totAmount: 120,
            usdtEquiv: 29.40,
            status: "claimed"
        },
        {
            date: "2026-03-20",
            type: "NFTA Yield",
            nodeId: "A-001",
            totAmount: 45.5,
            usdtEquiv: 11.15,
            status: "claimed"
        },
        {
            date: "2026-03-20",
            type: "NFTA Yield",
            nodeId: "A-012",
            totAmount: 42.0,
            usdtEquiv: 10.29,
            status: "claimed"
        },
        {
            date: "2026-03-19",
            type: "NFTB Dividend",
            nodeId: "B-501",
            totAmount: 45,
            usdtEquiv: 11.03,
            status: "claimed"
        },
        {
            date: "2026-03-19",
            type: "NFTA Yield",
            nodeId: "A-001",
            totAmount: 45.5,
            usdtEquiv: 11.15,
            status: "pending"
        },
        {
            date: "2026-03-18",
            type: "Team Bonus",
            nodeId: "-",
            totAmount: 200,
            usdtEquiv: 49.00,
            status: "claimed"
        },
        {
            date: "2026-03-17",
            type: "NFTB Dividend",
            nodeId: "B-202",
            totAmount: 120,
            usdtEquiv: 29.40,
            status: "claimed"
        },
        {
            date: "2026-03-16",
            type: "NFTA Yield",
            nodeId: "A-001",
            totAmount: 45.5,
            usdtEquiv: 11.15,
            status: "claimed"
        }
    ],
    earningsSummary: {
        totalTot: 28650,
        totalUsdt: 7019.25,
        todayTot: 252.5,
        todayUsdt: 61.86,
        weekTot: 1450.0,
        weekUsdt: 355.25
    },
    predictionHistory: [
        {
            predictionId: "P-1001",
            platform: "BTC 1H",
            date: "2026-03-28",
            stake: 120,
            winnings: 210,
            outcome: "WIN"
        },
        {
            predictionId: "P-1002",
            platform: "ETH 4H",
            date: "2026-03-27",
            stake: 90,
            winnings: 0,
            outcome: "LOSS"
        },
        {
            predictionId: "P-1003",
            platform: "SOL Daily",
            date: "2026-03-26",
            stake: 75,
            winnings: 132,
            outcome: "WIN"
        }
    ],
    // --- Team Nodes ---
    teamInfo: {
        totalMembers: 24,
        directReferrals: 8,
        teamLevel: 3,
        teamBonus: 200,
        totalTeamEarnings: 4500
    },
    teamMembers: [
        {
            address: "0xA3f...8b21",
            level: 1,
            nodesCount: 3,
            contribution: 450,
            joinDate: "2024-01-20",
            status: "active"
        },
        {
            address: "0xB7c...2d45",
            level: 1,
            nodesCount: 2,
            contribution: 320,
            joinDate: "2024-01-25",
            status: "active"
        },
        {
            address: "0xC1e...9f67",
            level: 1,
            nodesCount: 1,
            contribution: 150,
            joinDate: "2024-02-05",
            status: "active"
        },
        {
            address: "0xD4a...3c89",
            level: 2,
            nodesCount: 4,
            contribution: 680,
            joinDate: "2024-02-10",
            status: "active"
        },
        {
            address: "0xE6b...7e12",
            level: 2,
            nodesCount: 2,
            contribution: 280,
            joinDate: "2024-02-15",
            status: "active"
        },
        {
            address: "0xF8d...1a34",
            level: 1,
            nodesCount: 1,
            contribution: 100,
            joinDate: "2024-03-01",
            status: "inactive"
        },
        {
            address: "0xA9e...5c56",
            level: 3,
            nodesCount: 5,
            contribution: 920,
            joinDate: "2024-01-18",
            status: "active"
        },
        {
            address: "0xB2f...8d78",
            level: 2,
            nodesCount: 3,
            contribution: 410,
            joinDate: "2024-02-20",
            status: "active"
        }
    ],
    tokenomics: {
        tot: {
            totalSupply: 1000000000,
            circulatingSupply: 450000000,
            burnRate: "1.2% / 月",
            transactionFee: "2%"
        },
        tof: {
            totalSupply: 10000000,
            circulatingSupply: 2500000,
            burnRate: "每次提现 5%",
            transactionFee: "0.5%"
        }
    },
    // --- Admin ---
    adminData: {
        ownerAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        platformStats: {
            totalUsers: 1284,
            activeNodes: 856,
            totalVolume: 2450000,
            revenue: 185000
        },
        users: [
            {
                address: "0xA3f...8b21",
                nodesCount: 5,
                teamSize: 12,
                totalInvested: 12000,
                status: "enabled"
            },
            {
                address: "0xB7c...2d45",
                nodesCount: 3,
                teamSize: 8,
                totalInvested: 7500,
                status: "enabled"
            },
            {
                address: "0xC1e...9f67",
                nodesCount: 2,
                teamSize: 4,
                totalInvested: 3200,
                status: "enabled"
            },
            {
                address: "0xD4a...3c89",
                nodesCount: 7,
                teamSize: 22,
                totalInvested: 24000,
                status: "enabled"
            },
            {
                address: "0xE6b...7e12",
                nodesCount: 1,
                teamSize: 0,
                totalInvested: 500,
                status: "disabled"
            },
            {
                address: "0xF8d...1a34",
                nodesCount: 4,
                teamSize: 15,
                totalInvested: 8800,
                status: "enabled"
            }
        ],
        recentTransactions: [
            {
                from: "0xA3f...8b21",
                action: "购买 NFTA Pro",
                amount: 2000,
                time: "2 分钟前"
            },
            {
                from: "0xB7c...2d45",
                action: "提取 TOT",
                amount: 450,
                time: "8 分钟前"
            },
            {
                from: "0xD4a...3c89",
                action: "购买 NFTB 高级",
                amount: 2000,
                time: "15 分钟前"
            },
            {
                from: "0xC1e...9f67",
                action: "兑换 TOT→USDT",
                amount: 1200,
                time: "22 分钟前"
            },
            {
                from: "0xF8d...1a34",
                action: "购买 NFTA Elite",
                amount: 5000,
                time: "35 分钟前"
            },
            {
                from: "0xA3f...8b21",
                action: "领取分红",
                amount: 320,
                time: "1 小时前"
            }
        ],
        settings: {
            withdrawFeeRate: "5%",
            minPurchase: 300,
            maintenanceMode: false
        }
    }
};
}),
"[project]/src/lib/announcement.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ANNOUNCEMENT_TYPES",
    ()=>ANNOUNCEMENT_TYPES,
    "normalizeAnnouncementType",
    ()=>normalizeAnnouncementType
]);
const ANNOUNCEMENT_TYPES = [
    "update",
    "news",
    "maintenance",
    "event"
];
function normalizeAnnouncementType(value) {
    if (ANNOUNCEMENT_TYPES.includes(value)) {
        return value;
    }
    return "update";
}
}),
"[project]/src/lib/announcement-data-service.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAnnouncementViaService",
    ()=>createAnnouncementViaService,
    "fetchAnnouncementsFromService",
    ()=>fetchAnnouncementsFromService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$announcement$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/announcement.ts [app-edge-route] (ecmascript)");
;
function getServiceConfig() {
    const baseUrl = process.env.ANNOUNCEMENT_DATA_SERVICE_URL?.trim();
    const token = process.env.ANNOUNCEMENT_DATA_SERVICE_TOKEN?.trim();
    if (!baseUrl) {
        return null;
    }
    return {
        baseUrl: baseUrl.replace(/\/$/, ""),
        token
    };
}
function buildHeaders(token) {
    return {
        "Content-Type": "application/json",
        ...token ? {
            Authorization: `Bearer ${token}`
        } : {}
    };
}
function mapServiceAnnouncement(item) {
    const date = item.date || item.created_at || new Date().toISOString();
    return {
        id: item.id,
        title: item.title,
        content: item.content,
        type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$announcement$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["normalizeAnnouncementType"])(item.type || "update"),
        date: date.slice(0, 10)
    };
}
async function fetchAnnouncementsFromService() {
    const cfg = getServiceConfig();
    if (!cfg) {
        return null;
    }
    const response = await fetch(`${cfg.baseUrl}/announcements`, {
        method: "GET",
        headers: buildHeaders(cfg.token),
        cache: "no-store"
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Service request failed (${response.status})`);
    }
    const payload = await response.json();
    const rows = payload.data ?? payload.announcements ?? [];
    return rows.map(mapServiceAnnouncement);
}
async function createAnnouncementViaService(input) {
    const cfg = getServiceConfig();
    if (!cfg) {
        return null;
    }
    const response = await fetch(`${cfg.baseUrl}/announcements`, {
        method: "POST",
        headers: buildHeaders(cfg.token),
        body: JSON.stringify(input),
        cache: "no-store"
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Service request failed (${response.status})`);
    }
    const payload = await response.json();
    const item = payload.data ?? payload.announcement;
    if (!item) {
        throw new Error("Service response missing announcement payload");
    }
    return mapServiceAnnouncement(item);
}
}),
"[project]/src/app/api/announcements/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [app-edge-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mock-data.ts [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$announcement$2d$data$2d$service$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/announcement-data-service.ts [app-edge-route] (ecmascript)");
;
;
;
const runtime = "edge";
async function GET() {
    try {
        const rows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$announcement$2d$data$2d$service$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["fetchAnnouncementsFromService"])();
        if (!rows) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                data: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["MOCK_USER_DATA"].announcements,
                source: "mock"
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            data: rows,
            source: "http-service"
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: "Failed to load announcements",
            detail: message
        }, {
            status: 500
        });
    }
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__3822f3ee._.js.map