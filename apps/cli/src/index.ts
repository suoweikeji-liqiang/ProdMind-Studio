#!/usr/bin/env node

import { initProject, runChallenge, runDecision, exportAssets, runWorkflow, listHistory, showHistory } from './commands.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'init': {
        const projectPath = args[1] || './prodmind-project';
        await initProject(projectPath);
        break;
      }
      case 'challenge': {
        const idea = args[1];
        const projectPath = args[2] || './prodmind-project';
        if (!idea) {
          console.error('Usage: prodmind-studio challenge <idea> [projectPath]');
          process.exit(1);
        }
        await runChallenge(idea, projectPath);
        break;
      }
      case 'decision': {
        const problem = args[1];
        const projectPath = args[2] || './prodmind-project';
        if (!problem) {
          console.error('Usage: prodmind-studio decision <problem> [projectPath]');
          process.exit(1);
        }
        await runDecision(problem, projectPath);
        break;
      }
      case 'export': {
        const projectPath = args[1] || './prodmind-project';
        const outputPath = args[2] || './output';
        await exportAssets(projectPath, outputPath);
        break;
      }
      case 'workflow': {
        const idea = args[1];
        const projectPath = args[2] || './prodmind-project';
        if (!idea) {
          console.error('Usage: prodmind-studio workflow <idea> [projectPath]');
          process.exit(1);
        }
        await runWorkflow(idea, projectPath);
        break;
      }
      case 'history': {
        const subcommand = args[1];
        const projectPath = args[3] || args[2] || './prodmind-project';
        if (subcommand === 'list') {
          await listHistory(projectPath);
        } else if (subcommand === 'show') {
          const runId = args[2];
          if (!runId) {
            console.error('Usage: prodmind-studio history show <runId> [projectPath]');
            process.exit(1);
          }
          await showHistory(projectPath, runId);
        } else {
          console.error('Usage: prodmind-studio history <list|show> [runId] [projectPath]');
          process.exit(1);
        }
        break;
      }
      default:
        console.log('ProdMind Studio CLI');
        console.log('');
        console.log('Commands:');
        console.log('  init [path]                    Initialize project');
        console.log('  challenge <idea> [path]        Run challenge round');
        console.log('  decision <problem> [path]      Run decision analysis');
        console.log('  export [path] [output]         Export assets');
        console.log('  workflow <idea> [path]         Run full workflow');
        console.log('  history list [path]            List workflow history');
        console.log('  history show <runId> [path]    Show workflow details');
        break;
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
