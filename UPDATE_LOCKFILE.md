# Como Atualizar o pnpm-lock.yaml

Se você estiver recebendo o erro `ERR_PNPM_OUTDATED_LOCKFILE`, execute:

```bash
pnpm install
```

Ou use o script:

```bash
npm run install:update
```

Isso atualizará o `pnpm-lock.yaml` para corresponder ao `package.json` atual.

## Nota

Se você estiver em um ambiente CI/CD ou editor que usa `--frozen-lockfile`, você precisará:
1. Atualizar o lockfile localmente executando `pnpm install`
2. Fazer commit do `pnpm-lock.yaml` atualizado
3. Ou remover temporariamente a flag `--frozen-lockfile` do script de instalação





