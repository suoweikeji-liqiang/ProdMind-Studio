# ProdMind Studio CLI

Thin composition layer for orchestrating challenge, decision, and asset engines.

## Commands

### Initialize Project
```bash
prodmind-studio init [path]
```

### Run Challenge Round
```bash
prodmind-studio challenge "Build a task management app" [path]
```

### Run Decision Analysis
```bash
prodmind-studio decision "Choose between React and Vue" [path]
```

### Export Assets
```bash
prodmind-studio export [projectPath] [outputPath]
```

### Run Full Workflow
```bash
prodmind-studio workflow "Build a task management app" [path]
```

## Architecture

CLI is a **pure composition layer**:
- Calls engine APIs in sequence
- Handles I/O (read input, write output)
- Reports errors to user
- Does NOT contain business logic

See [docs/phase4a-cli-boundary.md](../../docs/phase4a-cli-boundary.md) for boundary definition.
