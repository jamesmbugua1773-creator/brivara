import 'dotenv/config';
import { prisma } from '../services/db';
import { activatePackage } from '../engines/activation';

async function showTotals(label: string, userId: string) {
  const roi = await prisma.rOILedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const bonus = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebate = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  console.log(label, {
    roi: Number(roi._sum.amount ?? 0),
    bonus: Number(bonus._sum.amount ?? 0),
    rebate: Number(rebate._sum.amount ?? 0),
  });
  const bonusRows = await prisma.bonusLedger.findMany({ where: { userId }, orderBy: { timestamp: 'asc' } });
  if (bonusRows.length) {
    console.table(bonusRows.map(b => ({ level: b.level, type: b.type, amount: Number(b.amount) })));
  }
}

async function main() {
  const U1 = await prisma.user.findFirst({ where: { username: 'U1' } });
  const U2 = await prisma.user.findFirst({ where: { username: 'U2' } });
  const U3 = await prisma.user.findFirst({ where: { username: 'U3' } });
  if (!U1 || !U2 || !U3) {
    console.log('Seed users not found. Run npm run seed first.');
    return;
  }
  console.log('Before activations:');
  await showTotals('U1 totals', U1.id);

  console.log('Activating packages for U2 (P5=500) and U3 (P4=250)...');
  await activatePackage(U2.id, 'P5');
  await activatePackage(U3.id, 'P4');

  console.log('After activations:');
  await showTotals('U1 totals', U1.id);
  await showTotals('U2 totals', U2.id);
  await showTotals('U3 totals', U3.id);

  // Assert investing users do not receive bonuses from their own capital
  const u2BonusAgg = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId: U2.id, sourceUserId: U2.id } });
  const u3BonusAgg = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId: U3.id, sourceUserId: U3.id } });
  const u2SelfBonus = Number(u2BonusAgg._sum.amount ?? 0);
  const u3SelfBonus = Number(u3BonusAgg._sum.amount ?? 0);
  if (u2SelfBonus !== 0 || u3SelfBonus !== 0) {
    console.error('Violation: investing users received self bonuses', { u2SelfBonus, u3SelfBonus });
    process.exit(2);
  } else {
    console.log('Self-bonus check passed: investing users earned no self bonuses.');
  }

  // Concise per-level summary for U1
  const u1BonusRows = await prisma.bonusLedger.findMany({ where: { userId: U1.id }, orderBy: { level: 'asc' } });
  const summary: Record<number, { direct: number; indirect: number }> = {};
  for (const row of u1BonusRows) {
    const lvl = row.level;
    if (!summary[lvl]) summary[lvl] = { direct: 0, indirect: 0 };
    if (row.type === 'DIRECT') summary[lvl].direct += Number(row.amount);
    if (row.type === 'INDIRECT') summary[lvl].indirect += Number(row.amount);
  }
  console.log('\nU1 per-level bonus summary (stacked):');
  const entries = Object.entries(summary).map(([lvl, v]) => ({ level: Number(lvl), direct: v.direct, indirect: v.indirect, total: v.direct + v.indirect }));
  console.table(entries);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
