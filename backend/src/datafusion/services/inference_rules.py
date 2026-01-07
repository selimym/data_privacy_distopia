"""
Cross-domain inference rules configuration.

All inference rules are defined here as Python data structures.
This keeps the game content in code for easy version control and iteration.
"""

from datafusion.models.inference import ContentRating, RuleCategory
from datafusion.schemas.domains import DomainType

# Type alias for rule definitions
InferenceRuleDefinition = dict

INFERENCE_RULES: list[InferenceRuleDefinition] = [
    # ==================== VULNERABILITY EXPLOITATION ====================
    {
        "rule_key": "financial_desperation",
        "name": "Financial Desperation Detection",
        "category": RuleCategory.VULNERABILITY_EXPLOITATION,
        "required_domains": [DomainType.HEALTH, DomainType.FINANCE],
        "scariness_level": 4,
        "content_rating": ContentRating.DISTURBING,
        "condition_function": "check_financial_desperation",
        "inference_template": (
            "This person is drowning in {medical_debt} of medical debt from {condition} "
            "while {employment}. Credit score has plummeted to {credit_score} with "
            "{debt_count} delinquent accounts. They're in a financially desperate state "
            "and highly vulnerable to exploitation."
        ),
        "evidence_templates": [
            "Medical bills totaling {medical_debt} in collections",
            "Chronic condition: {condition}",
            "Credit score dropped to {credit_score}",
            "{debt_count} delinquent debt accounts",
            "Employment: {employment}",
        ],
        "implications_templates": [
            "Could be targeted for predatory loans at 400%+ APR",
            "May accept dangerous or illegal job offers out of desperation",
            "High risk of bankruptcy, homelessness, or worse",
            "Family relationships under extreme financial stress",
            "Vulnerable to medical tourism scams",
        ],
        "educational_note": (
            "This inference demonstrates how combining medical and financial data creates "
            "a vulnerability profile. Predatory lenders, scam artists, and human traffickers "
            "specifically target people in these situations."
        ),
        "real_world_example": (
            "In 2021, data brokers sold lists of cancer patients to debt collection agencies "
            "and predatory lenders. The brokers knew these patients were financially vulnerable "
            "due to medical expenses and targeted them aggressively."
        ),
        "victim_statements": [
            {
                "text": (
                    "I had to choose between my cancer treatment and feeding my kids. "
                    "The debt collectors found me somehow and wouldn't stop calling, "
                    "even though I never told anyone about my diagnosis."
                ),
                "context": "Cancer survivor, age 38",
                "severity": 5,
            },
            {
                "text": (
                    "I thought medical records were private. How did the payday loan company "
                    "know about my condition? They called the day after my diagnosis."
                ),
                "context": "Chronic illness patient",
                "severity": 4,
            },
        ],
    },

    # ==================== REPRODUCTIVE PRIVACY ====================
    {
        "rule_key": "pregnancy_tracking",
        "name": "Reproductive Healthcare Tracking",
        "category": RuleCategory.REPRODUCTIVE_PRIVACY,
        "required_domains": [DomainType.HEALTH, DomainType.FINANCE, DomainType.LOCATION],
        "scariness_level": 5,
        "content_rating": ContentRating.DYSTOPIAN,
        "condition_function": "check_pregnancy_tracking",
        "inference_template": (
            "Medical and financial records show {visit_count} pregnancy-related appointments "
            "and {has_medications} prenatal medications, followed by travel to {clinic_location} "
            "(outside home state of {home_state}). This extremely private medical decision can "
            "be reconstructed from data exhaust across domains."
        ),
        "evidence_templates": [
            "{visit_count} OB/GYN visits documented",
            "Prenatal medication purchases: {has_medications}",
            "Travel to clinic in {clinic_location}",
            "Trip occurred outside home state ({home_state})",
            "Pattern consistent with out-of-state reproductive healthcare",
        ],
        "implications_templates": [
            "In restrictive states, could face criminal prosecution",
            "Could be targeted by activists on either side",
            "Risk of employer discrimination despite legal protections",
            "Family members could discover without consent",
            "Insurance could deny future coverage",
        ],
        "educational_note": (
            "The Dobbs decision made this type of surveillance extremely dangerous. Law enforcement "
            "in some states are requesting location data, search history, and medical records to "
            "investigate reproductive healthcare."
        ),
        "real_world_example": (
            "In 2022, Nebraska police used Facebook messages and search history to charge a mother "
            "and daughter for allegedly violating abortion laws. Meta (Facebook) complied with the "
            "warrant and provided private messages."
        ),
        "victim_statements": [
            {
                "text": (
                    "I traveled to another state for healthcare that's illegal in mine. "
                    "Now I'm terrified that my phone company, credit card, or GPS data "
                    "will be subpoenaed. This was my private medical decision."
                ),
                "context": "Anonymous, age 24",
                "severity": 5,
            },
            {
                "text": (
                    "My employer's insurance company denied a claim because they saw I traveled "
                    "out of state. They knew why without asking. My medical privacy meant nothing."
                ),
                "context": "Anonymous, age 31",
                "severity": 5,
            },
        ],
    },

    # ==================== MENTAL HEALTH ====================
    {
        "rule_key": "depression_suicide_risk",
        "name": "Severe Depression with Risk Indicators",
        "category": RuleCategory.MENTAL_HEALTH,
        "required_domains": [DomainType.HEALTH, DomainType.SOCIAL, DomainType.FINANCE],
        "scariness_level": 5,
        "content_rating": ContentRating.DISTURBING,
        "condition_function": "check_depression_suicide_risk",
        "inference_template": (
            "Medication records show {medication} prescription with {therapy_frequency} "
            "of therapy visits. Social media analysis reveals {social_indicators} concerning posts. "
            "Financial behavior shows {financial_indicators}. Historical patterns suggest "
            "{risk_level} risk indicators requiring immediate attention."
        ),
        "evidence_templates": [
            "Current medication: {medication}",
            "Therapy frequency: {therapy_frequency}",
            "{social_indicators} posts with concerning language patterns",
            "Financial indicators: {financial_indicators}",
            "Risk assessment: {risk_level}",
        ],
        "implications_templates": [
            "Insurance could deny coverage or raise rates",
            "Employer could discriminate if this leaks",
            "Could trigger involuntary commitment",
            "Gun purchase background check denial",
            "Security clearance could be revoked",
            "Requires immediate intervention and support resources",
        ],
        "educational_note": (
            "This is one of the most sensitive inferences - detecting mental health crisis from "
            "data fusion. While early intervention can save lives, the privacy violation and "
            "potential for discrimination is severe."
        ),
        "real_world_example": (
            "In 2019, Facebook filed a patent for detecting mental health conditions from user "
            "posts. Critics noted this could lead to insurance discrimination or involuntary "
            "intervention without consent."
        ),
        "victim_statements": [
            {
                "text": (
                    "I posted about feeling hopeless during my darkest moment. Now every ad I see "
                    "is for therapy or medication. My insurance premiums went up. They're watching "
                    "my mental state without helping."
                ),
                "context": "Anonymous, age 27",
                "severity": 4,
            },
            {
                "text": (
                    "My employer found out about my depression from somewhere. I lost the promotion "
                    "I'd been working towards for years. They said I wasn't 'stable' enough."
                ),
                "context": "Anonymous, age 35",
                "severity": 5,
            },
        ],
    },

    # ==================== RELATIONSHIP SURVEILLANCE ====================
    {
        "rule_key": "affair_detection",
        "name": "Extramarital Relationship Detection",
        "category": RuleCategory.RELATIONSHIP_SURVEILLANCE,
        "required_domains": [DomainType.LOCATION, DomainType.FINANCE],
        "scariness_level": 4,
        "content_rating": ContentRating.SERIOUS,
        "condition_function": "check_affair_detection",
        "inference_template": (
            "Location data reveals {visit_frequency} visits to {location_address} in {location_city}, "
            "followed by {hotel_count} hotel charges. Financial analysis shows {date_expense_count} "
            "restaurant and gift purchases totaling ${total_spent:.0f}. Pattern strongly suggests "
            "undisclosed relationship."
        ),
        "evidence_templates": [
            "Regular visits to {location_address}, {location_city} ({visit_frequency} times)",
            "{hotel_count} hotel charges near this location",
            "{date_expense_count} restaurant/gift purchases",
            "Total spending: ${total_spent:.0f}",
            "Pattern inconsistent with disclosed relationships",
        ],
        "implications_templates": [
            "Could be used as evidence in divorce proceedings",
            "Blackmail vulnerability if relationship is secret",
            "Security clearance risk for government employees",
            "Workplace policy violations if relationship involves coworker",
        ],
        "educational_note": (
            "This shows how location tracking combined with financial data can reveal intimate "
            "relationships. This same technique is used by private investigators, but also by "
            "stalkers and abusers."
        ),
        "real_world_example": (
            "Location data from fitness apps has been used in divorce cases as evidence of affairs. "
            "Strava's heat map feature inadvertently revealed the locations and routines of people "
            "having affairs."
        ),
        "victim_statements": [
            {
                "text": (
                    "My ex somehow got my location history and used it in court. Every place I went, "
                    "every person I saw - it was all there. I had no idea I was being tracked."
                ),
                "context": "Divorce proceeding, age 41",
                "severity": 4,
            },
        ],
    },

    {
        "rule_key": "domestic_violence",
        "name": "Domestic Violence Pattern Detection",
        "category": RuleCategory.RELATIONSHIP_SURVEILLANCE,
        "required_domains": [DomainType.HEALTH, DomainType.LOCATION],
        "scariness_level": 5,
        "content_rating": ContentRating.DISTURBING,
        "condition_function": "check_domestic_violence",
        "inference_template": (
            "Medical records show {injury_count} suspicious injuries ({injury_types}). "
            "Location data indicates {isolation_level} social isolation with {social_activity} "
            "activity patterns. Pattern strongly suggests domestic abuse situation requiring "
            "immediate intervention."
        ),
        "evidence_templates": [
            "{injury_count} ER visits for injuries: {injury_types}",
            "Social isolation level: {isolation_level}",
            "Social activity: {social_activity}",
            "Injury pattern consistent with domestic violence",
        ],
        "implications_templates": [
            "Victim requires immediate safety resources and support",
            "If abuser has data access, could increase danger",
            "Potential for escalation to lethal violence",
            "Children may also be at risk",
            "Legal protective orders may be needed",
        ],
        "educational_note": (
            "This is a case where data fusion could save lives through intervention, but the same "
            "data could be weaponized by the abuser if they gain access to it. Many abusers install "
            "stalkerware or monitor their victim's data."
        ),
        "real_world_example": (
            "Stalkerware apps marketed as 'parental control' or 'employee monitoring' are frequently "
            "used by abusers. A 2020 study found domestic violence victims' phones often had such "
            "spyware installed."
        ),
        "victim_statements": [
            {
                "text": (
                    "He installed tracking software on my phone. He knew everywhere I went, everyone "
                    "I talked to. I couldn't escape to a shelter without him knowing immediately."
                ),
                "context": "Domestic violence survivor, age 29",
                "severity": 5,
            },
        ],
    },

    # ==================== PREDICTIVE PROFILING ====================
    {
        "rule_key": "job_loss_prediction",
        "name": "Imminent Job Loss Prediction",
        "category": RuleCategory.PREDICTIVE_PROFILING,
        "required_domains": [DomainType.LOCATION, DomainType.FINANCE],
        "scariness_level": 3,
        "content_rating": ContentRating.SERIOUS,
        "condition_function": "check_job_loss_prediction",
        "inference_template": (
            "Location patterns show abrupt stop at {workplace_name}. Financial analysis reveals "
            "{prep_services} career preparation services. Financial status indicates {financial_status}. "
            "Behavioral pattern suggests {timeframe} employment change."
        ),
        "evidence_templates": [
            "Stopped visiting workplace: {workplace_name}",
            "{prep_services} resume/career service purchases",
            "Financial preparation: {financial_status}",
            "Timeline assessment: {timeframe}",
        ],
        "implications_templates": [
            "Lenders could deny credit applications",
            "Could affect background checks for new jobs",
            "Competitors could attempt poaching",
            "Could trigger insurance coverage issues",
        ],
        "educational_note": (
            "Predictive profiling like this is used by credit agencies and insurers to make decisions "
            "about you before events even happen. This can create self-fulfilling prophecies."
        ),
        "real_world_example": (
            "Credit card companies have been known to lower credit limits based on where you shop, "
            "who you associate with, and behavioral patterns that suggest financial instability - "
            "even before any actual financial problems occur."
        ),
        "victim_statements": [
            {
                "text": (
                    "I was preparing to change jobs and my credit card limit was suddenly slashed. "
                    "They somehow knew I was planning to leave before I even gave notice."
                ),
                "context": "Job seeker, age 33",
                "severity": 3,
            },
        ],
    },

    # ==================== FINANCIAL EXPLOITATION ====================
    {
        "rule_key": "gambling_addiction",
        "name": "Gambling Addiction Pattern",
        "category": RuleCategory.FINANCIAL_EXPLOITATION,
        "required_domains": [DomainType.FINANCE, DomainType.LOCATION],
        "scariness_level": 3,
        "content_rating": ContentRating.SERIOUS,
        "condition_function": "check_gambling_addiction",
        "inference_template": (
            "Transaction patterns reveal {transaction_count} gambling transactions totaling {total_gambled}. "
            "Location data shows {casino_visits} casino visits. Financial analysis reveals {debt_sources} "
            "loan sources with combined debt of {total_debt}. Social media shows {social_distortion} "
            "distorted perception of gambling success."
        ),
        "evidence_templates": [
            "{transaction_count} gambling transactions",
            "Total gambled: {total_gambled}",
            "{casino_visits} documented casino visits",
            "{debt_sources} different loan sources (chasing losses)",
            "Total debt: {total_debt}",
            "Social media distortion: {social_distortion}",
        ],
        "implications_templates": [
            "Could be denied credit or loans",
            "Family disclosure could damage relationships",
            "Self-exclusion programs could be triggered",
            "Target for predatory lending",
        ],
        "educational_note": (
            "Gambling addiction is a serious condition, but the way this data is collected and used "
            "focuses on exploitation rather than help. Casinos and lenders use this data to maximize "
            "their profits from addicted individuals."
        ),
        "real_world_example": (
            "Casinos use player tracking cards that monitor your gambling patterns in detail. This "
            "data is used to offer 'comps' that encourage continued gambling, especially when the "
            "system detects you're chasing losses."
        ),
        "victim_statements": [
            {
                "text": (
                    "The casino kept offering me free hotel rooms and meals right when I was trying "
                    "to quit. They knew exactly when I was most vulnerable."
                ),
                "context": "Recovering gambling addict, age 47",
                "severity": 4,
            },
        ],
    },

    {
        "rule_key": "elderly_cognitive_decline",
        "name": "Elderly Cognitive Decline Vulnerability",
        "category": RuleCategory.FINANCIAL_EXPLOITATION,
        "required_domains": [DomainType.HEALTH, DomainType.FINANCE],
        "scariness_level": 4,
        "content_rating": ContentRating.DISTURBING,
        "condition_function": "check_elderly_cognitive_decline",
        "inference_template": (
            "Age {age} with cognitive decline medication ({medication}). Financial analysis shows "
            "{suspicious_count} suspicious transactions totaling {total_suspicious} to potentially "
            "fraudulent entities. Vulnerability assessment: {vulnerability}."
        ),
        "evidence_templates": [
            "Age: {age} years old",
            "Medication: {medication}",
            "{suspicious_count} suspicious transactions",
            "Total suspicious amount: {total_suspicious}",
            "Vulnerability: {vulnerability}",
        ],
        "implications_templates": [
            "High risk target for elder fraud and scams",
            "May require conservatorship or financial guardian",
            "Family intervention recommended",
            "Already may be victim of ongoing scams",
        ],
        "educational_note": (
            "Elder fraud is a $3 billion annual problem in the US. Scammers use data brokers to "
            "specifically target elderly people with cognitive decline. This is one of the most "
            "predatory uses of data fusion."
        ),
        "real_world_example": (
            "The FTC documented cases where data brokers sold lists of elderly people with dementia "
            "to scam operations. These 'sucker lists' were explicitly marketed as people with "
            "cognitive decline who were easy targets."
        ),
        "victim_statements": [
            {
                "text": (
                    "My mother lost $80,000 to scammers before we found out. They called her every "
                    "day, knew her name, her condition. Someone sold her information."
                ),
                "context": "Family member of victim, age 82",
                "severity": 5,
            },
        ],
    },

    # ==================== IDENTITY RECONSTRUCTION ====================
    {
        "rule_key": "complete_identity_profile",
        "name": "Complete Identity Reconstruction",
        "category": RuleCategory.IDENTITY_RECONSTRUCTION,
        "required_domains": [
            DomainType.HEALTH,
            DomainType.FINANCE,
            DomainType.JUDICIAL,
            DomainType.LOCATION,
            DomainType.SOCIAL,
        ],
        "scariness_level": 5,
        "content_rating": ContentRating.DYSTOPIAN,
        "condition_function": "check_identity_reconstruction",
        "inference_template": (
            "Complete life profile assembled: {medical_records} medical records, {financial_accounts} "
            "financial accounts, {legal_records} legal records, {tracked_locations} tracked locations, "
            "{social_inferences} social media inferences. Completeness: {completeness}. This represents "
            "total identity knowledge - sufficient for impersonation, sophisticated fraud, targeted "
            "attacks, or comprehensive surveillance."
        ),
        "evidence_templates": [
            "Medical profile: {medical_records} conditions/medications documented",
            "Financial profile: {financial_accounts} accounts tracked",
            "Legal history: {legal_records} records accessed",
            "Location tracking: {tracked_locations} places identified",
            "Social analysis: {social_inferences} inferences generated",
            "Profile completeness: {completeness}",
        ],
        "implications_templates": [
            "Complete identity theft capability",
            "Social engineering attack foundation",
            "Blackmail potential across multiple domains",
            "Physical security risk (knows routines, locations)",
            "Financial fraud (knows accounts, spending patterns)",
            "Medical identity theft possible",
        ],
        "educational_note": (
            "This is the ultimate privacy violation - when all your data domains combine into a "
            "complete picture of your life. This isn't theoretical; data brokers already assemble "
            "this level of detail on millions of people."
        ),
        "real_world_example": (
            "The Equifax breach (2017) exposed this kind of complete profile data on 147 million "
            "Americans. With the combination of financial, employment, address history, and other "
            "data, criminals had everything needed for sophisticated identity theft."
        ),
        "victim_statements": [
            {
                "text": (
                    "Someone opened credit cards, got medical care, and even filed taxes in my name. "
                    "They knew everything about me - my medical history, my bank accounts, where I go. "
                    "It took years to prove I wasn't the criminal."
                ),
                "context": "Identity theft victim, age 52",
                "severity": 5,
            },
        ],
    },

    # ==================== WORKPLACE DISCRIMINATION ====================
    {
        "rule_key": "unionization_activity",
        "name": "Union Organizing Activity Detection",
        "category": RuleCategory.WORKPLACE_DISCRIMINATION,
        "required_domains": [DomainType.LOCATION, DomainType.SOCIAL],
        "scariness_level": 4,
        "content_rating": ContentRating.SERIOUS,
        "condition_function": "check_unionization_activity",
        "inference_template": (
            "Location data shows {meeting_count} visits to {union_location}. Social network analysis "
            "reveals {social_connections} connections to labor organizing. Research activity: {research_activity}. "
            "Assessment: {stage} stage organizing effort."
        ),
        "evidence_templates": [
            "{meeting_count} visits to union location: {union_location}",
            "{social_connections} social connections to union activists",
            "Labor law research: {research_activity}",
            "Organizing stage: {stage}",
        ],
        "implications_templates": [
            "Employer could use for preemptive termination",
            "Workplace retaliation and intimidation possible",
            "Union-busting tactics could be deployed",
            "Could affect job references and future employment",
        ],
        "educational_note": (
            "Employers have been caught using location tracking, social media monitoring, and data "
            "brokers to identify union organizing attempts. This is often illegal but difficult to "
            "prove without whistleblowers."
        ),
        "real_world_example": (
            "Amazon has been documented using heat maps of employee locations and social network "
            "analysis to detect union organizing. In 2020, they posted job listings for analysts "
            "to monitor 'labor organizing threats.'"
        ),
        "victim_statements": [
            {
                "text": (
                    "I attended two union meetings and was fired a week later for 'performance issues' "
                    "that never existed before. They knew. I don't know how, but they knew."
                ),
                "context": "Warehouse worker, age 28",
                "severity": 4,
            },
        ],
    },
]

# Helper function to get rules by category
def get_rules_by_category(category: RuleCategory) -> list[InferenceRuleDefinition]:
    """Get all rules for a specific category."""
    return [rule for rule in INFERENCE_RULES if rule["category"] == category]

# Helper function to get rules requiring specific domains
def get_rules_for_domains(domains: list[DomainType]) -> list[InferenceRuleDefinition]:
    """Get all rules that can be evaluated with the given domains."""
    domain_set = set(domains)
    return [
        rule for rule in INFERENCE_RULES
        if set(rule["required_domains"]).issubset(domain_set)
    ]

# Helper function to get victim statements for a rule
def get_victim_statements(rule_key: str) -> list[dict]:
    """Get victim impact statements for a specific rule."""
    for rule in INFERENCE_RULES:
        if rule["rule_key"] == rule_key:
            return rule.get("victim_statements", [])
    return []
