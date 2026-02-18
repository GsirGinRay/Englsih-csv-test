import { Router } from 'express';
import { PET_STAGES, PET_SPECIES, calculateRpgStats, getPetTypes, getStagesForPet, calculatePetStatus } from '../data/pets.js';
import { EQUIPMENT_ITEMS } from '../data/equipment.js';

// 寵物資料富化（共用）
const enrichPetData = (pet) => {
  const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
  const hungerDecay = Math.floor(hoursSinceLastFed * 2);
  const currentHunger = Math.max(0, pet.hunger - hungerDecay);
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
    stageName: currentStage?.name || '蛋', stageIcon: '🐾',
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

      const hoursSinceLastFed = (Date.now() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60);
      const hungerDecayRate = pet.species === 'seed_ball' ? 1.6 : 2;
      const hungerDecay = Math.floor(hoursSinceLastFed * hungerDecayRate);
      const currentHunger = Math.max(0, pet.hunger - hungerDecay);

      const feedMultiplier = pet.species === 'jellyfish' ? 1.3 : 1.0;
      const newHunger = Math.min(100, currentHunger + Math.round(30 * feedMultiplier));
      const newHappiness = Math.min(100, pet.happiness + Math.round(20 * feedMultiplier));

      await prisma.$transaction([
        prisma.pet.update({ where: { id: pet.id }, data: { hunger: newHunger, happiness: newHappiness, lastFedAt: new Date() } }),
        prisma.profile.update({ where: { id }, data: { stars: { decrement: feedCost } } })
      ]);

      res.json({ success: true, newHunger, newHappiness, cost: feedCost, remainingStars: profile.stars - feedCost });
    } catch (error) {
      console.error('Failed to feed pet:', error);
      res.status(500).json({ error: 'Failed to feed pet' });
    }
  });

  // 增加寵物經驗值
  router.post('/api/profiles/:id/pet/gain-exp', async (req, res) => {
    try {
      const { id } = req.params;
      const { correctCount } = req.body;

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

      let abilityExpBonus = 0;
      if (pet.species === 'nebula_fish') abilityExpBonus = 20;
      if (pet.species === 'circuit_fish') abilityExpBonus = 10;

      const baseExpGain = correctCount * 5;
      const expGain = Math.round(baseExpGain * (1 + (expBonus + abilityExpBonus) / 100));
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

      res.json({
        success: true, expGain,
        levelUp: newStatus.level > oldStatus.level,
        evolved: newStatus.stage > oldStatus.stage,
        newLevel: newStatus.level, newStage: newStatus.stage,
        stageName: newStageInfo?.name, stageIcon: '🐾',
        needsEvolutionChoice: newStatus.needsEvolutionChoice,
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
        await prisma.profile.update({
          where: { id },
          data: { stars: { increment: evolutionStarBonus }, totalStars: { increment: evolutionStarBonus } }
        });
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

      // 檢查是否已擁有此裝備
      const alreadyOwned = await prisma.profilePurchase.findUnique({
        where: { profileId_itemId: { profileId: id, itemId } }
      });

      if (alreadyOwned) {
        // 已擁有：免費裝備
        await prisma.$transaction([
          prisma.petEquipment.deleteMany({ where: { petId: activePet.id, slot: itemDef.slot } }),
          prisma.petEquipment.create({ data: { profileId: id, petId: activePet.id, slot: itemDef.slot, itemId: itemDef.id } })
        ]);
        const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
        res.json({ success: true, equipment, newStars: profile.stars });
      } else {
        // 未擁有：需要購買
        if (profile.stars < itemDef.price) {
          return res.status(400).json({ error: 'Not enough stars', required: itemDef.price, current: profile.stars });
        }
        await prisma.$transaction([
          prisma.petEquipment.deleteMany({ where: { petId: activePet.id, slot: itemDef.slot } }),
          prisma.petEquipment.create({ data: { profileId: id, petId: activePet.id, slot: itemDef.slot, itemId: itemDef.id } }),
          prisma.profile.update({ where: { id }, data: { stars: { decrement: itemDef.price } } }),
          prisma.profilePurchase.create({ data: { profileId: id, itemId } })
        ]);
        const equipment = await prisma.petEquipment.findMany({ where: { petId: activePet.id } });
        res.json({ success: true, equipment, newStars: profile.stars - itemDef.price });
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

  // 取得寵物裝備
  router.get('/api/profiles/:id/pet/equipment', async (req, res) => {
    try {
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
