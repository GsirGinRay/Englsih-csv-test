import { Router } from 'express';
import { PET_STAGES, PET_SPECIES, calculateRpgStats, getPetTypes, getStagesForPet, calculatePetStatus, calculateCurrentHunger } from '../data/pets.js';
import { EQUIPMENT_ITEMS, getActiveSetBonuses, EXCLUSIVE_SET_BONUSES } from '../data/equipment.js';

// 復活費用計算（等級越高越貴）
function getReviveCost(level) {
  if (level <= 5) return 20;
  if (level <= 10) return 40;
  if (level <= 15) return 60;
  if (level <= 20) return 80;
  if (level <= 25) return 100;
  return 100 + Math.floor((level - 25) / 5) * 20;
}

// 寵物資料富化（共用）
const enrichPetData = (pet) => {
  // 死亡寵物不計算衰減
  if (pet.isDead) {
    const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
    const allStages = getStagesForPet(pet.species, pet.evolutionPath);
    const currentStage = allStages.find(s => s.stage === status.stage);
    const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);
    const rpgStats = calculateRpgStats(pet.species, status.level);
    const types = getPetTypes(pet.species, pet.evolutionPath, status.stage);
    return {
      ...pet,
      hunger: 0, happiness: 0,
      level: status.level, stage: status.stage,
      expToNext: status.expToNext, currentExp: status.currentExp,
      stageName: currentStage?.name || '蛋',
      stages: PET_STAGES[pet.species] || PET_STAGES.spirit_dog,
      rarity: speciesInfo?.rarity || 'normal',
      rpgStats, types, evolutionPath: pet.evolutionPath,
      needsEvolutionChoice: false,
      ability: speciesInfo?.ability,
      isDead: true, deadAt: pet.deadAt,
      reviveCost: getReviveCost(status.level),
    };
  }
  const currentHunger = calculateCurrentHunger(pet);
  const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
  const hungerDecayRate = pet.species === 'seed_ball' ? 1.6 : 2;
  const hungerDecay = Math.floor(hoursSinceLastFed * hungerDecayRate);
  const currentHappiness = Math.max(0, pet.happiness - Math.floor(hungerDecay / 2));
  const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
  const stages = PET_STAGES[pet.species] || PET_STAGES.spirit_dog;
  const allStages = getStagesForPet(pet.species, pet.evolutionPath);
  const currentStage = allStages.find(s => s.stage === status.stage);
  const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);
  const rpgStats = calculateRpgStats(pet.species, status.level);
  const types = getPetTypes(pet.species, pet.evolutionPath, status.stage);
  return {
    ...pet,
    hunger: currentHunger, happiness: currentHappiness,
    level: status.level, stage: status.stage,
    expToNext: status.expToNext, currentExp: status.currentExp,
    stageName: currentStage?.name || '蛋',
    stages, rarity: speciesInfo?.rarity || 'normal',
    rpgStats, types, evolutionPath: pet.evolutionPath,
    needsEvolutionChoice: status.needsEvolutionChoice,
    ability: speciesInfo?.ability,
  };
};

