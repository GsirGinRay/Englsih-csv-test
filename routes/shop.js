import { Router } from 'express';
import { SHOP_ITEMS, CONSUMABLE_ITEMS, CHEST_SHOP_ITEMS } from '../data/shop.js';

export default function createShopRouter({ prisma }) {
  const router = Router();

  // 取得所有商品
  router.get('/api/shop/items', (req, res) => {
    res.json(SHOP_ITEMS);
  });

  // 取得學生已購買的商品
  router.get('/api/profiles/:id/purchases', async (req, res) => {
    try {
      const purchases = await prisma.profilePurchase.findMany({ where: { profileId: req.params.id } });
      res.json(purchases);
    } catch (error) {
      console.error('Failed to get purchases:', error);
      res.status(500).json({ error: 'Failed to get purchases' });
    }
  });

  // 購買商品
  router.post('/api/profiles/:id/purchase', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId } = req.body;

      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const existing = await prisma.profilePurchase.findUnique({
        where: { profileId_itemId: { profileId: id, itemId } }
      });
      if (existing) return res.status(400).json({ error: 'Already purchased' });

      // 礦石巨人能力：商店價格-10%
      const activePet = await prisma.pet.findFirst({ where: { profileId: id, isActive: true } });
      const priceMultiplier = activePet?.species === 'ore_giant' ? 0.9 : 1.0;
      const finalPrice = Math.round(item.price * priceMultiplier);

      if (profile.stars < finalPrice) return res.status(400).json({ error: 'Not enough stars' });

      await prisma.$transaction([
        prisma.profile.update({ where: { id }, data: { stars: { decrement: finalPrice } } }),
        prisma.profilePurchase.create({ data: { profileId: id, itemId } })
      ]);

      const updatedProfile = await prisma.profile.findUnique({ where: { id }, include: { purchases: true } });
      res.json({ success: true, newStars: updatedProfile.stars, item });
    } catch (error) {
      console.error('Failed to purchase:', error);
      res.status(500).json({ error: 'Failed to purchase' });
    }
  });

  // 裝備物品
  router.post('/api/profiles/:id/equip', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId, type } = req.body;

      if (itemId) {
        const purchase = await prisma.profilePurchase.findUnique({
          where: { profileId_itemId: { profileId: id, itemId } }
        });
        if (!purchase) return res.status(400).json({ error: 'Item not purchased' });
      }

      const updateData = type === 'frame'
        ? { equippedFrame: itemId || null }
        : { equippedTheme: itemId || null };

      const updatedProfile = await prisma.profile.update({ where: { id }, data: updateData });
      res.json({ success: true, profile: updatedProfile });
    } catch (error) {
      console.error('Failed to equip:', error);
      res.status(500).json({ error: 'Failed to equip' });
    }
  });

  // 取得所有消耗品
  router.get('/api/shop/consumables', (req, res) => {
    res.json(CONSUMABLE_ITEMS);
  });

  // 取得寶箱商品
  router.get('/api/shop/chests', (req, res) => {
    res.json(CHEST_SHOP_ITEMS);
  });

  // 取得學生道具庫存
  router.get('/api/profiles/:id/items', async (req, res) => {
    try {
      const items = await prisma.profileItem.findMany({ where: { profileId: req.params.id } });
      res.json(items);
    } catch (error) {
      console.error('Failed to get items:', error);
      res.status(500).json({ error: 'Failed to get items' });
    }
  });

  // 購買消耗品
  router.post('/api/profiles/:id/purchase-consumable', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId, quantity = 1 } = req.body;

      const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const totalPrice = item.price * quantity;
      if (profile.stars < totalPrice) return res.status(400).json({ error: 'Not enough stars' });

      await prisma.$transaction(async (tx) => {
        await tx.profile.update({ where: { id }, data: { stars: { decrement: totalPrice } } });
        await tx.profileItem.upsert({
          where: { profileId_itemId: { profileId: id, itemId } },
          create: { profileId: id, itemId, quantity },
          update: { quantity: { increment: quantity } }
        });
      });

      const updatedProfile = await prisma.profile.findUnique({ where: { id } });
      const updatedItems = await prisma.profileItem.findMany({ where: { profileId: id } });
      res.json({ success: true, newStars: updatedProfile.stars, items: updatedItems });
    } catch (error) {
      console.error('Failed to purchase consumable:', error);
      res.status(500).json({ error: 'Failed to purchase consumable' });
    }
  });

  // 購買寶箱
  router.post('/api/profiles/:id/purchase-chest', async (req, res) => {
    try {
      const { id } = req.params;
      const { chestType, quantity = 1 } = req.body;

      const chestItem = CHEST_SHOP_ITEMS.find(c => c.chestType === chestType);
      if (!chestItem) return res.status(404).json({ error: 'Chest type not found' });

      const profile = await prisma.profile.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const totalPrice = chestItem.price * quantity;
      if (profile.stars < totalPrice) return res.status(400).json({ error: 'Not enough stars' });

      await prisma.$transaction(async (tx) => {
        await tx.profile.update({ where: { id }, data: { stars: { decrement: totalPrice } } });
        await tx.profileChest.upsert({
          where: { profileId_chestType: { profileId: id, chestType } },
          create: { profileId: id, chestType, quantity },
          update: { quantity: { increment: quantity } }
        });
      });

      const updatedProfile = await prisma.profile.findUnique({ where: { id } });
      const updatedChests = await prisma.profileChest.findMany({ where: { profileId: id } });
      res.json({ success: true, newStars: updatedProfile.stars, chests: updatedChests });
    } catch (error) {
      console.error('Failed to purchase chest:', error);
      res.status(500).json({ error: 'Failed to purchase chest' });
    }
  });

  // 使用消耗品道具
  router.post('/api/profiles/:id/use-item', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId } = req.body;

      const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const profileItem = await prisma.profileItem.findUnique({
        where: { profileId_itemId: { profileId: id, itemId } }
      });
      if (!profileItem || profileItem.quantity < 1) return res.status(400).json({ error: 'No item available' });

      if (profileItem.quantity === 1) {
        await prisma.profileItem.delete({ where: { profileId_itemId: { profileId: id, itemId } } });
      } else {
        await prisma.profileItem.update({
          where: { profileId_itemId: { profileId: id, itemId } },
          data: { quantity: { decrement: 1 } }
        });
      }

      const updatedItems = await prisma.profileItem.findMany({ where: { profileId: id } });
      res.json({ success: true, effect: item.effect, items: updatedItems });
    } catch (error) {
      console.error('Failed to use item:', error);
      res.status(500).json({ error: 'Failed to use item' });
    }
  });

  return router;
}
