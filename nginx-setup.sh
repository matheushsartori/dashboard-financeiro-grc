#!/bin/bash

# Script para configurar Nginx para grc.grupo220.com.br
# Execute com: sudo bash nginx-setup.sh

set -e

DOMAIN="grc.grupo220.com.br"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

echo "🔧 Configurando Nginx para ${DOMAIN}..."

# Verificar se Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx não está instalado. Instalando..."
    sudo apt update
    sudo apt install -y nginx certbot python3-certbot-nginx
fi

# Copiar configuração
echo "📝 Copiando configuração do Nginx..."
sudo cp nginx.conf "${NGINX_CONF}"

# Criar link simbólico
if [ -L "${NGINX_ENABLED}" ]; then
    echo "⚠️  Link simbólico já existe, removendo..."
    sudo rm "${NGINX_ENABLED}"
fi

sudo ln -s "${NGINX_CONF}" "${NGINX_ENABLED}"

# Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração do Nginx está correta!"
    
    # Obter certificado SSL (se ainda não tiver)
    if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo "🔒 Obtendo certificado SSL com Let's Encrypt..."
        echo "⚠️  Certifique-se de que o domínio está apontando para este servidor!"
        read -p "Continuar? (s/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@grupo220.com.br || {
                echo "⚠️  Falha ao obter certificado. Configure manualmente ou verifique o DNS."
                echo "📝 Você pode obter o certificado depois com:"
                echo "   sudo certbot --nginx -d ${DOMAIN}"
            }
        fi
    else
        echo "✅ Certificado SSL já existe!"
    fi
    
    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "✅ Configuração concluída!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Certifique-se de que a aplicação está rodando na porta 3010"
    echo "2. Verifique se o DNS está apontando para este servidor"
    echo "3. Se o certificado SSL não foi obtido, execute:"
    echo "   sudo certbot --nginx -d ${DOMAIN}"
    echo ""
    echo "🔍 Verificar status:"
    echo "   sudo systemctl status nginx"
    echo "   sudo nginx -t"
    echo ""
else
    echo "❌ Erro na configuração do Nginx. Verifique os logs."
    exit 1
fi

