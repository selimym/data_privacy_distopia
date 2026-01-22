# Data Generators

TypeScript data generators for the Data Privacy Dystopia game. These generators create realistic synthetic citizen data for the System Mode gameplay.

## Features

- **Deterministic Generation**: Use seeds for reproducible data
- **Realistic Data**: Uses @faker-js/faker for realistic names, addresses, dates, etc.
- **Reference Data**: Loads JSON reference data for realistic medical conditions, financial institutions, etc.
- **Complete Citizen Profiles**: Generates data across all domains (health, finance, judicial, location, social, messages)
- **System Mode Support**: Includes operator, directives, neighborhoods, and news channels

## Installation

The generators use `@faker-js/faker` which should already be installed:

```bash
npm install --save @faker-js/faker
```

## Usage

### Basic Usage

```typescript
import { loadAllReferenceData, generateFullPopulation } from './generators';

// Load reference data (JSON files) before generating
await loadAllReferenceData();

// Generate a population of 50 citizens with a seed for reproducibility
const population = await generateFullPopulation(50, 12345);

console.log(`Generated ${population.citizens.length} citizens`);
console.log(`Operator: ${population.operator.name}`);
console.log(`Directives: ${population.directives.length}`);
```

### Generate a Single Citizen

```typescript
import { loadAllReferenceData, generateCitizen } from './generators';

await loadAllReferenceData();

const citizen = generateCitizen('citizen-001', 54321);
console.log(`${citizen.identity.first_name} ${citizen.identity.last_name}`);
console.log(`Health conditions: ${citizen.health.conditions.length}`);
console.log(`Messages: ${citizen.messages.messages.length}`);
```

### Use Individual Generators

```typescript
import {
  loadHealthReference,
  generateHealthRecord,
  loadFinanceReference,
  generateFinanceRecord,
} from './generators';

// Load reference data for specific domains
await loadHealthReference();
await loadFinanceReference();

// Generate domain-specific records
const healthRecord = generateHealthRecord('npc-123', 99999);
const financeRecord = generateFinanceRecord('npc-123', 99999);
```

### Save/Load to LocalStorage

```typescript
import {
  loadAllReferenceData,
  generateFullPopulation,
  savePopulationToLocalStorage,
  loadPopulationFromLocalStorage,
  hasPopulationInLocalStorage,
} from './generators';

// Generate and save
await loadAllReferenceData();
const population = await generateFullPopulation(50, 12345);
savePopulationToLocalStorage(population);

// Later, load from storage
if (hasPopulationInLocalStorage()) {
  const savedPopulation = loadPopulationFromLocalStorage();
  console.log('Loaded population from storage');
}
```

## Generators

### Identity Generator (`identity.ts`)
Generates basic NPC identity:
- Name, SSN, date of birth
- Address (street, city, state, zip)
- Role (citizen, government official, data analyst)
- Sprite key and map position (x, y)

### Health Generator (`health.ts`)
Generates health records:
- Insurance provider and primary care physician
- Medical conditions (common and sensitive)
- Medications with dosages
- Visit history with reasons and dates

### Finance Generator (`finance.ts`)
Generates financial records:
- Employment status and income
- Credit score
- Bank accounts (checking, savings, credit cards, investments)
- Debts (mortgage, auto loan, student loan, etc.)
- Transaction history (90 days)

### Judicial Generator (`judicial.ts`)
Generates judicial records:
- Criminal records with charges, convictions, sentences
- Civil cases (contract disputes, divorce, custody, etc.)
- Traffic violations with fines and points

### Location Generator (`location.ts`)
Generates location tracking data:
- Inferred locations (home, workplace, romantic interest, family, medical facilities)
- Visit patterns (days, arrival/departure times, frequency)
- Privacy implications and confidence scores

### Social Generator (`social.ts`)
Generates social media data:
- Public profile information
- Public inferences (political views, religious beliefs, lifestyle)
- Private inferences (intimate content, personal crises, harassment)
- Encryption status explanation

### Messages Generator (`messages.ts`)
Generates private messages:
- Message content (mundane, venting, organizing, work complaints, mental health, financial stress)
- Message flagging based on keywords
- Sentiment analysis (-1 to 1)
- Surveillance detection and flag reasons

### System Seed (`system-seed.ts`)
Provides system mode initialization:
- Neighborhoods (8 districts with boundaries)
- News channels (5 channels with stances and reporters)
- Operator data (name, clearance level, shift times)
- Directives (active objectives for the operator)
- Initial metrics (flags, compliance, efficiency)

## Reference Data

The generators load reference data from JSON files in `/data/reference/`:

- `health.json` - Medical conditions, medications, visit reasons, insurance providers
- `finance.json` - Employers, banks, creditors, merchants
- `judicial.json` - Criminal charges, civil case descriptions, traffic violations
- `social.json` - Public and private inference templates

## Data Structure

### PopulationData
```typescript
{
  citizens: CitizenData[];      // Array of complete citizen profiles
  operator: OperatorData;        // System mode operator
  directives: DirectiveData[];   // Active directives
  metrics: OperatorMetricsData;  // Operator performance metrics
  neighborhoods: NeighborhoodData[]; // Map neighborhoods
  newsChannels: NewsChannelData[];   // News outlets
  seed: number;                  // Generation seed
  generatedAt: string;           // ISO timestamp
}
```

### CitizenData
```typescript
{
  identity: IdentityData;
  health: HealthRecordData;
  finance: FinanceRecordData;
  judicial: JudicialRecordData;
  location: LocationRecordData;
  social: SocialMediaRecordData;
  messages: MessageRecordData;
}
```

## Testing

Run the test script to verify generators work correctly:

```typescript
import { testGenerators } from './generators/test-generators';

await testGenerators();
```

## Performance

- Generating 50 citizens takes approximately 50-200ms
- Each citizen generates 20-50 messages
- Reference data is loaded once and cached
- Uses deterministic seeding for reproducible results

## Architecture: Fat Client

These generators support the fat client architecture where all game logic runs on the frontend:

1. **No Backend Dependency**: All data generation happens in the browser
2. **Offline Capability**: Game can run completely offline
3. **LocalStorage Persistence**: Save/load population data without a server
4. **Deterministic**: Same seed always generates same data

## Future Enhancements

- Add more diversity in generated data patterns
- Support for scenario-specific NPCs with custom data
- Risk scoring calculation in the generator
- Correlation detection between data domains
- More sophisticated message generation based on citizen profile

## License

Part of the Data Privacy Dystopia educational game project.
