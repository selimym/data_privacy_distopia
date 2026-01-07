# Game Design: Realistic Data Breach & Domain Unlock System

**Date:** January 7, 2026
**Status:** Planning Phase
**Purpose:** Design realistic, educational data breach mechanics that mirror real-world privacy violations

---

## Executive Summary

Players must actively choose to breach organizations to unlock data domains. Each domain is protected by realistic security measures at real-world organizations. The system teaches:
- How data breaches actually happen
- Why different organizations have different security levels
- The cascade effect of combining breached data sources
- The moral weight of each privacy violation

---

## Domain-to-Organization Mapping

### 🏥 Health Domain
**Organizations:**
1. **General Hospital** (Large, medium security)
   - Contains: Full medical records, prescriptions, visit history
   - Security: HIPAA compliance, but overworked IT staff
   - Realistic vulnerabilities: Unpatched EMR systems, phishing-susceptible staff

2. **Community Clinic** (Small, low security)
   - Contains: Limited recent visit data
   - Security: Minimal - small budget, outdated systems
   - Realistic vulnerabilities: Weak passwords, no 2FA, physical access

3. **Pharmacy Chain** (Corporate, medium-high security)
   - Contains: Prescription history, insurance data
   - Security: Corporate IT, but many locations
   - Realistic vulnerabilities: Point-of-sale systems, insider access

4. **Insurance Company** (Corporate, high security)
   - Contains: Claims history, pre-existing conditions
   - Security: Well-funded IT, compliance audits
   - Realistic vulnerabilities: Third-party integrations, social engineering

**Unlock Methods:**
- **Easy**: Phishing attack on clinic staff → credentials
- **Medium**: Exploit unpatched hospital EMR system
- **Hard**: Social engineer insurance company employee
- **Very Hard**: Insider threat (bribe hospital employee with access)

---

### 💰 Finance Domain
**Organizations:**
1. **Local Credit Union** (Small, medium security)
   - Contains: Checking/savings accounts, small loans
   - Security: Limited IT department
   - Realistic vulnerabilities: Outdated core banking software

2. **Major Bank** (Large, very high security)
   - Contains: Complete banking history, investments
   - Security: Military-grade, extensive monitoring
   - Realistic vulnerabilities: Third-party vendor access, mobile app bugs

3. **Credit Bureau** (Data Broker, high security)
   - Contains: Credit scores, debt history, full financial profile
   - Security: High-value target, strong defenses
   - Realistic vulnerabilities: API vulnerabilities (Equifax-style), insider threats

4. **Payment Processor** (Tech Company, high security)
   - Contains: Transaction history across merchants
   - Security: PCI-DSS compliance, bug bounty program
   - Realistic vulnerabilities: Merchant integration weaknesses

**Unlock Methods:**
- **Easy**: Buy stolen credentials on dark web (data broker)
- **Medium**: SQL injection on credit union's online banking
- **Hard**: Exploit zero-day in payment processor API
- **Very Hard**: Compromise bank through third-party vendor
- **Realistic Alternative**: Get hired at credit bureau (insider access)

---

### ⚖️ Judicial Domain
**Organizations:**
1. **Town Hall / Court Clerk** (Government, low-medium security)
   - Contains: Public court records, some sealed cases
   - Security: Understaffed, legacy systems
   - Realistic vulnerabilities: Physical document theft, bribeable clerks

2. **Police Department** (Government, medium security)
   - Contains: Arrest records, ongoing investigations
   - Security: Sensitive but often outdated tech
   - Realistic vulnerabilities: Shared terminals, weak access controls

3. **State Corrections Database** (Government, medium-high security)
   - Contains: Incarceration history, parole status
   - Security: Centralized, some investment in security
   - Realistic vulnerabilities: Legacy systems, remote access exploits

4. **FBI / Federal Court System** (Federal, very high security)
   - Contains: Federal cases, sealed indictments
   - Security: Extensive, but huge attack surface
   - Realistic vulnerabilities: Nation-state level attacks only

