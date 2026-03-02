ALTER TABLE "contas_a_pagar" ADD COLUMN "ano" integer;--> statement-breakpoint
ALTER TABLE "contas_a_receber" ADD COLUMN "ano" integer;--> statement-breakpoint
ALTER TABLE "folha_pagamento" ADD COLUMN "mes" integer;--> statement-breakpoint
ALTER TABLE "folha_pagamento" ADD COLUMN "ano" integer;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "file_data" text;