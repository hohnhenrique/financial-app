# Próximos Passos

## Backend

* [ ] Routes

  * Melhorar o arquivo routes.php, separar em várias classes por módulos, criar diretório separado, web, api.


* [ ] ORM ou Query Builder

  * Exemplo: User::where('email', $email)->first(); igual o laravel.


* [x] Repositories

    * Qualquer acesso ao banco de dados deve passar por um repository.


* [x] Melhorar arquitetura

  * Criar classe abstrata ou factory da repository, usar interface, usar design pattern
  

* [x] Opção de deletar registros

  * Opção de deletar registros


* [x] Opção de editar registros

  * Opção de editar registros

## Frontend

* [x] Criar botão de nova movimentação na dashboard

  * Criar botão de nova movimentação na dashboard.


* [x] Criar elemetos padrões, usar uma linguagem de template

  * Exemplos: criar botões padrões e usar o mesmo em todos os lugares, campos, selects... 


* [ ] Criar opção para escolher valores de saldo, menos entradas e saídas

  * Criar opção para escolher valores de saldo, menos entradas e saídas.


* [x] Dashboard

    * Criar gráfico de gasto por tipo de despesas.


* [x] Dashboard

  * Criar gráfico de linha por valor que ficou o saldo por mês.


* [x] Dashboard

  * Criar gráfico de receitas e despesas por mês, pode ser de barras.


* [x] Dark mode

  * Criar dark mode e verificar se salvo em uma tabela de configs por usuários ou salvar na sessão.


* [x] Editar usuário

  * Tela para o usuários poder atualizar seus dados.


## Segurança

* [ ] Criar projeto no git lab ou github

    * Versionar projeto e deixar público

  
* [ ] Limitar criação de usuários

  * Pensar e criar algo para que só pode criar um novo usuário se eu permitir, para que não seja liberado para todo mundo criar um usuário e usar o sistema


* [x] Usuário super admin

  * Criar tela e permissionar para somente o super admin possa ver os usuários cadastrados.

## Banco de Dados

* [x] Tabela categories

  * Mudar o tipo de dado salvo


* [ ] Implementar seeders (semeadores)

    * Implementar seeders da mesma maneira que as migrations e criar readme

## Organização

* [ ] Documentar arquitetura

    * Criar documentação básica explicando padrão de IDs e estrutura do sistema.


* [ ] Criar backlog técnico

    * Separar melhorias futuras, bugs e otimizações.