**Unlock Methods:**
- **Easy**: Bribe court clerk for "public" records access
- **Medium**: Hack police department's case management system
- **Hard**: Exploit state corrections database
- **Very Hard**: Federal system breach (extremely rare)
- **Realistic Alternative**: FOIA request abuse + social engineering

---

### 📍 Location Domain
**Organizations:**
1. **Mobile Phone Carrier** (Telecom, medium-high security)
   - Contains: Cell tower triangulation, location history
   - Security: Corporate security, but customer service weak points
   - Realistic vulnerabilities: Social engineering customer service, SS7 exploits

2. **GPS/Mapping Service** (Tech Company, high security)
   - Contains: Detailed location history, places visited
   - Security: Tech giant defenses
   - Realistic vulnerabilities: Account takeover, API abuse

3. **Data Broker / Location Aggregator** (Commercial, medium security)
   - Contains: Aggregated location data from apps
   - Security: Varies, often questionable
   - Realistic vulnerabilities: Often just purchase access legally

4. **Smart Home / IoT Provider** (Tech Company, low-medium security)
   - Contains: Home/away patterns, routine detection
   - Security: Notoriously weak IoT security
   - Realistic vulnerabilities: Default passwords, unencrypted communication

5. **Parking Authority / Traffic Cameras** (Government, low security)
   - Contains: License plate tracking, parking patterns
   - Security: Minimal investment
   - Realistic vulnerabilities: Unsecured databases, no encryption

**Unlock Methods:**
- **Easy**: Purchase from data broker (legal but creepy)
- **Medium**: Compromise IoT devices, parking database
- **Hard**: SS7 exploit against phone carrier
- **Very Hard**: Breach major mapping service
- **Very Easy (unethical)**: Install stalkerware on target's phone

---

### 👥 Social Media Domain
**Organizations:**
1. **Major Social Network** (Tech Giant, high security)
   - Contains: Posts, messages, connections, deleted content
   - Security: Significant investment, but huge attack surface
   - Realistic vulnerabilities: Scraping bots, API abuse, credential stuffing

2. **Messaging App** (Tech Company, varies by encryption)
   - Contains: Private messages, groups, contacts
   - Security: E2E encrypted apps = very high, others = medium
   - Realistic vulnerabilities: Endpoint compromise, cloud backup access

3. **Data Broker / Social Analytics** (Commercial, low-medium security)
   - Contains: Public profile scrapes, engagement data
   - Security: Often minimal
   - Realistic vulnerabilities: Often just purchase access

4. **Dating App** (Tech Startup, low-medium security)
   - Contains: Very personal preferences, location, messages
   - Security: Startup budget = limited security
   - Realistic vulnerabilities: API vulnerabilities, database exposures

**Unlock Methods:**
- **Very Easy**: Scrape public profiles (legal, limited data)
- **Easy**: Buy scraped data from broker
- **Medium**: Credential stuffing attack (compromised passwords)
- **Hard**: Exploit API vulnerability for private data
- **Very Hard**: Breach E2E encrypted messaging (essentially impossible without endpoint)
- **Realistic Alternative**: Spyware on device, cloud backup access

---

## Difficulty Tier System

### Tier 1: "Script Kiddie" (Easy)
**Requirements:** Basic computer literacy
**Time:** 5-10 minutes in-game
**Cost:** Low ($100-$500)
**Detection Risk:** Low

**Methods:**
- Buy stolen data from dark web marketplace
- Use pre-built phishing kits
- Exploit known vulnerabilities with automated tools
- Social engineering low-level employees
- Purchase "legal" data from brokers

**Organizations:**
- Community clinics
- Data brokers
- Parking authorities
- Public social media scraping

**Educational Value:**
- Shows how easy some breaches are
- Demonstrates data broker economy
- Reveals that "legal" data access exists

---

### Tier 2: "Skilled Amateur" (Medium)
**Requirements:** Programming knowledge, networking basics
**Time:** 20-30 minutes in-game
**Cost:** Medium ($1,000-$5,000)
**Detection Risk:** Medium

**Methods:**
- SQL injection attacks
- Phishing campaigns targeting specific organizations
- Exploiting unpatched systems
- Bribery of mid-level employees
- Physical security bypass (tailgating, dumpster diving)

