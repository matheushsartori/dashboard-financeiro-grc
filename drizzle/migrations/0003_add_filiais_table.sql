-- Criar tabela de filiais para armazenar nomes dinamicamente
CREATE TABLE IF NOT EXISTS "filiais" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" integer NOT NULL UNIQUE,
	"nome" varchar(255) NOT NULL
);

-- Criar índice para busca rápida por código
CREATE INDEX IF NOT EXISTS "filiais_codigo_idx" ON "filiais" ("codigo");

