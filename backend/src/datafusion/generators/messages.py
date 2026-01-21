"""
Message generation for chat control surveillance simulation.

Generates realistic private messages and flags them based on keywords
and sentiment analysis. Educational purpose: Shows how mass message
surveillance works and why it's dangerous.
"""

import random
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.health import HealthRecord
from datafusion.models.messages import Message, MessageRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord

# Message templates by category
MUNDANE_MESSAGES = [
    "Running late, save me a seat",
    "Did you see the game last night?",
    "Mom wants to know if you're coming for dinner Sunday",
    "Thanks for lunch today! Same time next week?",
    "Can you pick up milk on your way home?",
    "Just finished work. Want to grab a drink?",
    "Happy birthday! Hope you have a great day",
    "LOL that video you sent was hilarious",
    "Sorry I missed your call, what's up?",
    "Sounds good, see you then",
    "How was your day?",
    "Got your message, will call you later",
    "Don't forget about the meeting tomorrow",
    "Thanks for helping me move last weekend!",
    "What time does the movie start?",
    "I'm free this weekend if you want to hang out",
    "Congrats on the new job!",
    "Hope you feel better soon",
    "Let me know when you get home safe",
    "Want to order pizza tonight?",
]

VENTING_MESSAGES = [
    "I can't believe they passed that law. This country is going insane.",
    "Work is killing me. Sometimes I wonder what's the point.",
    "The news is so depressing. I try not to watch anymore.",
    "Everything is so expensive now. I don't know how we're supposed to survive.",
    "I'm so tired of all this. When does it get better?",
    "Another day, another dollar. Except the dollars don't go as far.",
    "I hate that I have to work two jobs just to make rent.",
    "The healthcare system is broken. I can't afford my medications.",
    "Sometimes I feel like giving up on everything.",
    "They keep taking more and more of our rights away.",
    "I'm exhausted. Mentally, physically, emotionally.",
    "This system is designed to crush people like us.",
    "I don't recognize this country anymore.",
    "What's the point of voting when nothing changes?",
    "I'm scared for the future.",
]

ORGANIZING_MESSAGES = [
    "Are you coming to the protest Saturday? We need everyone.",
    "We should start a group to fight this. I know people who can help.",
    "Don't say too much over text. Let's talk in person.",
    "Meeting at the usual place tomorrow at 7. Spread the word.",
    "Have you thought about what we discussed? Time to act.",
    "Downloaded that encrypted app. You should too.",
    "They can't arrest all of us if we stand together.",
    "We need to organize. Things won't change otherwise.",
    "Can you get 10 people to show up? We need numbers.",
    "Don't use your real name when you sign up.",
    "Bring cash, no digital trail.",
    "Looking into moving abroad. This isn't sustainable.",
    "Know any lawyers? Might need one soon.",
    "Delete this after you read it.",
    "They're watching everything. Be careful what you say.",
]

WORK_COMPLAINTS = [
    "Boss is being unreasonable again.",
    "They want us to work overtime without pay.",
    "I'm looking for a new job. Can't take this anymore.",
    "HR did nothing about my complaint.",
    "They cut benefits again. How is this legal?",
    "Thinking about reporting them to the labor board.",
]

MENTAL_HEALTH_MESSAGES = [
    "Having a really rough day. Can we talk?",
    "The anxiety is getting worse again.",
    "I don't want to be a burden but I'm struggling.",
    "Therapy helped but I can't afford to keep going.",
    "I feel so alone sometimes.",
    "It's hard to get out of bed lately.",
    "Thanks for being there for me. I really needed it.",
    "Having dark thoughts again. Sorry to worry you.",
]

FINANCIAL_STRESS_MESSAGES = [
    "Got another collections call today.",
    "Credit card got declined. So embarrassing.",
    "I don't know how I'm going to make rent this month.",
    "Can I borrow $50 until payday?",
    "Had to pawn my laptop. Things are that bad.",
    "Looking for side gigs if you know of anything.",
]