**Organizations:**
- General hospitals
- Local credit unions
- Police departments
- Phone carriers (social engineering)
- Dating apps

**Educational Value:**
- Common real-world attack vectors
- Importance of patching
- Human factor in security
- Physical security matters

---

### Tier 3: "Professional Hacker" (Hard)
**Requirements:** Advanced programming, system administration, social engineering
**Time:** 45-60 minutes in-game
**Cost:** High ($10,000-$50,000)
**Detection Risk:** High

**Methods:**
- Zero-day exploits
- Advanced persistent threat (APT) techniques
- Insider recruitment
- Supply chain attacks
- Sophisticated social engineering campaigns

**Organizations:**
- Major banks
- Credit bureaus
- State corrections databases
- Major social networks
- Pharmacy chains

**Educational Value:**
- Advanced attack techniques
- Why breaches aren't always detected immediately
- Value of insider threats
- Supply chain vulnerabilities

---

### Tier 4: "Nation-State Level" (Very Hard)
**Requirements:** Team coordination, custom exploits, significant resources
**Time:** 90+ minutes in-game (or impossible)
**Cost:** Very High ($100,000+)
**Detection Risk:** Very High

**Methods:**
- Custom malware development
- Hardware implants
- Compromising cryptographic systems
- Long-term insider cultivation
- Sophisticated social engineering + technical exploits

**Organizations:**
- Federal systems
- Tech giants (full breach)
- E2E encrypted messaging services
- Major payment processors

**Educational Value:**
- Some systems ARE secure
- Why encryption matters
- Difference between targeted and mass surveillance
- Nation-state capabilities

---

## Building Implementation Plan

### Phase 1: Foundation (Current Sprint)
**Goal:** Implement advanced cross-domain inference system

**Tasks:**
1. ✅ Create comprehensive inference rule database
2. ✅ Build advanced inference engine
3. ✅ Update frontend to display complex inferences
4. ✅ Add victim impact statements
5. ✅ Track which inferences become available with each domain

**Files to Create/Modify:**
- `/backend/src/datafusion/models/inference.py` - InferenceRule model
- `/backend/src/datafusion/services/advanced_inference_engine.py` - Inference logic
- `/backend/src/datafusion/api/inferences.py` - Update API endpoints
- `/frontend/src/ui/DataPanel.ts` - Enhanced inference display

**Estimated Time:** 1-2 weeks

---

### Phase 2: Building System Architecture (Next Sprint)
**Goal:** Create building entities and basic interaction system

**Tasks:**
1. **Database Schema:**
   ```python
   class Building:
       id: UUID
       building_type: BuildingType  # HOSPITAL, BANK, POLICE_DEPT, etc.
       name: str
       map_x: int
       map_y: int
       security_level: int  # 1-5
       domains_available: list[DomainType]
       is_breached: bool
       breach_difficulty: BreachDifficulty

   class BreachAttempt:
       id: UUID
       building_id: UUID
       player_id: UUID  # For multiplayer or tracking
       method: BreachMethod
       timestamp: datetime
       success: bool
       detection_risk_realized: bool
       domains_unlocked: list[DomainType]

   class UnlockProgress:
       player_id: UUID
       domain: DomainType
       is_unlocked: bool
       unlocked_via: str  # Building name
       unlocked_at: datetime
       method_used: BreachMethod
   ```

2. **Building Generator:**
   - Create realistic building distribution
   - Map buildings to appropriate locations
   - Generate security profiles

3. **Basic UI:**
   - Building sprites on map
   - Interaction prompt ("Press E to interact")
   - Building info panel (name, type, security level)

**Files to Create:**
- `/backend/src/datafusion/models/building.py`
- `/backend/src/datafusion/models/breach.py`
- `/backend/src/datafusion/generators/buildings.py`
- `/backend/src/datafusion/api/buildings.py`
- `/frontend/src/scenes/WorldScene.ts` - Update with buildings
- `/frontend/src/ui/BuildingPanel.ts`

**Estimated Time:** 2-3 weeks

---

### Phase 3: Breach Mechanics (Sprint 3)
**Goal:** Implement breach minigames and security systems

