CREATE TABLE `centros_custo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descricao` text NOT NULL,
	CONSTRAINT `centros_custo_id` PRIMARY KEY(`id`),
	CONSTRAINT `centros_custo_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `contas_a_pagar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`upload_id` int NOT NULL,
	`cc_sintetico` varchar(50),
	`descricao_cc_sintetico` text,
	`cc_analitico` varchar(50),
	`descricao_cc_analitico` text,
	`despesa_sintetico` varchar(50),
	`descricao_despesa_sintetico` text,
	`despesa_analitico` varchar(50),
	`descricao_despesa_analitica` text,
	`fixo_variavel` enum('FIXO','VARIÁVEL'),
	`data_lancamento` timestamp,
	`cod_conta` varchar(50),
	`cod_fornecedor` varchar(50),
	`fornecedor` varchar(255),
	`historico` text,
	`tipo_documento` varchar(50),
	`num_nota` varchar(100),
	`duplicata` varchar(100),
	`valor` int NOT NULL,
	`data_vencimento` timestamp,
	`valor_pago` int,
	`data_pagamento` timestamp,
	`mes` int,
	`num_banco` varchar(50),
	`banco` varchar(100),
	`agencia` varchar(50),
	`conta` varchar(50),
	CONSTRAINT `contas_a_pagar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_a_receber` (
	`id` int AUTO_INCREMENT NOT NULL,
	`upload_id` int NOT NULL,
	`cc_sintetico` varchar(50),
	`descricao_cc_sintetico` text,
	`cc_analitico` varchar(50),
	`descricao_cc_analitico` text,
	`receita_sintetico` varchar(50),
	`descricao_receita_sintetico` text,
	`receita_analitico` varchar(50),
	`descricao_receita_analitica` text,
	`data_lancamento` timestamp,
	`cliente` varchar(255),
	`historico` text,
	`tipo_documento` varchar(50),
	`num_nota` varchar(100),
	`valor` int NOT NULL,
	`data_vencimento` timestamp,
	`valor_recebido` int,
	`data_recebimento` timestamp,
	`mes` int,
	`num_banco` varchar(50),
	`banco` varchar(100),
	`agencia` varchar(50),
	`conta` varchar(50),
	CONSTRAINT `contas_a_receber_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folha_pagamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`upload_id` int NOT NULL,
	`area` varchar(100),
	`cc` varchar(50),
	`nome` varchar(255) NOT NULL,
	`tipo_pagamento` varchar(50),
	`mes_1` int,
	`mes_2` int,
	`mes_3` int,
	`mes_4` int,
	`mes_5` int,
	`mes_6` int,
	`mes_7` int,
	`mes_8` int,
	`total` int,
	CONSTRAINT `folha_pagamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `fornecedores_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `plano_contas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descricao` text NOT NULL,
	`tipo` enum('receita','despesa','cmv','outras') NOT NULL,
	CONSTRAINT `plano_contas_id` PRIMARY KEY(`id`),
	CONSTRAINT `plano_contas_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `saldos_bancarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`upload_id` int NOT NULL,
	`banco` varchar(100) NOT NULL,
	`tipo_conta` varchar(50),
	`saldo_total` int NOT NULL,
	`saldo_sistema` int,
	`desvio` int,
	`mes` int,
	`ano` int,
	CONSTRAINT `saldos_bancarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`error_message` text,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
