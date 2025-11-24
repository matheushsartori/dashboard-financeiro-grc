CREATE TYPE "public"."fixo_variavel" AS ENUM('FIXO', 'VARIÁVEL');--> statement-breakpoint
CREATE TYPE "public"."plano_contas_tipo" AS ENUM('receita', 'despesa', 'cmv', 'outras');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "centros_custo" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"descricao" text NOT NULL,
	CONSTRAINT "centros_custo_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "contas_a_pagar" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"cc_sintetico" varchar(50),
	"descricao_cc_sintetico" text,
	"cc_analitico" varchar(50),
	"descricao_cc_analitico" text,
	"despesa_sintetico" varchar(50),
	"descricao_despesa_sintetico" text,
	"despesa_analitico" varchar(50),
	"descricao_despesa_analitica" text,
	"fixo_variavel" "fixo_variavel",
	"data_lancamento" timestamp,
	"cod_conta" varchar(50),
	"cod_fornecedor" varchar(50),
	"fornecedor" varchar(255),
	"historico" text,
	"tipo_documento" varchar(50),
	"num_nota" varchar(100),
	"duplicata" varchar(100),
	"valor" integer NOT NULL,
	"data_vencimento" timestamp,
	"valor_pago" integer,
	"data_pagamento" timestamp,
	"mes" integer,
	"num_banco" varchar(50),
	"banco" varchar(100),
	"agencia" varchar(50),
	"conta" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "contas_a_receber" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"cc_sintetico" varchar(50),
	"descricao_cc_sintetico" text,
	"cc_analitico" varchar(50),
	"descricao_cc_analitico" text,
	"receita_sintetico" varchar(50),
	"descricao_receita_sintetico" text,
	"receita_analitico" varchar(50),
	"descricao_receita_analitica" text,
	"data_lancamento" timestamp,
	"cliente" varchar(255),
	"historico" text,
	"tipo_documento" varchar(50),
	"num_nota" varchar(100),
	"valor" integer NOT NULL,
	"data_vencimento" timestamp,
	"valor_recebido" integer,
	"data_recebimento" timestamp,
	"mes" integer,
	"num_banco" varchar(50),
	"banco" varchar(100),
	"agencia" varchar(50),
	"conta" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "folha_pagamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"area" varchar(100),
	"cc" varchar(50),
	"nome" varchar(255) NOT NULL,
	"tipo_pagamento" varchar(50),
	"mes_1" integer,
	"mes_2" integer,
	"mes_3" integer,
	"mes_4" integer,
	"mes_5" integer,
	"mes_6" integer,
	"mes_7" integer,
	"mes_8" integer,
	"total" integer
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nome" varchar(255) NOT NULL,
	CONSTRAINT "fornecedores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "plano_contas" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"descricao" text NOT NULL,
	"tipo" "plano_contas_tipo" NOT NULL,
	CONSTRAINT "plano_contas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "saldos_bancarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"banco" varchar(100) NOT NULL,
	"tipo_conta" varchar(50),
	"saldo_total" integer NOT NULL,
	"saldo_sistema" integer,
	"desvio" integer,
	"mes" integer,
	"ano" integer
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"status" "upload_status" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