**Tasks:**
1. **Breach Minigames:**
   - **Phishing Simulation:** Craft convincing emails
   - **SQL Injection Puzzle:** Construct valid SQL payloads
   - **Social Engineering:** Dialogue choices with employees
   - **Lock Picking:** Physical security bypass
   - **Password Cracking:** Brute force simulation
   - **Network Exploitation:** Port scanning and vulnerability identification

2. **Security Systems:**
   - Detection probability calculation
   - Alarm triggers
   - Consequences of detection
   - Security improvement over time

3. **Cost System:**
   - Currency/resources for breach attempts
   - Tool purchases (phishing kits, exploit code, etc.)
   - Bribery costs

**Files to Create:**
- `/backend/src/datafusion/services/breach_engine.py`
- `/frontend/src/ui/BreachMinigames/`
  - `PhishingGame.ts`
  - `SQLInjectionGame.ts`
  - `SocialEngineeringDialogue.ts`
  - `NetworkExploitGame.ts`
- `/frontend/src/ui/SecurityAlertPanel.ts`

**Estimated Time:** 4-6 weeks (complex minigames)

---

### Phase 4: Economic & Progression System (Sprint 4)
**Goal:** Add resource management and character progression

**Tasks:**
1. **Resource System:**
   - Currency (from selling data, doing "jobs")
   - Tools/exploits inventory
   - Reputation (affects prices, availability)

2. **Progression:**
   - Skill levels (hacking, social engineering, physical)
   - Unlock new breach methods
   - Access to black market

3. **Data Monetization:**
   - Sell breached data
   - Accept contracts (target specific people)
   - Build your own data broker business

**Files to Create:**
- `/backend/src/datafusion/models/player.py`
- `/backend/src/datafusion/services/economy.py`
- `/frontend/src/ui/InventoryPanel.ts`
- `/frontend/src/ui/BlackMarketPanel.ts`

**Estimated Time:** 3-4 weeks

---

### Phase 5: Consequences & Endgames (Sprint 5)
**Goal:** Add detection, prosecution, and multiple endings

**Tasks:**
1. **Detection System:**
   - Cumulative risk tracking
   - Investigation progress
   - Evidence collection

2. **Law Enforcement:**
   - FBI investigation triggered at threshold
   - Raids and arrests
   - Court proceedings

