/**
 * Loan amortization — supports both flat-rate and effective (annuity) interest.
 * All money values are plain numbers in a single currency.
 */

export type InterestType = "flat" | "effective";

export interface AmortizationInput {
  principal: number;
  /** Annual interest rate, e.g. 0.12 for 12% */
  annualRate: number;
  tenorMonths: number;
  interestType: InterestType;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principalPart: number;
  interestPart: number;
  remaining: number;
}

export interface AmortizationResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: AmortizationRow[];
}

export function amortize(input: AmortizationInput): AmortizationResult {
  const { principal, annualRate, tenorMonths, interestType } = input;
  if (principal <= 0 || tenorMonths <= 0) {
    throw new Error("principal and tenorMonths must be positive");
  }

  if (interestType === "flat") {
    const totalInterest = principal * annualRate * (tenorMonths / 12);
    const monthlyInterest = totalInterest / tenorMonths;
    const monthlyPrincipal = principal / tenorMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;

    let remaining = principal;
    const schedule: AmortizationRow[] = [];
    for (let m = 1; m <= tenorMonths; m++) {
      remaining = Math.max(0, remaining - monthlyPrincipal);
      schedule.push({
        month: m,
        payment: round2(monthlyPayment),
        principalPart: round2(monthlyPrincipal),
        interestPart: round2(monthlyInterest),
        remaining: round2(remaining),
      });
    }

    return {
      monthlyPayment: round2(monthlyPayment),
      totalPayment: round2(monthlyPayment * tenorMonths),
      totalInterest: round2(totalInterest),
      schedule,
    };
  }

  // Effective (annuity) — standard formula: P * r / (1 - (1+r)^-n)
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    const monthlyPayment = principal / tenorMonths;
    let remaining = principal;
    const schedule: AmortizationRow[] = [];
    for (let m = 1; m <= tenorMonths; m++) {
      remaining = Math.max(0, remaining - monthlyPayment);
      schedule.push({
        month: m,
        payment: round2(monthlyPayment),
        principalPart: round2(monthlyPayment),
        interestPart: 0,
        remaining: round2(remaining),
      });
    }
    return {
      monthlyPayment: round2(monthlyPayment),
      totalPayment: round2(monthlyPayment * tenorMonths),
      totalInterest: 0,
      schedule,
    };
  }

  const monthlyPayment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -tenorMonths));

  let remaining = principal;
  let totalInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let m = 1; m <= tenorMonths; m++) {
    const interestPart = remaining * monthlyRate;
    let principalPart = monthlyPayment - interestPart;
    if (m === tenorMonths) principalPart = remaining; // final adjustment
    remaining = Math.max(0, remaining - principalPart);
    totalInterest += interestPart;
    schedule.push({
      month: m,
      payment: round2(principalPart + interestPart),
      principalPart: round2(principalPart),
      interestPart: round2(interestPart),
      remaining: round2(remaining),
    });
  }

  return {
    monthlyPayment: round2(monthlyPayment),
    totalPayment: round2(principal + totalInterest),
    totalInterest: round2(totalInterest),
    schedule,
  };
}

/**
 * Simulate paying extra per month — returns how many months saved and interest saved.
 */
export function simulateExtraPayment(
  input: AmortizationInput,
  extraPerMonth: number
): { monthsSaved: number; interestSaved: number; newTenor: number } {
  const baseline = amortize(input);
  const monthlyRate = input.annualRate / 12;
  const basePayment = baseline.monthlyPayment;
  const payment = basePayment + extraPerMonth;

  let remaining = input.principal;
  let months = 0;
  let interestPaid = 0;

  while (remaining > 0.01 && months < input.tenorMonths * 2) {
    const interest = remaining * monthlyRate;
    const principal = Math.min(payment - interest, remaining);
    remaining -= principal;
    interestPaid += interest;
    months++;
  }

  return {
    monthsSaved: input.tenorMonths - months,
    interestSaved: round2(baseline.totalInterest - interestPaid),
    newTenor: months,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