export default function createPetsRouter({ prisma }) {
  const router = Router();

  // 取得可選寵物物種
  router.get('/api/pet-species', async (req, res) => {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      const unlockedRarities = settings?.unlockedPetRarities || ['normal', 'rare', 'legendary'];
      const filtered = PET_SPECIES.filter(s => unlockedRarities.includes(s.rarity));
      const speciesWithStages = filtered.map(s => ({
        ...s, stages: PET_STAGES[s.species] || PET_STAGES.spirit_dog
      }));
      res.json(speciesWithStages);
    } catch (error) {
      console.error('Failed to get pet species:', error);
      res.status(500).json({ error: 'Failed to get pet species' });
    }
  });

  // 取得所有寵物列表
  router.get('/api/profiles/:id/pets', async (req, res) => {
    try {
      const pets = await prisma.pet.findMany({
        where: { profileId: req.params.id },
        orderBy: { createdAt: 'asc' },
        include: { equipment: true }
      });
      res.json(pets.map(enrichPetData));
    } catch (error) {
      console.error('Failed to get pets:', error);
      res.status(500).json({ error: 'Failed to get pets' });
    }
  });

  // 取得 active 寵物
  router.get('/api/profiles/:id/pet', async (req, res) => {
    try {
      const pet = await prisma.pet.findFirst({
        where: { profileId: req.params.id, isActive: true },
        include: { equipment: true }
      });
      if (!pet) return res.json({ hasPet: false });
      res.json({ hasPet: true, ...enrichPetData(pet) });
    } catch (error) {
      console.error('Failed to get pet:', error);
      res.status(500).json({ error: 'Failed to get pet' });
    }
  });

  // 選擇並孵化寵物蛋
  router.post('/api/profiles/:id/pet/choose', async (req, res) => {
    try {
      const { id } = req.params;
      const { species } = req.body;

      const speciesInfo = PET_SPECIES.find(s => s.species === species);
      if (!speciesInfo) return res.status(400).json({ error: 'Invalid species' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      if (profile.stars < speciesInfo.price) {
        return res.status(400).json({ error: 'Not enough stars', required: speciesInfo.price, current: profile.stars });
      }

      const defaultName = `小${speciesInfo.name}`;
      const operations = [];

      operations.push(prisma.pet.updateMany({ where: { profileId: id, isActive: true }, data: { isActive: false } }));
      operations.push(prisma.pet.create({ data: { profileId: id, species, name: defaultName, isActive: true } }));

      const profileUpdateData = {};
      if (speciesInfo.price > 0) profileUpdateData.stars = { decrement: speciesInfo.price };
      if (!profile.unlockedSpecies.includes(species)) profileUpdateData.unlockedSpecies = { push: species };
      if (Object.keys(profileUpdateData).length > 0) {
        operations.push(prisma.profile.update({ where: { id }, data: profileUpdateData }));
      }
      if (speciesInfo.price > 0) {
        operations.push(prisma.starAdjustment.create({ data: { profileId: id, amount: -speciesInfo.price, reason: `孵化寵物 ${speciesInfo.name}`, source: 'shop' } }));
      }

      const results = await prisma.$transaction(operations);
      res.json({ success: true, pet: results[1], newStars: profile.stars - speciesInfo.price });
    } catch (error) {
      console.error('Failed to choose pet:', error);
      res.status(500).json({ error: 'Failed to choose pet' });
    }
  });

  // 切換展示寵物
  router.post('/api/profiles/:id/pet/switch', async (req, res) => {
    try {
      const { id } = req.params;
      const { petId } = req.body;

      if (!petId || typeof petId !== 'string') return res.status(400).json({ error: 'Invalid petId' });

      const pet = await prisma.pet.findFirst({ where: { id: petId, profileId: id } });
      if (!pet) return res.status(404).json({ error: 'Pet not found' });
      if (pet.isDead) return res.status(400).json({ error: '這隻寵物已經死亡，請先復活！', isDead: true });

      await prisma.$transaction([
        prisma.pet.updateMany({ where: { profileId: id, isActive: true }, data: { isActive: false } }),
        prisma.pet.update({ where: { id: petId }, data: { isActive: true } })
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to switch pet:', error);
      res.status(500).json({ error: 'Failed to switch pet' });
    }
  });

  // 餵食寵物
  router.post('/api/profiles/:id/pet/feed', async (req, res) => {
    try {
      const { id } = req.params;

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const feedCost = 5;
      if (profile.stars < feedCost) {
        return res.status(400).json({ error: 'Not enough stars', required: feedCost, current: profile.stars });
      }

      const pet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      if (!pet) return res.status(404).json({ error: 'No active pet' });
      if (pet.isDead) return res.status(400).json({ error: '這隻寵物已經死亡，無法餵食！', isDead: true });

      const currentHunger = calculateCurrentHunger(pet);

      // 飽食時拒絕餵食
      if (currentHunger >= 100) {
        return res.status(400).json({ error: '寵物已經吃飽了！', full: true });
      }

      const feedMultiplier = pet.species === 'jellyfish' ? 1.3 : 1.0;
      const newHunger = Math.min(100, currentHunger + Math.round(30 * feedMultiplier));
      const newHappiness = Math.min(100, pet.happiness + Math.round(20 * feedMultiplier));

      await prisma.$transaction([
        prisma.pet.update({ where: { id: pet.id }, data: { hunger: newHunger, happiness: newHappiness, lastFedAt: new Date() } }),
        prisma.profile.update({ where: { id }, data: { stars: { decrement: feedCost } } }),
        prisma.starAdjustment.create({ data: { profileId: id, amount: -feedCost, reason: '餵食寵物', source: 'feed' } })
      ]);

      res.json({ success: true, newHunger, newHappiness, cost: feedCost, remainingStars: profile.stars - feedCost });
    } catch (error) {
      console.error('Failed to feed pet:', error);
      res.status(500).json({ error: 'Failed to feed pet' });
    }
  });

  // 復活寵物
  router.post('/api/profiles/:id/pet/revive', async (req, res) => {
    try {
      const { id } = req.params;
      const { petId } = req.body;

      if (!petId) return res.status(400).json({ error: 'Missing petId' });

      const pet = await prisma.pet.findFirst({ where: { id: petId, profileId: id } });
      if (!pet) return res.status(404).json({ error: 'Pet not found' });
      if (!pet.isDead) return res.status(400).json({ error: '這隻寵物還活著！' });

      const status = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
      const cost = getReviveCost(status.level);

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      if (profile.stars < cost) {
        return res.status(400).json({ error: 'Not enough stars', required: cost, current: profile.stars });
      }

      // 復活：恢復狀態、設為 active
      await prisma.$transaction([
        prisma.pet.updateMany({ where: { profileId: id, isActive: true }, data: { isActive: false } }),
        prisma.pet.update({
          where: { id: petId },
          data: { isDead: false, deadAt: null, isActive: true, hunger: 50, happiness: 50, lastFedAt: new Date() },
        }),
        prisma.profile.update({ where: { id }, data: { stars: { decrement: cost } } }),
        prisma.starAdjustment.create({
          data: { profileId: id, amount: -cost, reason: `復活寵物 ${pet.name}`, source: 'revive' },
        }),
      ]);

      const updatedPet = await prisma.pet.findFirst({ where: { id: petId }, include: { equipment: true } });
      res.json({ success: true, pet: enrichPetData(updatedPet), cost, remainingStars: profile.stars - cost });
    } catch (error) {
      console.error('Failed to revive pet:', error);
      res.status(500).json({ error: 'Failed to revive pet' });
    }
  });

  // 增加寵物經驗值
  router.post('/api/profiles/:id/pet/gain-exp', async (req, res) => {
    try {
      const { id } = req.params;
      const { correctCount, doubleExpActive } = req.body;

      const pet = await prisma.pet.findFirst({
        where: { profileId: id, isActive: true },
        include: { equipment: true }
      });

      if (!pet) return res.json({ success: false, expGain: 0, levelUp: false, evolved: false, newLevel: 0, newStage: 0 });

      let expBonus = 0;
      for (const eq of (pet.equipment || [])) {
        const itemDef = EQUIPMENT_ITEMS.find(e => e.id === eq.itemId);
        if (itemDef && itemDef.bonusType === 'exp') expBonus += itemDef.bonusValue;
      }

      // 套裝經驗加成（含通用套裝和專屬套裝）
      const equippedItemIds = (pet.equipment || []).map(e => e.itemId);
      const setEffects = getActiveSetBonuses(equippedItemIds);
      for (const effect of setEffects) {
        if (effect.effect === 'exp_10') expBonus += 10;
        if (effect.effect === 'pet_exp_20') expBonus += 20;
        if (effect.effect === 'pet_exp_15') expBonus += 15;
        if (effect.effect === 'pet_exp_25') expBonus += 25;
      }

      let abilityExpBonus = 0;
      if (pet.species === 'nebula_fish') abilityExpBonus = 20;
      if (pet.species === 'circuit_fish') abilityExpBonus = 10;

      // 飽足度經驗倍率
      const currentHungerForExp = calculateCurrentHunger(pet);
      let hungerExpMultiplier = 1.0;
      if (currentHungerForExp >= 80) hungerExpMultiplier = 1.5;
      else if (currentHungerForExp >= 50) hungerExpMultiplier = 1.0;
      else if (currentHungerForExp >= 20) hungerExpMultiplier = 0.75;
      else hungerExpMultiplier = 0.5;

      const baseExpGain = correctCount * 5;
      let expGain = Math.round(baseExpGain * (1 + (expBonus + abilityExpBonus) / 100) * hungerExpMultiplier);

      // 雙倍經驗卡
      if (doubleExpActive) expGain *= 2;
      const happinessGain = correctCount * 2;

      const oldStatus = calculatePetStatus(pet.exp, pet.species, pet.evolutionPath);
      const newExp = pet.exp + expGain;
      const newStatus = calculatePetStatus(newExp, pet.species, pet.evolutionPath);

      const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
      const happinessDecayRate = pet.species === 'mushroom' ? 0.8 : 1.0;
      const happinessDecay = Math.floor(hoursSinceLastFed * happinessDecayRate);
      const currentHappiness = Math.max(0, pet.happiness - happinessDecay);
      const newHappiness = Math.min(100, currentHappiness + happinessGain);

      await prisma.pet.update({
        where: { id: pet.id },
        data: { exp: newExp, level: newStatus.level, stage: newStatus.stage, happiness: newHappiness }
      });

      const allStages = getStagesForPet(pet.species, pet.evolutionPath);
      const newStageInfo = allStages.find(s => s.stage === newStatus.stage);
      const speciesInfo = PET_SPECIES.find(s => s.species === pet.species);

      res.json({
        success: true, expGain,
        levelUp: newStatus.level > oldStatus.level,
        evolved: newStatus.stage > oldStatus.stage,
        newLevel: newStatus.level, newStage: newStatus.stage,
        stageName: newStageInfo?.name,
        species: pet.species, evolutionPath: pet.evolutionPath,
        rarity: speciesInfo?.rarity || 'normal',
        needsEvolutionChoice: newStatus.needsEvolutionChoice,
        hungerExpMultiplier,
      });
    } catch (error) {
      console.error('Failed to gain exp:', error);
      res.status(500).json({ error: 'Failed to gain exp' });
    }
  });

  // 重新命名寵物
  router.post('/api/profiles/:id/pet/rename', async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim().length === 0 || name.length > 20) return res.status(400).json({ error: 'Invalid name' });

      const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      if (!activePet) return res.status(404).json({ error: 'No active pet' });

      const pet = await prisma.pet.update({ where: { id: activePet.id }, data: { name: name.trim() } });
      res.json({ success: true, pet });
    } catch (error) {
      console.error('Failed to rename pet:', error);
      res.status(500).json({ error: 'Failed to rename pet' });
    }
  });

  // 選擇進化路線
  router.post('/api/profiles/:id/pet/choose-evolution', async (req, res) => {
    try {
      const { id } = req.params;
      const { path } = req.body;

      if (!path || !['A', 'B'].includes(path)) return res.status(400).json({ error: 'Invalid path, must be A or B' });

      const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      if (!activePet) return res.status(404).json({ error: 'No active pet' });
      if (activePet.evolutionPath) return res.status(400).json({ error: 'Evolution path already chosen' });

      const status = calculatePetStatus(activePet.exp, activePet.species, null);
      const stageData = PET_STAGES[activePet.species];
      if (!stageData || status.level < (stageData.evolutionLevel || 30)) {
        return res.status(400).json({ error: 'Pet level too low for evolution' });
      }

      const newStatus = calculatePetStatus(activePet.exp, activePet.species, path);
      await prisma.pet.update({
        where: { id: activePet.id },
        data: { evolutionPath: path, stage: newStatus.stage }
      });

      const speciesInfo = PET_SPECIES.find(s => s.species === activePet.species);
      const types = getPetTypes(activePet.species, path, newStatus.stage);
      const allStages = getStagesForPet(activePet.species, path);
      const currentStage = allStages.find(s => s.stage === newStatus.stage);

      let evolutionStarBonus = 0;
      if (activePet.species === 'young_scale') {
        evolutionStarBonus = 50;
        await prisma.$transaction([
          prisma.profile.update({
            where: { id },
            data: { stars: { increment: evolutionStarBonus }, totalStars: { increment: evolutionStarBonus } }
          }),
          prisma.starAdjustment.create({ data: { profileId: id, amount: evolutionStarBonus, reason: '進化獎勵（幼龍鱗）', source: 'evolution' } })
        ]);
      }

      res.json({
        success: true, pet: { ...activePet, evolutionPath: path, stage: newStatus.stage },
        newTypes: types, stageName: currentStage?.name,
        pathName: path === 'A' ? speciesInfo?.pathA?.name : speciesInfo?.pathB?.name,
        evolutionStarBonus,
      });
    } catch (error) {
      console.error('Failed to choose evolution:', error);
      res.status(500).json({ error: 'Failed to choose evolution' });
    }
  });

  // 裝備商品列表
  router.get('/api/equipment-items', (req, res) => {
    res.json(EQUIPMENT_ITEMS);
  });

  // 購買並裝備（已擁有的裝備免費重新裝備）
  router.post('/api/profiles/:id/pet/equip', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId } = req.body;

      const itemDef = EQUIPMENT_ITEMS.find(e => e.id === itemId);
      if (!itemDef) return res.status(400).json({ error: 'Invalid equipment item' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      if (!activePet) return res.status(404).json({ error: 'No active pet' });

      // 專屬裝備限制：只能裝在對應寵物上
      if (itemDef.exclusiveSpecies && itemDef.exclusiveSpecies !== activePet.species) {
        const speciesInfo = PET_SPECIES.find(s => s.species === itemDef.exclusiveSpecies);
        return res.status(400).json({ error: `此裝備為 ${speciesInfo?.name || itemDef.exclusiveSpecies} 專屬，無法裝備在其他寵物上` });
      }

      // 進化階段檢查
      if (itemDef.requiredStage) {
        const petStatus = calculatePetStatus(activePet.exp, activePet.species, activePet.evolutionPath);
        if (petStatus.stage < itemDef.requiredStage) {
          return res.status(400).json({
            error: `需要進化到第 ${itemDef.requiredStage} 階段才能裝備`,
            requiredStage: itemDef.requiredStage,
            currentStage: petStatus.stage
          });
        }
      }

      // 計算擁有數 vs 已裝備數
      const ownedCount = await prisma.profilePurchase.count({
        where: { profileId: id, itemId }
      });
      const equippedCount = await prisma.petEquipment.count({
        where: { profileId: id, itemId: itemDef.id }
      });

      // 檢查目前寵物同槽位裝備
      const currentSlotEquip = await prisma.petEquipment.findFirst({
        where: { petId: activePet.id, slot: itemDef.slot }
      });

      // 若目前寵物同槽位已裝此物品 → 不用任何操作
      if (currentSlotEquip?.itemId === itemDef.id) {
        const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
        return res.json({ success: true, equipment, newStars: profile.stars });
      }

      // 計算裝上後需要的副本數：裝上新的 +1，但如果卸下同槽位的同物品則 -1
      const willFreeOne = currentSlotEquip?.itemId === itemDef.id ? 1 : 0;
      const newEquippedCount = equippedCount + 1 - willFreeOne;

      if (ownedCount >= newEquippedCount) {
        // 有空閒副本 → 免費裝備
        await prisma.$transaction([
          prisma.petEquipment.deleteMany({ where: { petId: activePet.id, slot: itemDef.slot } }),
          prisma.petEquipment.create({ data: { profileId: id, petId: activePet.id, slot: itemDef.slot, itemId: itemDef.id } })
        ]);
        const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
        res.json({ success: true, equipment, newStars: profile.stars });
      } else {
        // 無空閒副本 → 需要購買新的一份
        if (itemDef.price > 0 && profile.stars < itemDef.price) {
          return res.status(400).json({ error: 'Not enough stars', required: itemDef.price, current: profile.stars });
        }
        const ops = [
          prisma.petEquipment.deleteMany({ where: { petId: activePet.id, slot: itemDef.slot } }),
          prisma.petEquipment.create({ data: { profileId: id, petId: activePet.id, slot: itemDef.slot, itemId: itemDef.id } }),
          prisma.profilePurchase.create({ data: { profileId: id, itemId } }),
        ];
        if (itemDef.price > 0) {
          ops.push(prisma.profile.update({ where: { id }, data: { stars: { decrement: itemDef.price } } }));
          ops.push(prisma.starAdjustment.create({ data: { profileId: id, amount: -itemDef.price, reason: `購買裝備 ${itemDef.name}`, source: 'shop' } }));
        }
        await prisma.$transaction(ops);
        const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
        res.json({ success: true, equipment, newStars: profile.stars - (itemDef.price || 0) });
      }
    } catch (error) {
      console.error('Failed to equip:', error);
      res.status(500).json({ error: 'Failed to equip' });
    }
  });

  // 卸除裝備
  router.post('/api/profiles/:id/pet/unequip', async (req, res) => {
    try {
      const { id } = req.params;
      const { slot } = req.body;

      if (!['hat', 'necklace', 'wings', 'weapon'].includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

      const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      if (!activePet) return res.status(404).json({ error: 'No active pet' });

      await prisma.petEquipment.deleteMany({ where: { petId: activePet.id, slot } });
      const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
      res.json({ success: true, equipment });
    } catch (error) {
      console.error('Failed to unequip:', error);
      res.status(500).json({ error: 'Failed to unequip' });
    }
  });

  // 取得寵物裝備（?all=true 回傳所有寵物的裝備）
  router.get('/api/profiles/:id/pet/equipment', async (req, res) => {
    try {
      if (req.query.all === 'true') {
        const allEquip = await prisma.petEquipment.findMany({
          where: { profileId: req.params.id }
        });
        return res.json(allEquip);
      }
      const activePet = await prisma.pet.findFirst({ where: { profileId: req.params.id, isActive: true } });
      if (!activePet) return res.json([]);
      const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
      res.json(equipment);
    } catch (error) {
      console.error('Failed to get equipment:', error);
      res.status(500).json({ error: 'Failed to get equipment' });
    }
  });

  // 圖鑑 API
  router.get('/api/profiles/:id/pokedex', async (req, res) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: req.params.id },
        select: { unlockedSpecies: true }
      });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const pets = await prisma.pet.findMany({
        where: { profileId: req.params.id },
        select: { species: true }
      });

      const ownedCount = {};
      for (const p of pets) ownedCount[p.species] = (ownedCount[p.species] || 0) + 1;

      const ownedPets = await prisma.pet.findMany({
        where: { profileId: req.params.id },
        select: { species: true, evolutionPath: true }
      });
      const unlockedPaths = {};
      for (const p of ownedPets) {
        if (!unlockedPaths[p.species]) unlockedPaths[p.species] = { A: false, B: false };
        if (p.evolutionPath === 'A') unlockedPaths[p.species].A = true;
        if (p.evolutionPath === 'B') unlockedPaths[p.species].B = true;
      }

      const pokedex = PET_SPECIES.map(sp => ({
        species: sp.species, name: sp.name, price: sp.price,
        rarity: sp.rarity, description: sp.description,
        baseType: sp.baseType, pathA: sp.pathA, pathB: sp.pathB,
        ability: sp.ability,
        stages: PET_STAGES[sp.species] || PET_STAGES.spirit_dog,
        unlocked: profile.unlockedSpecies.includes(sp.species),
        ownedCount: ownedCount[sp.species] || 0,
        unlockedPaths: unlockedPaths[sp.species] || { A: false, B: false },
      }));

      res.json({ total: PET_SPECIES.length, unlocked: profile.unlockedSpecies.length, entries: pokedex });
    } catch (error) {
      console.error('Failed to get pokedex:', error);
      res.status(500).json({ error: 'Failed to get pokedex' });
    }
  });

  return router;
}
