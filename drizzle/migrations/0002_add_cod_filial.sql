-- Migration: Adicionar coluna cod_filial às tabelas contas_a_pagar e contas_a_receber
ALTER TABLE "contas_a_pagar" ADD COLUMN IF NOT EXISTS "cod_filial" integer;
ALTER TABLE "contas_a_receber" ADD COLUMN IF NOT EXISTS "cod_filial" integer;

-- Criar índices para melhorar performance das consultas por filial
CREATE INDEX IF NOT EXISTS "idx_contas_a_pagar_cod_filial" ON "contas_a_pagar"("cod_filial");
CREATE INDEX IF NOT EXISTS "idx_contas_a_receber_cod_filial" ON "contas_a_receber"("cod_filial");

