import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  console.log('=== Settings ===');
  console.log('teacherPassword:', settings?.teacherPassword);
  console.log('questionTypes:', settings?.questionTypes);

  console.log('\n=== WordFiles (matching 英文初級 / 初級檢定) ===');
  const files = await prisma.wordFile.findMany({
    where: {
      OR: [
        { name: { contains: '英文初級' } },
        { name: { contains: '初級檢定' } },
        { name: { contains: '初級' } },
      ],
    },
    include: { _count: { select: { words: true } } },
  });
  for (const f of files) {
    console.log(`  ${f.id}  | ${f.name}  | words=${f._count.words}  | category=${f.category}`);
  }

  if (files.length === 0) {
    console.log('\n(no match) — listing ALL files:');
    const all = await prisma.wordFile.findMany({ include: { _count: { select: { words: true } } } });
    for (const f of all) {
      console.log(`  ${f.id}  | ${f.name}  | words=${f._count.words}`);
    }
  }

  console.log('\n=== Profiles named Ian (case-insensitive contains) ===');
  const ians = await prisma.profile.findMany({
    where: { name: { contains: 'Ian', mode: 'insensitive' } },
  });
  for (const p of ians) {
    console.log(`  ${p.id}  | ${p.name}  | stars=${p.stars}`);
  }

  console.log('\n=== Existing CustomQuizzes (any) ===');
  const cqs = await prisma.customQuiz.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  for (const c of cqs) {
    console.log(`  ${c.id}  | ${c.name}  | wordIds.length=${c.wordIds.length}  | assigned=${JSON.stringify(c.assignedProfileIds)}  | active=${c.active}  | expiresAt=${c.expiresAt}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
