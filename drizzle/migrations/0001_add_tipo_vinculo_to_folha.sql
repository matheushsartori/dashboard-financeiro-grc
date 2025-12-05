-- Migration: Adicionar coluna tipo_vinculo à tabela folha_pagamento
ALTER TABLE "folha_pagamento" ADD COLUMN IF NOT EXISTS "tipo_vinculo" varchar(10);

-- Atualizar registros existentes com base em heurística
UPDATE "folha_pagamento" 
SET "tipo_vinculo" = CASE
  WHEN "tipo_pagamento" IS NULL THEN 'INDEFINIDO'
  WHEN UPPER("tipo_pagamento") LIKE '%PJ%' 
    OR UPPER("tipo_pagamento") LIKE '%NOTA FISCAL%'
    OR UPPER("tipo_pagamento") LIKE '%NF%'
    OR UPPER("tipo_pagamento") LIKE '%PRESTAÇÃO%'
    OR UPPER("tipo_pagamento") LIKE '%SERVIÇO%'
    OR UPPER("tipo_pagamento") LIKE '%CONSULTORIA%'
    OR UPPER("tipo_pagamento") LIKE '%TERCEIRIZADO%'
    OR (UPPER("area") LIKE '%PJ%' OR UPPER("area") LIKE '%TERCEIRIZADO%')
  THEN 'PJ'
  WHEN UPPER("tipo_pagamento") LIKE '%SALÁRIO%'
    OR UPPER("tipo_pagamento") LIKE '%SALARIO%'
    OR UPPER("tipo_pagamento") LIKE '%13º%'
    OR UPPER("tipo_pagamento") LIKE '%FÉRIAS%'
    OR UPPER("tipo_pagamento") LIKE '%FERIAS%'
    OR UPPER("tipo_pagamento") LIKE '%ADICIONAL%'
    OR UPPER("tipo_pagamento") LIKE '%BONUS%'
    OR UPPER("tipo_pagamento") LIKE '%BÔNUS%'
    OR UPPER("tipo_pagamento") LIKE '%PREMIAÇÃO%'
    OR UPPER("tipo_pagamento") LIKE '%COMISSÃO%'
    OR UPPER("tipo_pagamento") LIKE '%COMISSAO%'
    OR UPPER("tipo_pagamento") LIKE '%RETIRADA%'
    OR (UPPER("area") LIKE '%CLT%' OR UPPER("area") LIKE '%PF%')
  THEN 'CLT'
  ELSE 'INDEFINIDO'
END
WHERE "tipo_vinculo" IS NULL;


