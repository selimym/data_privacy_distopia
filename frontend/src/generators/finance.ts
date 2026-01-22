/**
 * Financial record data generator for NPCs.
 * Generates financial accounts, debts, and transactions.
 */

import { faker } from '@faker-js/faker';

export enum EmploymentStatus {
  EMPLOYED_FULL_TIME = "employed_full_time",
  EMPLOYED_PART_TIME = "employed_part_time",
  SELF_EMPLOYED = "self_employed",
  UNEMPLOYED = "unemployed",
  RETIRED = "retired",
  STUDENT = "student",
}

export enum AccountType {
  CHECKING = "checking",
  SAVINGS = "savings",
  CREDIT_CARD = "credit_card",
  INVESTMENT = "investment",
}

export enum DebtType {
  MORTGAGE = "mortgage",
  AUTO_LOAN = "auto_loan",
  STUDENT_LOAN = "student_loan",
  CREDIT_CARD = "credit_card",
  MEDICAL_DEBT = "medical_debt",
  PERSONAL_LOAN = "personal_loan",
}

export enum TransactionCategory {
  GROCERIES = "groceries",
  DINING = "dining",
  HEALTHCARE = "healthcare",
  PHARMACY = "pharmacy",
  ENTERTAINMENT = "entertainment",
  TRAVEL = "travel",
  UTILITIES = "utilities",
  RENT = "rent",
  INSURANCE = "insurance",
  GAMBLING = "gambling",
  ALCOHOL = "alcohol",
  OTHER = "other",
}

export interface BankAccountData {
  account_type: AccountType;
  bank_name: string;
  account_number_last4: string;
  balance: string; // Decimal as string
  opened_date: string; // ISO date string
}

export interface DebtData {
  debt_type: DebtType;
  creditor_name: string;
  original_amount: string; // Decimal as string
  current_balance: string; // Decimal as string
  monthly_payment: string; // Decimal as string
  interest_rate: string; // Decimal as string
  opened_date: string; // ISO date string
  is_delinquent: boolean;
}

export interface TransactionData {
  transaction_date: string; // ISO date string
  merchant_name: string;
  amount: string; // Decimal as string
  category: TransactionCategory;
  description: string | null;
  is_sensitive: boolean;
}

export interface FinanceRecordData {
  npc_id: string;
  employment_status: EmploymentStatus;
  employer_name: string | null;
  annual_income: string; // Decimal as string
  credit_score: number;
  bank_accounts: BankAccountData[];
  debts: DebtData[];
  transactions: TransactionData[];
}

// Reference data - loaded from JSON
let financeRef: any = null;

/**
 * Load finance reference data from JSON file
 */
export async function loadFinanceReference(): Promise<void> {
  const response = await fetch('/data/reference/finance.json');
  financeRef = await response.json();
}

/**
 * Weighted random selection
 */
function weightedChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Generate a date from relative time string (e.g., "-10y", "-1y", "-6m", "-90d")
 */
function getRelativeDate(relative: string): Date {
  const now = new Date();
  const match = relative.match(/^-(\d+)([ymd])$/);
  if (!match) return now;

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  if (unit === 'y') {
    now.setFullYear(now.getFullYear() - value);
  } else if (unit === 'm') {
    now.setMonth(now.getMonth() - value);
  } else if (unit === 'd') {
    now.setDate(now.getDate() - value);
  }

  return now;
}

/**
 * Generate a date between two dates and return as ISO string
 */
