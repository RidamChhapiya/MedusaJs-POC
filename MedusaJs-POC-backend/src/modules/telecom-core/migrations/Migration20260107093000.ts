import { Migration } from "@mikro-orm/migrations"

export class Migration20260107093000 extends Migration {
    async up(): Promise<void> {
        // Create customer_profile table
        this.addSql(`
      create table "customer_profile" (
        "id" text not null,
        "customer_id" text not null,
        "full_name" text not null,
        "date_of_birth" timestamptz null,
        "gender" text null check ("gender" in ('male', 'female', 'other')),
        "primary_phone" text not null,
        "alternate_phone" text null,
        "email" text not null,
        "address_line1" text not null,
        "address_line2" text null,
        "city" text not null,
        "state" text not null,
        "pincode" text not null,
        "country" text not null default 'IN',
        "kyc_status" text not null default 'pending' check ("kyc_status" in ('pending', 'verified', 'rejected')),
        "kyc_type" text null check ("kyc_type" in ('aadhaar', 'pan', 'passport', 'driving_license')),
        "kyc_number" text null,
        "kyc_verified_at" timestamptz null,
        "kyc_document_url" text null,
        "is_nexel_subscriber" boolean not null default false,
        "nexel_numbers" jsonb null,
        "registration_source" text not null default 'web' check ("registration_source" in ('web', 'app', 'store')),
        "language_preference" text not null default 'en',
        "notification_preferences" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "customer_profile_pkey" primary key ("id")
      );
    `)

        // Add unique constraint on primary_phone
        this.addSql('create unique index "customer_profile_primary_phone_unique" on "customer_profile" ("primary_phone");')

        // Add customer linking fields to msisdn_inventory
        this.addSql('alter table "msisdn_inventory" add column "customer_id" text null;')
        this.addSql('alter table "msisdn_inventory" add column "reserved_at" timestamptz null;')
        this.addSql('alter table "msisdn_inventory" add column "activated_at" timestamptz null;')
        this.addSql('alter table "msisdn_inventory" add column "reservation_expires_at" timestamptz null;')

        // Add index on customer_id for faster lookups
        this.addSql('create index "msisdn_inventory_customer_id_index" on "msisdn_inventory" ("customer_id");')
    }

    async down(): Promise<void> {
        // Remove indexes and columns from msisdn_inventory
        this.addSql('drop index if exists "msisdn_inventory_customer_id_index";')
        this.addSql('alter table "msisdn_inventory" drop column if exists "customer_id";')
        this.addSql('alter table "msisdn_inventory" drop column if exists "reserved_at";')
        this.addSql('alter table "msisdn_inventory" drop column if exists "activated_at";')
        this.addSql('alter table "msisdn_inventory" drop column if exists "reservation_expires_at";')

        // Drop customer_profile table
        this.addSql('drop table if exists "customer_profile" cascade;')
    }
}
