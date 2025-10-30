import { getLocalTimestamp, formatTimestampForDisplay, getTimezoneInfo } from '../../utils/timezone-utils.js';
export function createSessionWithProperTimezone(objective, options = {}) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const utcTimestamp = new Date().toISOString();
    const localTimestamp = getLocalTimestamp();
    const timezoneInfo = getTimezoneInfo();
    const session = {
        id: sessionId,
        objective,
        createdAt: utcTimestamp,
        createdAtLocal: localTimestamp,
        timezone: timezoneInfo,
        status: 'active',
        ...options
    };
    return session;
}
export function displaySessionInfo(session) {
    const timeDisplay = formatTimestampForDisplay(session.createdAt);
    console.log(`🐝 Hive Mind Session`);
    console.log(`📋 ID: ${session.id}`);
    console.log(`🎯 Objective: ${session.objective}`);
    console.log(`⏰ Created: ${timeDisplay.display}`);
    console.log(`🌍 Timezone: ${session.timezone?.name || 'Unknown'}`);
    console.log(`📊 Status: ${session.status}`);
}
export function listSessionsWithTimezone(sessions) {
    console.log('📋 Hive Mind Sessions:\n');
    if (sessions.length === 0) {
        console.log('No sessions found.');
        return;
    }
    console.log('ID'.padEnd(25) + 'Objective'.padEnd(30) + 'Created'.padEnd(25) + 'Status');
    console.log('-'.repeat(100));
    sessions.forEach((session)=>{
        const timeDisplay = formatTimestampForDisplay(session.createdAt);
        const id = session.id.length > 22 ? session.id.substr(0, 22) + '...' : session.id;
        const objective = session.objective.length > 27 ? session.objective.substr(0, 27) + '...' : session.objective;
        console.log(id.padEnd(25) + objective.padEnd(30) + timeDisplay.relative.padEnd(25) + session.status);
    });
    console.log(`\n💡 Times shown in your timezone: ${getTimezoneInfo().name}`);
}
export function demonstrateTimezonefix() {
    console.log('🧪 Testing timezone fix for issue #246\n');
    const tz = getTimezoneInfo();
    console.log(`🌍 Your timezone: ${tz.name} (${tz.abbreviation})`);
    console.log(`⏰ UTC offset: ${tz.offset > 0 ? '+' : ''}${tz.offset} hours\n`);
    const session = createSessionWithProperTimezone('Build microservices API', {
        queenType: 'strategic',
        maxWorkers: 6
    });
    displaySessionInfo(session);
    console.log('\n📋 Session list example:');
    listSessionsWithTimezone([
        session
    ]);
    console.log("\n✅ Fix applied - timestamps now show in user's local timezone!");
}

//# sourceMappingURL=timestamp-fix.js.map