# Keywords that trigger message flagging
CONCERNING_KEYWORDS = [
    # Political/activism
    "protest",
    "organize",
    "fight back",
    "resist",
    "revolution",
    "overthrow",
    "demonstration",
    "rally",
    "activist",
    # Privacy/security
    "encrypt",
    "encryption",
    "VPN",
    "secure app",
    "burner phone",
    "delete this",
    # Extreme actions
    "leave the country",
    "asylum",
    "flee",
    "escape",
    "can't take this",
    # Rights/freedom
    "rights",
    "freedom",
    "liberty",
    "surveillance",
    "watching us",
    "privacy",
    "censorship",
    # System criticism
    "broken system",
    "corrupt",
    "injustice",
    "authoritarian",
]


class MessageGenerator:
    """Generates realistic message histories with surveillance flagging."""

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    async def generate_message_history(
        self, npc_id: UUID, seed: int | None = None
    ) -> MessageRecord:
        """
        Generate complete message history for an NPC.

        Args:
            npc_id: UUID of the NPC
            seed: Random seed for reproducibility

        Returns:
            MessageRecord with generated messages
        """
        if seed is not None:
            random.seed(seed)

        # Get NPC data
        npc = await self._get_npc(npc_id)

        # Get related data for context
        health_record = await self._get_health_record(npc_id)
        social_record = await self._get_social_record(npc_id)

        # Create message record
        message_record = MessageRecord(npc_id=npc_id)
        self.db.add(message_record)
        await self.db.flush()

        # Generate 20-50 messages over past 30 days
        num_messages = random.randint(20, 50)
        messages = []

        # Determine message profile based on NPC data
        has_mental_health = False
        has_financial_stress = False
        is_activist = False

        if health_record and health_record.conditions:
            mental_health_conditions = [
                c
                for c in health_record.conditions
                if c.category.lower() in ["mental_health", "psychological", "psychiatric"]
            ]
            has_mental_health = len(mental_health_conditions) > 0

        # Check for activist/organizer traits from social media
        if social_record and social_record.public_inferences:
            activist_indicators = [
                inf
                for inf in social_record.public_inferences
                if "activist" in inf.inference_text.lower()
                or "protest" in inf.inference_text.lower()
                or "organizer" in inf.inference_text.lower()
            ]
            is_activist = len(activist_indicators) > 0

        # Generate messages
        for i in range(num_messages):
            # Timestamp: Random time in past 30 days
            days_ago = random.uniform(0, 30)
            timestamp = datetime.now(UTC) - timedelta(days=days_ago)

            # Choose message category based on profile
            weights = self._get_message_weights(
                has_mental_health, has_financial_stress, is_activist
            )
            category = random.choices(list(weights.keys()), weights=list(weights.values()))[0]

            # Generate message content
            content = self._generate_message_content(category)

            # Generate recipient
            recipient_name, recipient_relationship = self._generate_recipient(npc)

            # Analyze message
            sentiment, detected_keywords, is_flagged, flag_reasons = self._analyze_message(content)

            message = Message(
                message_record_id=message_record.id,
                timestamp=timestamp,
                recipient_id=None,  # Could link to other NPCs in future
                recipient_name=recipient_name,
                recipient_relationship=recipient_relationship,
                content=content,
                is_flagged=is_flagged,
                flag_reasons=flag_reasons,
                sentiment=sentiment,
                detected_keywords=detected_keywords,
            )
            messages.append(message)

        # Add all messages
        self.db.add_all(messages)

        # Update message record aggregates
        message_record.total_messages_analyzed = len(messages)
        message_record.flagged_message_count = sum(1 for m in messages if m.is_flagged)

        # Calculate average sentiment
        if messages:
            message_record.sentiment_score = sum(m.sentiment for m in messages) / len(messages)

        # Count encryption attempts (messages mentioning encryption)
        message_record.encryption_attempts = sum(
            1 for m in messages if any("encrypt" in k for k in m.detected_keywords)
        )

        # Foreign contacts (placeholder - would need country data)
        message_record.foreign_contact_count = random.randint(0, 3)

        await self.db.flush()
        return message_record

    async def generate_scenario_messages(self) -> None:
        """
        Generate specific messages for scenario NPCs.

        This creates the narrative messages that drive the story.
        """
        # Find scenario NPCs by name (if they exist)
        result = await self.db.execute(
            select(NPC).where(NPC.first_name.in_(["Jessica", "David", "Robert"]))
        )
        scenario_npcs = result.scalars().all()

        for npc in scenario_npcs:
            # Check if already has messages
            existing = await self.db.execute(
                select(MessageRecord).where(MessageRecord.npc_id == npc.id)
            )
            if existing.scalar_one_or_none():
                continue  # Skip if already generated

            if npc.first_name == "Jessica":
                await self._generate_jessica_messages(npc.id)
            elif npc.first_name == "David":
                await self._generate_david_messages(npc.id)
            elif npc.first_name == "Robert":
                await self._generate_senator_messages(npc.id)

    async def _generate_jessica_messages(self, npc_id: UUID) -> None:
        """Generate Jessica's narrative messages."""
        message_record = MessageRecord(npc_id=npc_id)
        self.db.add(message_record)
        await self.db.flush()

        jessica_messages = [
            ("I feel like someone's watching me. Is that paranoid?", -0.6, ["watching"], 7),
            (
                "Therapy helped but I can't afford to keep going. Insurance denied my claim.",
                -0.7,
                [],
                14,
            ),
            (
                "Have you thought about leaving the country? I'm looking into it seriously.",
                -0.8,
                ["leave the country"],
                3,
            ),
            ("The anxiety is getting worse. Everything feels like too much.", -0.7, [], 21),
            (
                "I don't trust my phone anymore. Can we meet in person?",
                -0.5,
                ["don't trust"],
                10,
            ),
            ("Thanks for being there for me. I really needed it.", 0.3, [], 5),
            (
                "They want me to work overtime without pay again. How is this legal?",
                -0.6,
                [],
                18,
            ),
            (
                "I heard they're monitoring our messages now. Is that true?",
                -0.7,
                ["monitoring"],
                2,
            ),
        ]

        messages = []
        for content, sentiment, keywords, days_ago in jessica_messages:
            timestamp = datetime.now(UTC) - timedelta(days=days_ago)
            is_flagged, flag_reasons = self._check_flags(content, keywords)

            message = Message(
                message_record_id=message_record.id,
                timestamp=timestamp,
                recipient_name="Sarah",
                recipient_relationship="friend",
                content=content,
                is_flagged=is_flagged,
                flag_reasons=flag_reasons,
                sentiment=sentiment,
                detected_keywords=keywords,
            )
            messages.append(message)

        self.db.add_all(messages)
        message_record.total_messages_analyzed = len(messages)
        message_record.flagged_message_count = sum(1 for m in messages if m.is_flagged)
        message_record.sentiment_score = sum(m.sentiment for m in messages) / len(messages)
        await self.db.flush()

    async def _generate_david_messages(self, npc_id: UUID) -> None:
        """Generate David's angry venting messages."""
        message_record = MessageRecord(npc_id=npc_id)
        self.db.add(message_record)
        await self.db.flush()

        david_messages = [
            (
                "This system is designed to crush people like us. I'm sick of it.",
                -0.9,
                ["system", "crush"],
                5,
            ),
            (
                "They keep taking more and more. When do we fight back?",
                -0.8,
                ["fight back"],
                12,
            ),
            ("Boss denied my raise again. Meanwhile rent goes up every year.", -0.7, [], 20),
            (
                "I don't recognize this country anymore. Everything's rigged.",
                -0.8,
                ["rigged"],
                8,
            ),
            (
                "Are you going to the protest next weekend? We need numbers.",
                -0.5,
                ["protest"],
                3,
            ),
            ("Got another collections call. I want to throw my phone in the river.", -0.7, [], 15),
            (
                "Sometimes I think about just disappearing. Start over somewhere else.",
                -0.6,
                [],
                10,
            ),
        ]

        messages = []
        for content, sentiment, keywords, days_ago in david_messages:
            timestamp = datetime.now(UTC) - timedelta(days=days_ago)
            is_flagged, flag_reasons = self._check_flags(content, keywords)

            message = Message(
                message_record_id=message_record.id,
                timestamp=timestamp,
                recipient_name="Mike",
                recipient_relationship="friend",
                content=content,
                is_flagged=is_flagged,
                flag_reasons=flag_reasons,
                sentiment=sentiment,
                detected_keywords=keywords,
            )
            messages.append(message)

        self.db.add_all(messages)
        message_record.total_messages_analyzed = len(messages)
        message_record.flagged_message_count = sum(1 for m in messages if m.is_flagged)
        message_record.sentiment_score = sum(m.sentiment for m in messages) / len(messages)
        await self.db.flush()

    async def _generate_senator_messages(self, npc_id: UUID) -> None:
        """Generate Senator's coordination messages (different kind of concerning)."""
        message_record = MessageRecord(npc_id=npc_id)
        self.db.add(message_record)
        await self.db.flush()

        senator_messages = [
            ("Meeting with pharma lobbyists went well. They're on board.", 0.4, [], 6),
            ("Make sure the surveillance bill passes. Our donors expect results.", 0.2, [], 14),
            ("Delete this after reading. Can't have it in discovery.", -0.3, ["delete this"], 9),
            (
                "The protesters are getting louder. We need to shut this down.",
                0.1,
                ["protesters"],
                4,
            ),
            (
                "Tell the committee I'll vote yes on the privacy reduction measure.",
                0.3,
                ["privacy"],
                18,
            ),
            ("Campaign contributions from defense contractors came through.", 0.5, [], 22),
        ]

        messages = []
        for content, sentiment, keywords, days_ago in senator_messages:
            timestamp = datetime.now(UTC) - timedelta(days=days_ago)
            is_flagged, flag_reasons = self._check_flags(content, keywords)

            message = Message(
                message_record_id=message_record.id,
                timestamp=timestamp,
                recipient_name="Chief of Staff",
                recipient_relationship="coworker",
                content=content,
                is_flagged=is_flagged,
                flag_reasons=flag_reasons,
                sentiment=sentiment,
                detected_keywords=keywords,
            )
            messages.append(message)

        self.db.add_all(messages)
        message_record.total_messages_analyzed = len(messages)
        message_record.flagged_message_count = sum(1 for m in messages if m.is_flagged)
        message_record.sentiment_score = sum(m.sentiment for m in messages) / len(messages)
        await self.db.flush()

    def _get_message_weights(
        self, has_mental_health: bool, has_financial_stress: bool, is_activist: bool
    ) -> dict[str, float]:
        """Get probability weights for message categories based on NPC profile."""
        weights = {
            "mundane": 50.0,  # Most messages are mundane
            "venting": 20.0,
            "work": 10.0,
            "mental_health": 5.0 if has_mental_health else 1.0,
            "financial": 5.0 if has_financial_stress else 1.0,
            "organizing": 10.0 if is_activist else 2.0,
        }
        return weights

    def _generate_message_content(self, category: str) -> str:
        """Generate message content based on category."""
        if category == "mundane":
            return random.choice(MUNDANE_MESSAGES)
        elif category == "venting":
            return random.choice(VENTING_MESSAGES)
        elif category == "work":
            return random.choice(WORK_COMPLAINTS)
        elif category == "mental_health":
            return random.choice(MENTAL_HEALTH_MESSAGES)
        elif category == "financial":
            return random.choice(FINANCIAL_STRESS_MESSAGES)
        elif category == "organizing":
            return random.choice(ORGANIZING_MESSAGES)
        else:
            return random.choice(MUNDANE_MESSAGES)

    def _generate_recipient(self, npc: NPC) -> tuple[str, str]:
        """Generate recipient name and relationship."""
        relationships = ["friend", "family", "coworker", "unknown"]
        names = ["Alex", "Sam", "Jordan", "Morgan", "Casey", "Taylor", "Riley", "Jamie"]

        relationship = random.choice(relationships)
        name = random.choice(names)

        # Personalize based on relationship
        if relationship == "family":
            name = random.choice(["Mom", "Dad", "Sister", "Brother", "Aunt", "Uncle"])

        return name, relationship

    def _analyze_message(self, content: str) -> tuple[float, list[str], bool, list[str]]:
        """
        Analyze message content for sentiment and flagging.

        Returns:
            (sentiment, detected_keywords, is_flagged, flag_reasons)
        """
        content_lower = content.lower()

        # Detect keywords
        detected_keywords = [kw for kw in CONCERNING_KEYWORDS if kw.lower() in content_lower]

        # Determine sentiment (-1 to 1)
        negative_words = [
            "hate",
            "can't",
            "won't",
            "never",
            "broken",
            "fail",
            "terrible",
            "worst",
            "hopeless",
        ]
        positive_words = ["love", "great", "thanks", "happy", "wonderful", "amazing", "best"]

        sentiment = 0.0
        for word in negative_words:
            if word in content_lower:
                sentiment -= 0.2
        for word in positive_words:
            if word in content_lower:
                sentiment += 0.2

        sentiment = max(-1.0, min(1.0, sentiment))  # Clamp to -1 to 1

        # Check if flagged
        is_flagged, flag_reasons = self._check_flags(content, detected_keywords)

        return sentiment, detected_keywords, is_flagged, flag_reasons

    def _check_flags(self, content: str, detected_keywords: list[str]) -> tuple[bool, list[str]]:
        """Check if message should be flagged and why."""
        flag_reasons = []

        # Flag if contains concerning keywords
        if detected_keywords:
            flag_reasons.append(f"Contains keywords: {', '.join(detected_keywords[:3])}")

        # Flag if mentions encryption/privacy tools
        if any(word in content.lower() for word in ["encrypt", "vpn", "secure app", "burner"]):
            flag_reasons.append("Privacy tool discussion")

        # Flag if discusses organizing/protests
        if any(word in content.lower() for word in ["protest", "organize", "rally"]):
            flag_reasons.append("Organizing activity")

        # Flag if discusses leaving country
        if any(word in content.lower() for word in ["leave the country", "asylum", "flee"]):
            flag_reasons.append("Flight risk indicators")

        # Flag if mentions surveillance awareness
        if any(word in content.lower() for word in ["watching", "monitoring", "surveillance"]):
            flag_reasons.append("Surveillance awareness")

        is_flagged = len(flag_reasons) > 0
        return is_flagged, flag_reasons

    async def _get_npc(self, npc_id: UUID) -> NPC:
        """Get NPC by ID."""
        result = await self.db.execute(select(NPC).where(NPC.id == npc_id))
        npc = result.scalar_one_or_none()
        if not npc:
            raise ValueError(f"NPC {npc_id} not found")
        return npc

    async def _get_health_record(self, npc_id: UUID) -> HealthRecord | None:
        """Get health record for NPC."""
        result = await self.db.execute(select(HealthRecord).where(HealthRecord.npc_id == npc_id))
        return result.scalar_one_or_none()

    async def _get_social_record(self, npc_id: UUID) -> SocialMediaRecord | None:
        """Get social media record for NPC."""
        result = await self.db.execute(
            select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)
        )
        return result.scalar_one_or_none()
