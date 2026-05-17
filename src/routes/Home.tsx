import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getDatabaseStats } from '~/lib/ipc/ipcDatabaseStats';
import getGlassUI from '~/styles/GlassStyles';
import { Users, Calendar, Trophy, Database, DollarSign, BarChart3, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {

    const [dbStats, setDbStats] = useState<object>({});

    const fetchStats = async () => {
        try {
            const stats = await getDatabaseStats();
            setDbStats(stats as object);
        } catch (err) {
            console.error(err instanceof Error ? err.message : String(err))
            setDbStats({})
        }
    }

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!mounted) return
            await fetchStats()
        })()
        return () => {
            mounted = false
        }
    }, [])

    const dummyData = {
        totalPlayers: 24,
        totalRounds: 12,
        avgHandicap: 14.5,
        dbRecords: 0,
        prizePool: 15000,
        nextRound: {
            id: "next-1",
            date: "2026-03-15",
            registeredCount: 18,
            maxPlayers: 24
        },
        teeDistribution: {
            blue: 8,
            white: 10,
            red: 6
        },
        recentRounds: [
            { id: "1", date: "2026-02-15", playerCount: 20, avgDifferential: 16.2 },
            { id: "2", date: "2026-02-08", playerCount: 18, avgDifferential: 15.8 },
            { id: "3", date: "2026-02-01", playerCount: 22, avgDifferential: 17.1 },
            { id: "4", date: "2026-01-25", playerCount: 16, avgDifferential: 14.9 },
            { id: "5", date: "2026-01-18", playerCount: 19, avgDifferential: 15.5 },
        ]
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    const formatDollars = (cents: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    }

    const totalTees = dummyData.teeDistribution.blue + dummyData.teeDistribution.white + dummyData.teeDistribution.red;

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0 px-4 pt-4 pb-10">
            
            {/* Page Header - Glass Style */}
            <div className={`${getGlassUI("white")} px-6 py-4 mb-6`}>
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold text-slate-700">Dashboard</h1>
                        <p className="text-muted-foreground">Overview of your golf league</p>
                    </div>
                </div>
            </div>

            {/* Row 1: Quick Stats - 4 cards */}
            <div className="grid grid-cols-4 gap-5 mb-6">
                {/* Total Players */}
                <div className="bg-stone-50 border-1 rounded-xl px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Total Players</p>
                    <p className="text-2xl font-bold">{dummyData.totalPlayers}</p>
                </div>

                {/* Total Rounds */}
                <div className="bg-stone-50 border-1 rounded-xl px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Total Rounds</p>
                    <p className="text-2xl font-bold">{dummyData.totalRounds}</p>
                </div>

                {/* Average Handicap */}
                <div className="bg-stone-50 border-1 rounded-xl px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Avg Handicap</p>
                    <p className="text-2xl font-bold">{dummyData.avgHandicap}</p>
                </div>

                {/* Tee Distribution */}
                <div className="col-span-1 bg-stone-50 border-1 rounded-xl px-4 py-5">
                    <p className="text-sm text-muted-foreground mb-4">Tee Distribution</p>
                    
                    <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-red-600"
                            style={{ width: `${(dummyData.teeDistribution.red / totalTees) * 100}%` }}
                        />
                        <div 
                            className="h-full bg-gray-500"
                            style={{ width: `${(dummyData.teeDistribution.white / totalTees) * 100}%` }}
                        />
                        <div 
                            className="h-full bg-blue-600"
                            style={{ width: `${(dummyData.teeDistribution.blue / totalTees) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between mt-2 text-xs">
                        <span className="text-red-700 font-medium">Red: {dummyData.teeDistribution.red}</span>
                        <span className="text-gray-700 font-medium">White: {dummyData.teeDistribution.white}</span>
                        <span className="text-blue-700 font-medium">Blue: {dummyData.teeDistribution.blue}</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Two Columns */}
            <div className="grid grid-cols-4 gap-5 mb-6">
                {/* Left: Next Round + Prize Pool */}
                <div className="col-span-3 bg-stone-50 border-1 rounded-xl px-6 py-5">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Next Round</p>
                            <h2 className="text-2xl font-bold">{formatDate(dummyData.nextRound.date)}</h2>
                            <p className="text-muted-foreground mt-1">
                                {dummyData.nextRound.registeredCount} / {dummyData.nextRound.maxPlayers} players registered
                            </p>
                        </div>
                        <Link to="/rounds">
                            <button className="flex items-center gap-2 px-4 py-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-sm font-medium transition-colors">
                                View Rounds <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>

                    <div className="border-t border-stone-200 pt-4">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-6 w-6 text-green-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Prize Pool (Year)</p>
                                <p className="text-3xl font-bold text-green-700">{formatDollars(dummyData.prizePool)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: DB Records - Full Table Breakdown */}
                <div className="bg-stone-50 border-1 rounded-xl px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">DB Records</p>
                    <p className="text-2xl font-bold mb-3">{Object.values(dbStats).reduce((a: number, b: number) => a + b, 0) as number || '-'}</p>
                    {dbStats && Object.keys(dbStats).length > 0 && (
                        <div className="text-xs space-y-1 border-t border-stone-200 pt-2">
                            {Object.entries(dbStats).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="font-mono text-muted-foreground">{key}</span>
                                    <span className="font-mono">{value as number}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Recent Rounds */}
            <div className="bg-stone-50 border-1 rounded-xl px-6 py-5">
                <h3 className="text-lg font-semibold mb-4">Recent Rounds</h3>
                <div className="space-y-3">
                    {dummyData.recentRounds.map((round) => (
                        <div key={round.id} className="flex items-center justify-between py-2 border-b border-stone-200 last:border-0">
                            <div className="flex items-center gap-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatDate(round.date)}</span>
                            </div>
                            <div className="flex items-center gap-8 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{round.playerCount} players</span>
                                </div>
                                <div>
                                    <span className="text-stone-600">Avg Diff: </span>
                                    <span className="font-medium">{round.avgDifferential}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Home;
