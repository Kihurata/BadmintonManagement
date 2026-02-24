


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."customer_type" AS ENUM (
    'LOYAL',
    'GUEST'
);


ALTER TYPE "public"."customer_type" OWNER TO "postgres";


CREATE TYPE "public"."inventory_log_type" AS ENUM (
    'SALE',
    'INTERNAL_USE',
    'DAMAGED',
    'RESTOCK'
);


ALTER TYPE "public"."inventory_log_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'CASH',
    'BANK_TRANSFER'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_auto_sync_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    delta_qty INT;
    v_units_per_pack INT;
    v_actual_deduction INT;
BEGIN
    -- 1. Lấy thông tin quy đổi từ bảng products
    SELECT COALESCE(units_per_pack, 1) 
    INTO v_units_per_pack
    FROM public.products 
    WHERE id = NEW.product_id;

    -- 2. Tính toán chênh lệch số lượng (delta) từ UI gửi xuống
    IF (TG_OP = 'INSERT') THEN
        delta_qty := NEW.quantity;
    ELSIF (TG_OP = 'UPDATE') THEN
        delta_qty := NEW.quantity - OLD.quantity;
    END IF;

    -- 3. Tính toán số lượng thực tế cần trừ trong kho (quy ra đơn vị nhỏ nhất)
    -- Nếu item này được đánh dấu là bán theo Pack (Ống/Thùng)
    IF (NEW.is_pack_sold = TRUE) THEN
        v_actual_deduction := delta_qty * v_units_per_pack;
    ELSE
        v_actual_deduction := delta_qty;
    END IF;

    -- 4. Thực hiện ghi Log và cập nhật Kho nếu có thay đổi
    IF v_actual_deduction != 0 THEN
        -- Ghi log với số lượng đã quy đổi
        INSERT INTO inventory_logs (product_id, type, quantity, reason, related_invoice_id)
        VALUES (
            NEW.product_id, 
            'SALE', 
            -v_actual_deduction, 
            CASE WHEN NEW.is_pack_sold THEN 'Bán theo gói/ống' ELSE 'Bán lẻ' END, 
            NEW.invoice_id
        );
        
        -- Trừ kho trực tiếp theo đơn vị nhỏ nhất
        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_actual_deduction
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_auto_sync_inventory"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "court_id" "uuid",
    "recurring_rule_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "actual_end_time" timestamp with time zone,
    "deposit_amount" numeric DEFAULT 0,
    "overtime_fee" numeric DEFAULT 0,
    "total_court_fee" numeric DEFAULT 0,
    "status" "public"."booking_status" DEFAULT 'PENDING'::"public"."booking_status",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_booking_time" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "court_name" "text" NOT NULL,
    "morning_price_loyal" numeric DEFAULT 50000,
    "evening_price_loyal" numeric DEFAULT 70000,
    "morning_price_guest" numeric DEFAULT 60000,
    "evening_price_guest" numeric DEFAULT 80000,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."courts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "type" "public"."customer_type" DEFAULT 'GUEST'::"public"."customer_type",
    "points" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "type" "public"."inventory_log_type" NOT NULL,
    "quantity" integer NOT NULL,
    "purchase_price" numeric,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "related_invoice_id" "uuid"
);


ALTER TABLE "public"."inventory_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "product_id" "uuid",
    "quantity" integer NOT NULL,
    "sale_price" numeric NOT NULL,
    "is_pack_sold" boolean DEFAULT false
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "customer_id" "uuid",
    "total_amount" numeric NOT NULL,
    "payment_method" "public"."payment_method" DEFAULT 'CASH'::"public"."payment_method",
    "is_paid" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" "text" NOT NULL,
    "base_unit" "text",
    "unit_price" numeric NOT NULL,
    "stock_quantity" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "units_per_pack" integer DEFAULT 1,
    "pack_price" numeric,
    "is_packable" boolean DEFAULT false,
    "pack_unit" "text" DEFAULT 'Ống'::"text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "court_id" "uuid",
    "day_of_week" integer,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE,
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recurring_rules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."recurring_rules" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_rules"
    ADD CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bookings_time" ON "public"."bookings" USING "btree" ("court_id", "start_time", "end_time");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_inv_logs_invoice_id" ON "public"."inventory_logs" USING "btree" ("related_invoice_id");



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at");



CREATE OR REPLACE TRIGGER "trg_sync_inv" AFTER INSERT OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."fn_auto_sync_inventory"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_recurring_rule_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."recurring_rules"
    ADD CONSTRAINT "recurring_rules_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id");



ALTER TABLE ONLY "public"."recurring_rules"
    ADD CONSTRAINT "recurring_rules_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."fn_auto_sync_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auto_sync_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auto_sync_inventory"() TO "service_role";


















GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."courts" TO "anon";
GRANT ALL ON TABLE "public"."courts" TO "authenticated";
GRANT ALL ON TABLE "public"."courts" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_logs" TO "anon";
GRANT ALL ON TABLE "public"."inventory_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_logs" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_rules" TO "anon";
GRANT ALL ON TABLE "public"."recurring_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_rules" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