3. **Multiple Endings:**
   - **Caught:** Prison ending (show victims' relief)
   - **Kingpin:** Build data empire (dystopian ending)
   - **Whistleblower:** Expose the system (redemption ending)
   - **Victim:** Get hacked yourself (irony ending)

4. **Victim Impact:**
   - Show real consequences of your actions
   - Victim statements for each serious breach
   - NPCs react to their data being exposed

**Files to Create:**
- `/backend/src/datafusion/services/detection_system.py`
- `/frontend/src/scenes/EndingScene.ts`
- `/frontend/src/ui/InvestigationPanel.ts`
- `/frontend/src/ui/VictimStoryModal.ts`

**Estimated Time:** 3-4 weeks

---

### Phase 6: Advanced Features (Future)
**Goal:** Polish and depth

**Tasks:**
1. **Dynamic Security:**
   - Organizations improve security after breaches
   - AI-driven defense systems
   - Security awareness training (harder phishing)

2. **Multiplayer Elements:**
   - Other hackers competing
   - Data marketplace
   - Cooperation or betrayal

3. **Realistic Timeline:**
   - Breaches take real-time (days/weeks)
   - Investigations unfold slowly
   - News coverage of major breaches

4. **Educational Mode:**
   - Pause and explain concepts
   - Links to resources
   - Privacy tools recommendations
   - "Here's how to protect yourself"

**Estimated Time:** Ongoing

---

## Realistic Attack Vectors by Organization

### Hospital Breach (Medium Difficulty)
**Real-World Inspiration:** Community Health Systems breach (2014), Anthem breach (2015)

**Attack Chain:**
1. **Reconnaissance:**
   - Identify hospital's EMR system (Epic, Cerner, etc.)
   - Find publicly exposed services (Shodan)
   - Research employees on LinkedIn

2. **Initial Access:**
   - **Option A:** Phishing email to doctor with fake prescription update
   - **Option B:** Exploit unpatched VPN (CVE database)
   - **Option C:** USB drop in parking lot (physical)

3. **Privilege Escalation:**
   - Stolen credentials from phishing
   - Exploit local Windows vulnerabilities
   - Kerberoasting attack

4. **Data Exfiltration:**
   - Access EMR database
   - Export patient records
   - Cover tracks (log deletion)

**Minigame:** Craft phishing email that passes spam filters and looks legitimate

**Detection Risk Factors:**
- Email clicked by security-aware staff: +20%
- Suspicious database queries: +15%
- Large data transfer: +30%
- Off-hours access: +10%

**Consequences if Caught:**
- HIPAA violation investigation
- Hospital improves security
- Higher difficulty for future attempts

---

### Bank Breach (Hard Difficulty)
**Real-World Inspiration:** Bangladesh Bank heist (2016), JPMorgan Chase breach (2014)

**Attack Chain:**
1. **Reconnaissance:**
   - Identify third-party vendors
   - Find contractor with bank access
   - Social media research on bank employees

2. **Initial Access:**
   - **Option A:** Compromise vendor with weaker security
   - **Option B:** Watering hole attack (compromise site bank employees visit)
   - **Option C:** Social engineering wire transfer department

3. **Lateral Movement:**
   - Move from vendor network to bank network
   - Escalate privileges
   - Disable security monitoring

4. **Data Access:**
   - Locate core banking database
   - Extract account information
   - Attempt unauthorized transfers (very risky)

**Minigame:** Multi-stage social engineering (convince employee to run "security check")

**Detection Risk Factors:**
- Anomalous vendor access patterns: +25%
- Failed privilege escalation: +40%
- Unusual database queries: +35%
- Wire transfer threshold exceeded: +90%

**Consequences if Caught:**
- Federal investigation (FBI)
- Massive news coverage
- Prison time
- Banks collaborate to improve security

---

### Social Media Breach (Variable Difficulty)

#### Public Scraping (Very Easy)
**Real-World Inspiration:** Cambridge Analytica, various researcher scraping

**Method:**
- Automated bot scraping public profiles
- API abuse within rate limits
- Purchased access from data brokers

**Minigame:** Configure scraping parameters (avoid detection)

**Detection Risk:** Very Low (often legal, just against ToS)

#### Private Data Access (Very Hard)
**Real-World Inspiration:** Facebook data breaches, Twitter breach (2022)

**Attack Chain:**
1. **Option A:** Find and exploit API vulnerability
2. **Option B:** Credential stuffing with leaked password database
3. **Option C:** Social engineering customer support
4. **Option D:** Insider threat (bribe employee)

**Minigame:** API fuzzing to find undocumented endpoints

**Detection Risk Factors:**
- API rate limit exceeded: +30%
- Abnormal access patterns: +40%
- Customer support flags suspicious request: +50%

---

### Data Broker Purchase (Legal but Creepy)
**Real-World Inspiration:** Acxiom, Epsilon, LexisNexis

**Method:**
- Create fake business
- Purchase "marketing data"
- No hacking required

**Minigame:** None (just fill out form and pay)

**Detection Risk:** None (legal)

**Educational Point:** Shows how much data is legally available for purchase

**Cost:** $50-$5,000 depending on data detail

---

## Security Mechanics

### Dynamic Difficulty
Organizations respond to breaches:

1. **After First Breach:**
   - Security audit initiated
   - Patch systems
   - +10% detection chance

2. **After Multiple Breaches:**
   - Hire security firm
   - Implement 2FA
   - +25% detection chance
   - Some methods become unavailable

3. **After Major Breach:**
   - Complete security overhaul
   - +50% detection chance
   - Need advanced techniques

### Detection Consequences

**Low Detection (0-25%):**
- Warning message
- Organization becomes suspicious
- Need to lay low for in-game time

**Medium Detection (26-50%):**
- Internal investigation
- Employee interrogations
- Some access points closed

**High Detection (51-75%):**
- External security firm hired
- Law enforcement notified
- Active search for perpetrator

**Caught (76-100%):**
- FBI raid
- Arrest and prosecution
- Game over or prison escape scenario

---

## UI/UX Design

### Building Interaction Flow

1. **Approach Building:**
   ```
   [Building Icon on Map]
   Player walks near → Interaction prompt appears
   "Press E to interact with General Hospital"
   ```

2. **Building Info Panel:**
   ```
   ┌──────────────────────────────────────┐
   │ 🏥 General Hospital                  │
   │ ──────────────────────────────────   │
   │ Security Level: ⚠️⚠️⚠️ Medium       │
   │ Domains Available:                   │
   │   • Health Records (All NPCs)        │
   │                                      │
   │ Status: Not Breached                 │
   │                                      │
   │ [Attempt Breach]  [Reconnaissance]   │
   └──────────────────────────────────────┘
   ```

3. **Breach Method Selection:**
   ```
   ┌──────────────────────────────────────┐
   │ Select Breach Method                 │
   │ ──────────────────────────────────   │
   │ 🎣 Phishing Attack                   │
   │    Success: 65% | Detection: 30%    │
   │    Cost: $500 | Time: 10 min        │
   │                                      │
   │ 🔓 Exploit Vulnerability             │
   │    Success: 45% | Detection: 50%    │
   │    Cost: $2,000 | Time: 30 min      │
   │                                      │
   │ 💰 Bribe Employee                    │
   │    Success: 80% | Detection: 20%    │
   │    Cost: $5,000 | Time: 5 min       │
   │                                      │
   │ [Cancel]                             │
   └──────────────────────────────────────┘
   ```

4. **Minigame Screen:**
   - Depends on method chosen
   - Success/failure affects detection risk
   - Better performance = lower detection

5. **Results Screen:**
   ```
   ┌──────────────────────────────────────┐
   │ ✅ Breach Successful!                │
   │ ──────────────────────────────────   │
   │ Domains Unlocked:                    │
   │   🏥 Health Records (All NPCs)       │
   │                                      │
   │ Detection Risk: 23%                  │
   │ Status: Undetected                   │
   │                                      │
   │ New Inferences Available:            │
   │   • 12 new cross-domain insights     │
   │   • 3 high-severity findings         │
   │                                      │
   │ ⚠️ Warning: Further breaches will    │
   │    increase detection risk           │
   │                                      │
   │ [View New Inferences]  [Close]       │
   └──────────────────────────────────────┘
   ```

### Moral Weight Indicators

After each breach, show impact:

```
┌────────────────────────────────────────────┐
│ Breach Impact Summary                      │
│ ────────────────────────────────────────   │
│ NPCs Affected: 50 people                   │
│                                            │
│ Private Information Exposed:               │
│   • 32 people with chronic conditions      │
│   • 8 people with mental health treatment  │
│   • 5 people with substance abuse history  │
│   • 12 people with sensitive diagnoses     │
│                                            │
│ "I thought my medical records were         │
│  private. Now I'm terrified someone will   │
│  find out about my HIV status."            │
│  - Anonymous victim                        │
│                                            │
│ [I understand the consequences]            │
└────────────────────────────────────────────┘
```

---

## Educational Overlays

### Optional Tutorial Mode

At each phase, offer "Learn More" button:

**Example - After Phishing Success:**
```
┌────────────────────────────────────────────┐
│ 📚 How Phishing Works                      │
│ ────────────────────────────────────────   │
│ You just used a phishing attack - one of   │
│ the most common breach methods.            │
│                                            │
│ Real-World Statistics:                     │
│ • 91% of cyberattacks start with phishing  │
│ • $1.8B lost to phishing scams in 2020    │
│ • Takes 82 seconds on average to respond   │
│                                            │
│ How to Protect Yourself:                   │
│ ✓ Check sender email carefully             │
│ ✓ Hover over links before clicking         │
│ ✓ Enable 2FA on all accounts               │
│ ✓ Report suspicious emails                 │
│                                            │
│ [Read More]  [Continue Game]               │
└────────────────────────────────────────────┘
```

---

## Technical Implementation Checklist

### Backend Requirements
- [ ] Building model and database table
- [ ] BreachAttempt tracking model
- [ ] UnlockProgress model
- [ ] Building generator (placement, security levels)
- [ ] Breach engine (success calculation, detection)
- [ ] Domain unlock API endpoint
- [ ] Building interaction API endpoints
- [ ] Advanced inference engine (Phase 1 priority)

### Frontend Requirements
- [ ] Building sprites and assets
- [ ] Building interaction system
- [ ] BuildingPanel UI component
- [ ] Breach method selection UI
- [ ] Minigame implementations (5-7 different games)
- [ ] Results/impact display
- [ ] Domain unlock notification
- [ ] Detection risk indicator
- [ ] Educational overlay system

### Game Design Requirements
- [ ] Balance detection risks
- [ ] Cost/benefit analysis for each method
- [ ] Progression curve (unlock advanced methods)
- [ ] Moral impact messaging
- [ ] Victim statement writing (30-50 unique statements)
- [ ] Multiple ending scenarios

---

## Success Metrics

### Educational Effectiveness
- Players understand how data breaches happen
- Players recognize real-world attack vectors
- Players learn protective measures
- Players feel moral weight of privacy violations

### Gameplay Engagement
- Meaningful choices (not just grind)
- Risk/reward balance feels fair
- Progression feels earned
- Each domain unlock feels significant

### Realism
- Attack methods match real-world techniques
- Security measures reflect actual practices
- Consequences are realistic
- Organizations behave as they do in reality

---

## Future Expansion Ideas

### Procedural Generation
- Random building security levels each playthrough
- Different exploits available based on "year"
- Current events affect difficulty (e.g., post-major-breach = harder)

### Multiplayer Elements
- Compete for same targets
- Share/trade exploits
- Betray each other for rewards
- Cooperative breaches (one distracts, one hacks)

### News System
- Your breaches make news (if big enough)
- Victim impact stories
- Security improvements announced
- Public opinion shifts

### Moral Choice System
- Use data to help people vs. exploit them
- Whistleblower path (expose corruption)
- Vigilante path (hack bad actors)
- Villain path (data empire)

### Real-World Events
- Base scenarios on famous breaches
- "This happened for real" notifications
- Link to actual news articles
- Timeline of major privacy violations

---

## Implementation Priority

### Must Have (Phase 1-2)
1. Advanced inference system ✓ (Current sprint)
2. Building system (5 key buildings)
3. Basic breach mechanics (2-3 methods per building)
4. Domain unlock functionality
5. Detection risk system

### Should Have (Phase 3-4)
1. All minigames (7 total)
2. Economic system
3. Progression/skill system
4. Multiple breach methods (4-5 per building)
5. Dynamic security responses

### Nice to Have (Phase 5-6)
1. Multiple endings
2. Advanced detection system
3. News/reputation system
4. Educational overlays
5. Victim impact stories

### Future Dreams
1. Multiplayer
2. Procedural generation
3. Real-world event integration
4. Modding support
5. Mobile version

---

## Development Roadmap

**Current Phase:** Foundation & Inference System
**Next Phase:** Building Architecture (2-3 weeks)
**Total Estimated Time to MVP:** 3-4 months
**Full Feature Complete:** 6-9 months

---

## Notes for Implementation

### Key Design Principles
1. **Realism First:** Every mechanic should mirror real-world practices
2. **Educational Value:** Players should learn practical privacy concepts
3. **Moral Weight:** Players should feel consequences of their actions
4. **Meaningful Choices:** Each decision should matter
5. **No Glorification:** Show hacking accurately, not Hollywood-style

### Balancing Difficulty
- Easy breaches should feel too easy (data broker purchases)
- Medium breaches should require thought
- Hard breaches should require multiple attempts
- Very hard breaches should feel nearly impossible

### Avoiding Becoming a "Hacking Tutorial"
- Abstract away specific exploit code
- Focus on concepts, not exact commands
- Minigames simulate process, not exact techniques
- Add disclaimers about illegality
- Emphasize defensive lessons

---

**Last Updated:** January 7, 2026
**Next Review:** After Phase 1 completion
**Document Owner:** Game Design Team
