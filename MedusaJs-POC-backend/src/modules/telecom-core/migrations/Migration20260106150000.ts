import { Migration } from "@mikro-orm/migrations"

export class Migration20260106150000 extends Migration {
    async up(): Promise<void> {
        // Update existing usage_counter records to populate period fields
        // Set to current month/year if null
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        this.addSql(`
      UPDATE "usage_counter" 
      SET 
        period_month = ${currentMonth},
        period_year = ${currentYear}
      WHERE period_month IS NULL OR period_year IS NULL;
    `)
    }

    async down(): Promise<void> {
        // No rollback needed
    }
}
