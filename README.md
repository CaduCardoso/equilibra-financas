# Equilibra Finanças

MVP educacional de uma plataforma de organização financeira pessoal. O projeto reúne uma landing page comercial, diagnóstico financeiro, autenticação, painel individual, controle de gastos e uma integração experimental de pagamentos.

## Demonstração

[Acessar a versão publicada](https://equilibra-financas-app.vercel.app)

## Funcionalidades

- cadastro e login de usuários;
- renda mensal e meta de economia;
- registro, categorização e exclusão de gastos;
- saldo e indicadores calculados automaticamente;
- dados separados por usuário com Row Level Security;
- planos mensal, anual e planilha personalizada;
- webhook para ativação de acesso após pagamentos;
- interface responsiva em português do Brasil.

## Tecnologias

- HTML, CSS e JavaScript;
- Supabase Auth, Database e Edge Functions;
- Vendria para checkout e eventos de pagamento;
- Vercel para hospedagem.

## Executando localmente

1. Crie um projeto no Supabase.
2. Execute os arquivos da pasta `database` no SQL Editor, na ordem numérica.
3. Substitua os valores de exemplo em `supabase-client.js` pela URL e pela chave pública do seu projeto.
4. Configure os segredos da Edge Function conforme `.env.example`.
5. Publique `supabase/functions/vendria-webhook/index.ts` como uma Edge Function sem verificação JWT do gateway.
6. Sirva esta pasta com qualquer servidor HTTP estático.

## Segurança

Este repositório não contém chaves secretas. Nunca publique a service role do Supabase, a chave privada da Vendria ou o segredo do webhook. A chave pública usada pelo navegador só deve ser utilizada com políticas de RLS devidamente configuradas.

## Status

Projeto de estudo encerrado como MVP. O fluxo completo de pagamento não foi validado com uma transação real e não deve ser tratado como produto financeiro pronto para produção.

## Aviso

O Equilibra é uma ferramenta de organização pessoal e não oferece consultoria financeira, recomendação de investimento ou garantia de resultados.

