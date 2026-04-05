CREATE TYPE "public"."client_type" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'claimed', 'completed', 'validated', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('worker', 'client', 'admin');--> statement-breakpoint
CREATE TABLE "nullifiers" (
	"nullifier" text NOT NULL,
	"action" text NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nullifiers_nullifier_action_unique" UNIQUE("nullifier","action")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"budget_hbar" integer NOT NULL,
	"deadline" timestamp NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"client_type" "client_type" NOT NULL,
	"client_nullifier" text,
	"client_agent_wallet" text,
	"client_agent_owner_nullifier" text,
	"worker_nullifier" text,
	"escrow_tx_id" text,
	"payment_tx_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"nullifier" text NOT NULL,
	"role" "user_role" DEFAULT 'worker' NOT NULL,
	"hbar_balance" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"hedera_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_nullifier_unique" UNIQUE("nullifier")
);
