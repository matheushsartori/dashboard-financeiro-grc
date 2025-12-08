CREATE TABLE "filiais" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	CONSTRAINT "filiais_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "contas_a_pagar" ADD COLUMN "cod_filial" integer;--> statement-breakpoint
ALTER TABLE "contas_a_receber" ADD COLUMN "cod_filial" integer;--> statement-breakpoint
ALTER TABLE "folha_pagamento" ADD COLUMN "tipo_vinculo" varchar(10);