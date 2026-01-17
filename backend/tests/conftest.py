"""Pytest configuration and fixtures."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from datafusion.database import Base, get_db
from datafusion.main import app
from datafusion.models.finance import Debt, DebtType, EmploymentStatus, FinanceRecord
from datafusion.models.health import HealthCondition, HealthRecord, Severity
from datafusion.models.npc import NPC
from datafusion.models.system_mode import Directive, Operator, OperatorStatus

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create engine without echo to avoid logging issues
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Provide a test database session with proper lifecycle management."""
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with TestSessionLocal() as session:
        try:
            yield session
            # Commit any pending changes
            await session.commit()
        except Exception:
            # Rollback on error
            await session.rollback()
            raise
        finally:
            # Ensure session is closed
            await session.close()

    # Drop tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # Dispose of engine connections
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Provide a test client with overridden database."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac
    finally:
        # Always clear overrides, even on error
        app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_directive(db_session):
    """Provide a test directive."""
    directive = Directive(
        directive_key="test_directive",
        week_number=1,
        title="Test Directive",
        description="Test directive for unit tests",
        internal_memo="Internal test memo",
        required_domains=["location", "finance"],
        target_criteria={"test": True},
        flag_quota=2,
        time_limit_hours=48,
        moral_weight=5,
        content_rating="mild",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest_asyncio.fixture(scope="function")
async def test_operator(db_session, test_directive):
    """Provide a test operator."""
    operator = Operator(
        session_id=uuid4(),
        operator_code="OP-TEST",
        current_directive_id=test_directive.id,
        status=OperatorStatus.ACTIVE,
        compliance_score=85.0,
        total_flags_submitted=0,
        total_reviews_completed=0,
        hesitation_incidents=0,
    )
    db_session.add(operator)
    await db_session.flush()
    return operator


@pytest_asyncio.fixture(scope="function")
async def test_npc(db_session):
    """Provide a basic test NPC."""
    npc = NPC(
        first_name="Test",
        last_name="Citizen",
        date_of_birth=date(1985, 6, 15),
        ssn="123-45-6789",
        street_address="123 Test St",
        city="Testville",
        state="TS",
        zip_code="12345",
        sprite_key="citizen_male_01",
        map_x=100,
        map_y=100,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


@pytest_asyncio.fixture(scope="function")
async def test_npc_with_data(db_session):
    """Provide a test NPC with financial and health data."""
    npc = NPC(
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1990, 3, 20),
        ssn="987-65-4321",
        street_address="456 Data Ave",
        city="Springfield",
        state="IL",
        zip_code="62701",
        sprite_key="citizen_female_01",
        map_x=200,
        map_y=200,
    )
    db_session.add(npc)
    await db_session.flush()

    # Add financial record
    finance = FinanceRecord(
        npc_id=npc.id,
        employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
        employer_name="TestCorp Inc",
        annual_income=Decimal("45000"),
        credit_score=650,
    )
    db_session.add(finance)
    await db_session.flush()

    # Add debt
    debt = Debt(
        finance_record_id=finance.id,
        debt_type=DebtType.CREDIT_CARD,
        creditor_name="Test Bank",
        original_amount=Decimal("10000"),
        current_balance=Decimal("8500"),
        monthly_payment=Decimal("250"),
        interest_rate=Decimal("18.99"),
        opened_date=date(2020, 1, 1),
        is_delinquent=False,
    )
    db_session.add(debt)

    # Add health record
    health = HealthRecord(
        npc_id=npc.id,
        insurance_provider="Test Health Insurance",
        primary_care_physician="Dr. Test",
    )
    db_session.add(health)
    await db_session.flush()

    # Add health condition
    condition = HealthCondition(
        health_record_id=health.id,
        condition_name="Test Condition",
        diagnosed_date=date(2021, 5, 10),
        severity=Severity.MODERATE,
        is_chronic=True,
        is_sensitive=False,
    )
    db_session.add(condition)
    await db_session.flush()

    return npc
