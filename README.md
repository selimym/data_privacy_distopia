# DataFusion World

An educational game demonstrating data privacy risks through role-playing as actors who abuse data access.

## Overview

DataFusion World is an interactive experience where players take on the role of a rogue hospital employee with access to medical records. Through gameplay, players discover how seemingly innocuous data access can enable stalking, discrimination, and real harm to individuals.

The game demonstrates the dangers of data fusion - where combining multiple data sources reveals information far more sensitive than any single source alone.

## Architecture

- **Backend**: Python/FastAPI - All game logic, data generation, and state management
- **Frontend**: Phaser 3/TypeScript - Display layer only, calls API for everything
- **Database**: SQLite (development), PostgreSQL (production)

## Project Structure

```
/backend    - FastAPI application and game logic
/frontend   - Phaser 3 game client
/assets     - Shared game assets (maps, tilesets, sprites)
/docs       - Documentation
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- pnpm
- uv (Python package manager)

### Development

Run both backend and frontend:
```bash
make dev
```

Run individually:
```bash
make dev-backend
make dev-frontend
```

Generate test data:
```bash
make generate-data
```

Run tests:
```bash
make test
```

## Educational Purpose

This project is designed to raise awareness about data privacy issues. While players act as the "bad actor," the goal is to demonstrate why strong privacy protections, access controls, and regulatory oversight are essential in handling sensitive data.

## License

MIT License - See LICENSE file for details
