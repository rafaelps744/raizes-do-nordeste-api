import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('Senha@123', 10);

  const usuarios = [
    { nome: 'Ana Admin', email: 'admin@raizes.com', perfil: 'ADMIN' as const, consentimentoFidelidade: false },
    { nome: 'Gabriel Gerente', email: 'gerente@raizes.com', perfil: 'GERENTE' as const, consentimentoFidelidade: false },
    { nome: 'Bia Atendente', email: 'atendente@raizes.com', perfil: 'ATENDENTE' as const, consentimentoFidelidade: false },
    { nome: 'Caco Cozinha', email: 'cozinha@raizes.com', perfil: 'COZINHA' as const, consentimentoFidelidade: false },
    {
      nome: 'Maria Cliente',
      email: 'cliente@raizes.com',
      perfil: 'CLIENTE' as const,
      consentimentoFidelidade: true,
    },
  ];

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        senhaHash,
        consentimentoFidelidadeEm: u.consentimentoFidelidade ? new Date() : null,
        consentimentos: u.consentimentoFidelidade
          ? {
              create: {
                finalidade: 'Programa de fidelização e acúmulo de pontos',
                baseLegal: 'Consentimento (art. 7º, I, LGPD)',
                aceito: true,
              },
            }
          : undefined,
        fidelidade: u.consentimentoFidelidade ? { create: { pontos: 0 } } : undefined,
      },
    });
  }

  const unidadesData = [
    { nome: 'Raízes Recife – Boa Viagem', cidade: 'Recife', estado: 'PE', endereco: 'Av. Boa Viagem, 1000' },
    { nome: 'Raízes Salvador – Pelourinho', cidade: 'Salvador', estado: 'BA', endereco: 'Largo do Pelourinho, 50' },
    { nome: 'Raízes Fortaleza – Beira Mar', cidade: 'Fortaleza', estado: 'CE', endereco: 'Av. Beira Mar, 200' },
  ];

  const unidades = [];
  for (const und of unidadesData) {
    const existente = await prisma.unidade.findFirst({ where: { nome: und.nome } });
    unidades.push(
      existente ??
        (await prisma.unidade.create({ data: und })),
    );
  }

  const produtosData = [
    { nome: 'Tapioca de Carne de Sol', descricao: 'Tapioca recheada com carne de sol e queijo coalho', preco: 18.9, categoria: 'Salgados' },
    { nome: 'Acarajé Mini', descricao: 'Porção de acarajé com vatapá', preco: 16.5, categoria: 'Salgados' },
    { nome: 'Suco de Caju', descricao: 'Suco natural 400ml', preco: 9.9, categoria: 'Bebidas' },
    { nome: 'Caldo de Sururu', descricao: 'Caldo típico servido quente', preco: 14.9, categoria: 'Caldos' },
    { nome: 'Cartola', descricao: 'Banana, queijo e canela', preco: 12.5, categoria: 'Doces' },
  ];

  const produtos = [];
  for (const p of produtosData) {
    const existente = await prisma.produto.findFirst({ where: { nome: p.nome } });
    produtos.push(existente ?? (await prisma.produto.create({ data: p })));
  }

  for (const unidade of unidades) {
    for (const produto of produtos) {
      await prisma.cardapioUnidade.upsert({
        where: {
          unidadeId_produtoId: { unidadeId: unidade.id, produtoId: produto.id },
        },
        update: { disponivel: true },
        create: { unidadeId: unidade.id, produtoId: produto.id, disponivel: true },
      });
      await prisma.estoque.upsert({
        where: {
          unidadeId_produtoId: { unidadeId: unidade.id, produtoId: produto.id },
        },
        update: { quantidade: 40 },
        create: { unidadeId: unidade.id, produtoId: produto.id, quantidade: 40 },
      });
    }
  }

  await prisma.promocao.upsert({
    where: { codigo: 'NORDESTE10' },
    update: { ativa: true, percentual: 10 },
    create: {
      codigo: 'NORDESTE10',
      descricao: '10% de desconto em pedidos da campanha São João',
      percentual: 10,
      ativa: true,
    },
  });

  console.log('Seed concluído. Usuários: admin/gerente/atendente/cozinha/cliente@raizes.com | senha Senha@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
