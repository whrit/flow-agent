import { Command } from '../commander-fix.js';
import { logger } from '../../migration/logger.js';
import * as path from 'path';
import chalk from 'chalk';
export function createMigrateCommand() {
    const command = new Command('migrate');
    command.description('Migrate existing claude-flow projects to optimized prompts').option('-p, --path <path>', 'Project path', '.').option('-s, --strategy <type>', 'Migration strategy: full, selective, merge', 'selective').option('-b, --backup <dir>', 'Backup directory', '.claude-backup').option('-f, --force', 'Force migration without prompts').option('--dry-run', 'Simulate migration without making changes').option('--preserve-custom', 'Preserve custom commands and configurations').option('--skip-validation', 'Skip post-migration validation').option('--analyze-only', 'Only analyze project without migrating').option('--verbose', 'Show detailed output').action(async (options)=>{
        try {
            const projectPath = path.resolve(options.path);
            if (options.analyzeOnly) {
                await analyzeProject(projectPath, options);
            } else {
                await runMigration(projectPath, options);
            }
        } catch (error) {
            logger.error('Migration command failed:', error);
            process.exit(1);
        }
    });
    command.command('analyze [path]').description('Analyze project for migration readiness').option('-d, --detailed', 'Show detailed analysis').option('-o, --output <file>', 'Output analysis to file').action(async (projectPath = '.', options)=>{
        await analyzeProject(path.resolve(projectPath), options);
    });
    command.command('rollback [path]').description('Rollback to previous configuration').option('-b, --backup <dir>', 'Backup directory', '.claude-backup').option('-t, --timestamp <time>', 'Restore from specific timestamp').option('-f, --force', 'Force rollback without prompts').option('--list', 'List available backups').action(async (projectPath = '.', options)=>{
        const { RollbackManager } = await import('../../migration/rollback-manager.js');
        const rollbackManager = new RollbackManager(path.resolve(projectPath), options.backup);
        if (options.list) {
            const backups = await rollbackManager.listBackups();
            rollbackManager.printBackupSummary(backups);
            return;
        }
        await rollbackManager.rollback(options.timestamp, !options.force);
    });
    command.command('validate [path]').description('Validate migration was successful').option('-v, --verbose', 'Show detailed validation results').action(async (projectPath = '.', options)=>{
        const { MigrationRunner } = await import('../../migration/migration-runner.js');
        const runner = new MigrationRunner({
            projectPath: path.resolve(projectPath),
            strategy: 'full'
        });
        const isValid = await runner.validate(options.verbose);
        process.exit(isValid ? 0 : 1);
    });
    command.command('status [path]').description('Show migration status and available backups').action(async (projectPath = '.')=>{
        await showMigrationStatus(path.resolve(projectPath));
    });
    return command;
}
async function analyzeProject(projectPath, options) {
    logger.info(`Analyzing project at ${projectPath}...`);
    const { MigrationAnalyzer } = await import('../../migration/migration-analyzer.js');
    const analyzer = new MigrationAnalyzer();
    const analysis = await analyzer.analyze(projectPath);
    if (options.output) {
        await analyzer.saveAnalysis(analysis, options.output);
        logger.success(`Analysis saved to ${options.output}`);
    }
    analyzer.printAnalysis(analysis, options.detailed || options.verbose);
}
async function runMigration(projectPath, options) {
    const { MigrationRunner } = await import('../../migration/migration-runner.js');
    const runner = new MigrationRunner({
        projectPath,
        strategy: options.strategy,
        backupDir: options.backup,
        force: options.force,
        dryRun: options.dryRun,
        preserveCustom: options.preserveCustom,
        skipValidation: options.skipValidation
    });
    const result = await runner.run();
    if (!result.success) {
        process.exit(1);
    }
}
async function showMigrationStatus(projectPath) {
    console.log(chalk.bold('\n📊 Migration Status'));
    console.log(chalk.gray('─'.repeat(50)));
    const { MigrationAnalyzer } = await import('../../migration/migration-analyzer.js');
    const analyzer = new MigrationAnalyzer();
    const analysis = await analyzer.analyze(projectPath);
    console.log(`\n${chalk.bold('Project:')} ${projectPath}`);
    console.log(`${chalk.bold('Status:')} ${analysis.hasOptimizedPrompts ? chalk.green('Migrated') : chalk.yellow('Not Migrated')}`);
    console.log(`${chalk.bold('Custom Commands:')} ${analysis.customCommands.length}`);
    console.log(`${chalk.bold('Conflicts:')} ${analysis.conflictingFiles.length}`);
    const { RollbackManager } = await import('../../migration/rollback-manager.js');
    const rollbackManager = new RollbackManager(projectPath);
    const backups = await rollbackManager.listBackups();
    console.log(`\n${chalk.bold('Backups Available:')} ${backups.length}`);
    if (backups.length > 0) {
        const latestBackup = backups[0];
        console.log(`${chalk.bold('Latest Backup:')} ${latestBackup.timestamp.toLocaleString()}`);
    }
    if (!analysis.hasOptimizedPrompts) {
        console.log(chalk.bold('\n💡 Recommendations:'));
        console.log('  • Run migration analysis: claude-flow migrate analyze');
        console.log('  • Start with dry run: claude-flow migrate --dry-run');
        console.log('  • Use selective strategy: claude-flow migrate --strategy selective');
    }
    console.log(chalk.gray('\n' + '─'.repeat(50)));
}

//# sourceMappingURL=migrate.js.map