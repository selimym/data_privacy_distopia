/**
 * Finance domain types.
 * Mirrors backend/src/datafusion/models/finance.py
 */

// === Enums ===

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
  PERSONAL_LOAN = "personal_loan",
  MEDICAL_DEBT = "medical_debt",
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

// === Interfaces ===

export interface FinanceRecord {
  id: string;
  npc_id: string;
  employment_status: EmploymentStatus;
  employer_name: string | null;
  annual_income: number;
  credit_score: number;
  bank_accounts: BankAccount[];
  debts: Debt[];
  transactions: Transaction[];
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  finance_record_id: string;
  account_type: AccountType;
  bank_name: string;
  account_number_last4: string;
  balance: number;
  opened_date: string;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  finance_record_id: string;
  debt_type: DebtType;
  creditor_name: string;
  original_amount: number;
  current_balance: number;
  monthly_payment: number;
  interest_rate: number;
  opened_date: string;
  is_delinquent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  finance_record_id: string;
  transaction_date: string;
  merchant_name: string;
  amount: number;
  category: TransactionCategory;
  description: string | null;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}
