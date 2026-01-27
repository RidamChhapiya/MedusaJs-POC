/**
 * Utility: Calculate Prorated Amount
 * 
 * Calculates prorated charges for plan changes mid-cycle
 */

export interface ProrationResult {
    credit_amount: number
    charge_amount: number
    net_amount: number
    days_remaining: number
    total_days: number
}

/**
 * Calculate prorated amount for plan change
 * 
 * @param oldPlanPrice - Monthly price of old plan (in cents)
 * @param newPlanPrice - Monthly price of new plan (in cents)
 * @param renewalDate - Next renewal date
 * @returns ProrationResult with credit, charge, and net amounts
 */
export function calculateProration(
    oldPlanPrice: number,
    newPlanPrice: number,
    renewalDate: Date
): ProrationResult {
    const now = new Date()
    const totalDays = 30 // Assuming 30-day billing cycle

    // Calculate days remaining in current cycle
    const daysRemaining = Math.ceil(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Ensure days remaining is valid
    const validDaysRemaining = Math.max(0, Math.min(daysRemaining, totalDays))

    // Calculate daily rates
    const oldDailyRate = oldPlanPrice / totalDays
    const newDailyRate = newPlanPrice / totalDays

    // Calculate credit for unused portion of old plan
    const creditAmount = Math.round(oldDailyRate * validDaysRemaining)

    // Calculate charge for new plan for remaining days
    const chargeAmount = Math.round(newDailyRate * validDaysRemaining)

    // Net amount (positive = customer pays, negative = customer gets credit)
    const netAmount = chargeAmount - creditAmount

    return {
        credit_amount: creditAmount,
        charge_amount: chargeAmount,
        net_amount: netAmount,
        days_remaining: validDaysRemaining,
        total_days: totalDays
    }
}

/**
 * Format proration result for display
 */
export function formatProration(proration: ProrationResult): string {
    const { credit_amount, charge_amount, net_amount, days_remaining } = proration

    let message = `Proration for ${days_remaining} remaining days:\n`
    message += `  Credit from old plan: ₹${(credit_amount / 100).toFixed(2)}\n`
    message += `  Charge for new plan: ₹${(charge_amount / 100).toFixed(2)}\n`

    if (net_amount > 0) {
        message += `  Amount to pay: ₹${(net_amount / 100).toFixed(2)}`
    } else if (net_amount < 0) {
        message += `  Credit to account: ₹${(Math.abs(net_amount) / 100).toFixed(2)}`
    } else {
        message += `  No additional charge`
    }

    return message
}
