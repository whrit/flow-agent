import { printSuccess, printError } from '../utils.js';
import { createDirectoryStructure } from './directory-structure.js';
import { createSwarmCommands } from './swarm-commands.js';
import { createSparcEnvironment } from './sparc-environment.js';
import { createClaudeConfig } from './claude-config.js';
import { createBatchToolsGuide } from './batch-tools.js';
export async function initCommand(options = {}) {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        printSuccess('Initializing Claude-Flow project...');
        console.log('\n📁 Phase 1: Creating directory structure...');
        await createDirectoryStructure();
        console.log('\n⚙️  Phase 2: Creating configuration...');
        await createClaudeConfig(options);
        console.log('\n🤖 Phase 3: Creating swarm commands...');
        await createSwarmCommands();
        console.log('\n🔧 Phase 4: Creating batch tools guides...');
        await createBatchToolsGuide();
        if (options.sparc) {
            console.log('\n🚀 Phase 5: Creating SPARC environment...');
            await createSparcEnvironment();
        }
        console.log('\n🎉 Project initialized successfully!');
        console.log('   📁 Created .claude/ directory structure');
        console.log('   📋 Created comprehensive swarm command documentation');
        console.log('   🔧 Created batch tools coordination guides');
        console.log('   📖 Created detailed usage examples with orchestration');
        console.log('\n   Next steps:');
        console.log('   1. Run "claude-flow swarm --help" to see swarm options');
        console.log('   2. Check .claude/commands/swarm/ for detailed documentation');
        console.log('   3. Review batch tools guide for orchestration patterns');
        console.log('   4. Run "claude-flow help" for all available commands');
        if (options.sparc) {
            console.log('   5. Run "claude-flow sparc modes" to see available SPARC modes');
            console.log('   6. Use TodoWrite/TodoRead for task coordination');
            console.log('   7. Use Task tool for parallel agent execution');
        }
    } catch (error) {
        printError(`Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

//# sourceMappingURL=index.js.map