function dateBetween(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = endDate === 'today' ? new Date() : new Date(endDate);
  const date = faker.date.between({ from: start, to: end });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a financial record with accounts, debts, and transactions.
 */
export function generateFinanceRecord(npcId: string, seed?: number): FinanceRecordData {
  if (!financeRef) {
    throw new Error('Finance reference data not loaded. Call loadFinanceReference() first.');
  }

  if (seed !== undefined) {
    faker.seed(seed);
  }

  // Determine employment status
  const employmentStatus = weightedChoice(
    [
      EmploymentStatus.EMPLOYED_FULL_TIME,
      EmploymentStatus.EMPLOYED_PART_TIME,
      EmploymentStatus.SELF_EMPLOYED,
      EmploymentStatus.UNEMPLOYED,
      EmploymentStatus.RETIRED,
      EmploymentStatus.STUDENT,
    ],
    [60, 10, 10, 5, 10, 5]
  );

  // Generate income based on employment status
  let annualIncome: number;
  let employerName: string | null;

  if (employmentStatus === EmploymentStatus.EMPLOYED_FULL_TIME) {
    annualIncome = faker.number.int({ min: 35000, max: 150000 });
    employerName = faker.helpers.arrayElement(financeRef.employers);
  } else if (employmentStatus === EmploymentStatus.EMPLOYED_PART_TIME) {
    annualIncome = faker.number.int({ min: 12000, max: 35000 });
    employerName = faker.helpers.arrayElement(financeRef.employers);
  } else if (employmentStatus === EmploymentStatus.SELF_EMPLOYED) {
    annualIncome = faker.number.int({ min: 25000, max: 200000 });
    employerName = "Self-Employed";
  } else if (employmentStatus === EmploymentStatus.RETIRED) {
    annualIncome = faker.number.int({ min: 20000, max: 80000 });
    employerName = null;
  } else if (employmentStatus === EmploymentStatus.STUDENT) {
    annualIncome = faker.number.int({ min: 5000, max: 25000 });
    employerName = null;
  } else { // UNEMPLOYED
    annualIncome = faker.number.int({ min: 0, max: 15000 });
    employerName = null;
  }

  // Generate credit score (higher income generally correlates with better credit)
  let creditScore: number;
  if (annualIncome > 100000) {
    creditScore = faker.number.int({ min: 700, max: 850 });
  } else if (annualIncome > 50000) {
    creditScore = faker.number.int({ min: 650, max: 780 });
  } else if (annualIncome > 25000) {
    creditScore = faker.number.int({ min: 580, max: 720 });
  } else {
    creditScore = faker.number.int({ min: 500, max: 680 });
  }

  const record: FinanceRecordData = {
    npc_id: npcId,
    employment_status: employmentStatus,
    employer_name: employerName,
    annual_income: annualIncome.toString(),
    credit_score: creditScore,
    bank_accounts: [],
    debts: [],
    transactions: [],
  };

  // Generate bank accounts (1-3)
  const numAccounts = faker.number.int({ min: 1, max: 3 });
  for (let i = 0; i < numAccounts; i++) {
    const accountType = faker.helpers.arrayElement([
      AccountType.CHECKING,
      AccountType.SAVINGS,
      AccountType.CREDIT_CARD,
      AccountType.INVESTMENT,
    ]);

    let balance: number;
    if (accountType === AccountType.CHECKING) {
      balance = faker.number.float({ min: 100, max: 5000, fractionDigits: 2 });
    } else if (accountType === AccountType.SAVINGS) {
      balance = faker.number.float({ min: 500, max: 50000, fractionDigits: 2 });
    } else if (accountType === AccountType.CREDIT_CARD) {
      balance = -faker.number.float({ min: 0, max: 5000, fractionDigits: 2 });
    } else { // INVESTMENT
      balance = faker.number.float({ min: 5000, max: 200000, fractionDigits: 2 });
    }

    record.bank_accounts.push({
      account_type: accountType,
      bank_name: faker.helpers.arrayElement(financeRef.banks) as string,
      account_number_last4: faker.number.int({ min: 1000, max: 9999 }).toString(),
      balance: balance.toFixed(2),
      opened_date: dateBetween(getRelativeDate('-15y').toISOString(), getRelativeDate('-1m').toISOString()),
    });
  }

  // Generate debts (50% chance)
  if (Math.random() < 0.50) {
    const numDebts = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numDebts; i++) {
      const debtType = faker.helpers.arrayElement(Object.values(DebtType));

      let originalAmount: number;
      let currentBalance: number;
      let monthlyPayment: number;
      let interestRate: number;

      if (debtType === DebtType.MORTGAGE) {
        originalAmount = faker.number.int({ min: 150000, max: 500000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 1000, max: 3500 });
        interestRate = faker.number.float({ min: 3.0, max: 6.5, fractionDigits: 2 });
      } else if (debtType === DebtType.AUTO_LOAN) {
        originalAmount = faker.number.int({ min: 15000, max: 50000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.3, max: 0.85, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 250, max: 700 });
        interestRate = faker.number.float({ min: 4.0, max: 9.0, fractionDigits: 2 });
      } else if (debtType === DebtType.STUDENT_LOAN) {
        originalAmount = faker.number.int({ min: 20000, max: 120000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.4, max: 0.90, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 200, max: 1000 });
        interestRate = faker.number.float({ min: 3.5, max: 7.5, fractionDigits: 2 });
      } else if (debtType === DebtType.CREDIT_CARD) {
        originalAmount = faker.number.int({ min: 2000, max: 15000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 50, max: 300 });
        interestRate = faker.number.float({ min: 15.0, max: 25.0, fractionDigits: 2 });
      } else if (debtType === DebtType.MEDICAL_DEBT) {
        originalAmount = faker.number.int({ min: 5000, max: 50000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.2, max: 0.95, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 100, max: 500 });
        interestRate = faker.number.float({ min: 0.0, max: 8.0, fractionDigits: 2 });
      } else { // PERSONAL_LOAN
        originalAmount = faker.number.int({ min: 5000, max: 30000 });
        currentBalance = originalAmount * faker.number.float({ min: 0.3, max: 0.85, fractionDigits: 2 });
        monthlyPayment = faker.number.int({ min: 150, max: 500 });
        interestRate = faker.number.float({ min: 6.0, max: 15.0, fractionDigits: 2 });
      }

      // 10% chance of delinquency
      const isDelinquent = Math.random() < 0.10;

      record.debts.push({
        debt_type: debtType,
        creditor_name: faker.helpers.arrayElement(financeRef.creditors),
        original_amount: originalAmount.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        monthly_payment: monthlyPayment.toFixed(2),
        interest_rate: interestRate.toFixed(2),
        opened_date: dateBetween(getRelativeDate('-10y').toISOString(), getRelativeDate('-6m').toISOString()),
        is_delinquent: isDelinquent,
      });
    }
  }

  // Generate transactions (20-80 in last 90 days)
  const numTransactions = faker.number.int({ min: 20, max: 80 });
  const merchants = financeRef.merchants;

  for (let i = 0; i < numTransactions; i++) {
    // Weight towards more common categories
    const category = weightedChoice(
      Object.values(TransactionCategory),
      [20, 15, 3, 5, 8, 3, 10, 12, 5, 2, 3, 10]
    );

    const merchantName = faker.helpers.arrayElement(merchants[category]);

    // Amount varies by category
    let amount: number;
    if ([TransactionCategory.GROCERIES, TransactionCategory.DINING].includes(category)) {
      amount = faker.number.float({ min: 10, max: 150, fractionDigits: 2 });
    } else if ([TransactionCategory.HEALTHCARE, TransactionCategory.PHARMACY].includes(category)) {
      amount = faker.number.float({ min: 20, max: 500, fractionDigits: 2 });
    } else if (category === TransactionCategory.ENTERTAINMENT) {
      amount = faker.number.float({ min: 15, max: 200, fractionDigits: 2 });
    } else if (category === TransactionCategory.TRAVEL) {
      amount = faker.number.float({ min: 50, max: 1500, fractionDigits: 2 });
    } else if ([TransactionCategory.UTILITIES, TransactionCategory.INSURANCE].includes(category)) {
      amount = faker.number.float({ min: 50, max: 300, fractionDigits: 2 });
    } else if (category === TransactionCategory.RENT) {
      amount = faker.number.float({ min: 800, max: 3000, fractionDigits: 2 });
    } else if (category === TransactionCategory.GAMBLING) {
      amount = faker.number.float({ min: 20, max: 500, fractionDigits: 2 });
    } else if (category === TransactionCategory.ALCOHOL) {
      amount = faker.number.float({ min: 15, max: 100, fractionDigits: 2 });
    } else {
      amount = faker.number.float({ min: 10, max: 200, fractionDigits: 2 });
    }

    // Sensitive categories
    const isSensitive = [
      TransactionCategory.HEALTHCARE,
      TransactionCategory.PHARMACY,
      TransactionCategory.GAMBLING,
    ].includes(category);

    const transactionDate = dateBetween(getRelativeDate('-90d').toISOString(), 'today');

    record.transactions.push({
      transaction_date: transactionDate,
      merchant_name: merchantName as string,
      amount: amount.toFixed(2),
      category,
      description: null,
      is_sensitive: isSensitive,
    });
  }

  // Sort transactions by date
  record.transactions.sort((a, b) =>
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  return record;
}
