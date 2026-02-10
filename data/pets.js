// 寵物進化階段定義（分支式）
export const PET_STAGES = {
  spirit_dog: {
    shared: [
      { stage: 1, name: '靈犬蛋', minLevel: 1 },
      { stage: 2, name: '絨絨犬', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '輝樂狼', minLevel: 30 },
      { stage: 4, name: '聖光麒麟犬', minLevel: 60 },
      { stage: 5, name: '最終聖光麒麟犬', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '影爪狼', minLevel: 30 },
      { stage: 4, name: '月蝕狼人', minLevel: 60 },
      { stage: 5, name: '最終月蝕狼人', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  chick_bird: {
    shared: [
      { stage: 1, name: '雛鳥蛋', minLevel: 1 },
      { stage: 2, name: '雲雀寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '雷雲鷹', minLevel: 30 },
      { stage: 4, name: '嘉雷鵬王', minLevel: 60 },
      { stage: 5, name: '最終嘉雷鵬王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '霜翼鴞', minLevel: 30 },
      { stage: 4, name: '極地冰鳳', minLevel: 60 },
      { stage: 5, name: '最終極地冰鳳', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  young_scale: {
    shared: [
      { stage: 1, name: '幼鱗蛋', minLevel: 1 },
      { stage: 2, name: '黏黏泥鰻', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '激流海蛇', minLevel: 30 },
      { stage: 4, name: '深海滄龍', minLevel: 60 },
      { stage: 5, name: '最終深海滄龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '沼澤巨蛙', minLevel: 30 },
      { stage: 4, name: '劇毒沼王', minLevel: 60 },
      { stage: 5, name: '最終劇毒沼王', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  beetle: {
    shared: [
      { stage: 1, name: '甲蟲蛋', minLevel: 1 },
      { stage: 2, name: '硬殼幼蟲', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '武士蟑', minLevel: 30 },
      { stage: 4, name: '鋼鐵大獨角仙', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵獨角仙', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '幻夢蛾', minLevel: 30 },
      { stage: 4, name: '星雲皇蛾', minLevel: 60 },
      { stage: 5, name: '最終星雲皇蛾', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  electric_mouse: {
    shared: [
      { stage: 1, name: '微電鼠蛋', minLevel: 1 },
      { stage: 2, name: '微電鼠', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '數據鼠', minLevel: 30 },
      { stage: 4, name: '賽博黑麥鼠', minLevel: 60 },
      { stage: 5, name: '最終量子主機鼠', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '孢子鼠', minLevel: 30 },
      { stage: 4, name: '蘑菇發電鼠', minLevel: 60 },
      { stage: 5, name: '最終真菌雷神鼠', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  hard_crab: {
    shared: [
      { stage: 1, name: '硬殼蟹蛋', minLevel: 1 },
      { stage: 2, name: '小石蟹', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '熔岩蟹', minLevel: 30 },
      { stage: 4, name: '火山壘疊蟹', minLevel: 60 },
      { stage: 5, name: '最終熔岩巨像蟹', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '深海發光蟹', minLevel: 30 },
      { stage: 4, name: '煙霧安康蟹', minLevel: 60 },
      { stage: 5, name: '最終深淵海溝蟹', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  mimic_lizard: {
    shared: [
      { stage: 1, name: '擬態蜥蛋', minLevel: 1 },
      { stage: 2, name: '變色小蜥', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '幻影蜥', minLevel: 30 },
      { stage: 4, name: '鏡像魔蜥', minLevel: 60 },
      { stage: 5, name: '最終虛空幻象龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '格鬥蜥', minLevel: 30 },
      { stage: 4, name: '武術大師蜥', minLevel: 60 },
      { stage: 5, name: '最終宗師門戰龍', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  seed_ball: {
    shared: [
      { stage: 1, name: '種子球蛋', minLevel: 1 },
      { stage: 2, name: '奇異種子', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '太陽花苞', minLevel: 30 },
      { stage: 4, name: '光合向日葵', minLevel: 60 },
      { stage: 5, name: '最終太陽神木精', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '寄生蘑蔓', minLevel: 30 },
      { stage: 4, name: '吸血荊棘怪', minLevel: 60 },
      { stage: 5, name: '最終腐朽魔花君主', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  jellyfish: {
    shared: [
      { stage: 1, name: '水母蛋', minLevel: 1 },
      { stage: 2, name: '軟綿水母', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '光輝水母', minLevel: 30 },
      { stage: 4, name: '聖潔水母', minLevel: 60 },
      { stage: 5, name: '最終治癒海靈', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '劇毒水母', minLevel: 30 },
      { stage: 4, name: '腐蝕水母', minLevel: 60 },
      { stage: 5, name: '最終深淵毒皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  ore_giant: {
    shared: [
      { stage: 1, name: '礦石蛋', minLevel: 1 },
      { stage: 2, name: '小石怪', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '鐵礦怪', minLevel: 30 },
      { stage: 4, name: '合金堡壘', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵巨神', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '晶石怪', minLevel: 30 },
      { stage: 4, name: '雷電晶簇', minLevel: 60 },
      { stage: 5, name: '最終能量晶核', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  jungle_cub: {
    shared: [
      { stage: 1, name: '幼獸蛋', minLevel: 1 },
      { stage: 2, name: '葉尾小獸', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '猛葉獸', minLevel: 30 },
      { stage: 4, name: '森之力士', minLevel: 60 },
      { stage: 5, name: '最終叢林霸主', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '擬態葉靈', minLevel: 30 },
      { stage: 4, name: '幽影樹靈', minLevel: 60 },
      { stage: 5, name: '最終森林魅影', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  sky_dragon: {
    shared: [
      { stage: 1, name: '幼龍蛋', minLevel: 1 },
      { stage: 2, name: '幼龍寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '炎翼龍', minLevel: 30 },
      { stage: 4, name: '爆炎飛龍', minLevel: 60 },
      { stage: 5, name: '最終末日炎龍', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '暴風龍', minLevel: 30 },
      { stage: 4, name: '疾風天龍', minLevel: 60 },
      { stage: 5, name: '最終蒼穹風神', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  dune_bug: {
    shared: [
      { stage: 1, name: '沙丘蟲蛋', minLevel: 1 },
      { stage: 2, name: '沙塵幼蟲', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '岩甲蟻', minLevel: 30 },
      { stage: 4, name: '沙暴巨蜈蚣', minLevel: 60 },
      { stage: 5, name: '最終鋼鐵沙皇蟲', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '掘地蟲', minLevel: 30 },
      { stage: 4, name: '流沙蟻獅', minLevel: 60 },
      { stage: 5, name: '最終沙漠死神蠍', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  sonic_bat: {
    shared: [
      { stage: 1, name: '音波蝠蛋', minLevel: 1 },
      { stage: 2, name: '小耳蝠', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '共鳴蝠', minLevel: 30 },
      { stage: 4, name: '心靈聲波蝠', minLevel: 60 },
      { stage: 5, name: '最終超聲波女皇', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '毒牙蝠', minLevel: 30 },
      { stage: 4, name: '腐蝕音波蝠', minLevel: 60 },
      { stage: 5, name: '最終瘟疫夜魔蝠', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  snow_beast: {
    shared: [
      { stage: 1, name: '雪獸蛋', minLevel: 1 },
      { stage: 2, name: '絨毛小怪', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '冰爪獸', minLevel: 30 },
      { stage: 4, name: '暴雪拳師', minLevel: 60 },
      { stage: 5, name: '最終絕對零度格鬥家', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '雪精靈', minLevel: 30 },
      { stage: 4, name: '冰晶舞者', minLevel: 60 },
      { stage: 5, name: '最終極光雪女皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  circuit_fish: {
    shared: [
      { stage: 1, name: '電路魚蛋', minLevel: 1 },
      { stage: 2, name: '小銅魚', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '電流鰻', minLevel: 30 },
      { stage: 4, name: '高壓電鰻', minLevel: 60 },
      { stage: 5, name: '最終雪暴海龍王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '裝甲魚', minLevel: 30 },
      { stage: 4, name: '深海潛艇魚', minLevel: 60 },
      { stage: 5, name: '最終機械海神鎧', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  mushroom: {
    shared: [
      { stage: 1, name: '蘑菇蛋', minLevel: 1 },
      { stage: 2, name: '小蘑菇', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '拳擊菇', minLevel: 30 },
      { stage: 4, name: '森林守護者', minLevel: 60 },
      { stage: 5, name: '最終森之蘑菇王', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '毒孢菇', minLevel: 30 },
      { stage: 4, name: '腐爛蘑菇怪', minLevel: 60 },
      { stage: 5, name: '最終瘟疫蘑菇皇', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  crystal_beast: {
    shared: [
      { stage: 1, name: '水晶獸蛋', minLevel: 1 },
      { stage: 2, name: '晶體寶寶', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '聖晶獸', minLevel: 30 },
      { stage: 4, name: '光輝獨角獸', minLevel: 60 },
      { stage: 5, name: '最終水晶天馬', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '影晶獸', minLevel: 30 },
      { stage: 4, name: '詛咒石像鬼', minLevel: 60 },
      { stage: 5, name: '最終黑曜石魔像', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  nebula_fish: {
    shared: [
      { stage: 1, name: '星雲魚蛋', minLevel: 1 },
      { stage: 2, name: '太空小魚', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '星系魚', minLevel: 30 },
      { stage: 4, name: '引力海龍', minLevel: 60 },
      { stage: 5, name: '最終宇宙鯨皇', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '黑洞', minLevel: 30 },
      { stage: 4, name: '吞噬海怪', minLevel: 60 },
      { stage: 5, name: '最終深淵星雲獸', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
  clockwork_bird: {
    shared: [
      { stage: 1, name: '發條鳥蛋', minLevel: 1 },
      { stage: 2, name: '機械雛鳥', minLevel: 10 },
    ],
    pathA: [
      { stage: 3, name: '時鐘鷹', minLevel: 30 },
      { stage: 4, name: '精密獵隼', minLevel: 60 },
      { stage: 5, name: '最終時間領主鳶', minLevel: 100 },
    ],
    pathB: [
      { stage: 3, name: '廢鐵鳥', minLevel: 30 },
      { stage: 4, name: '故障鳳凰', minLevel: 60 },
      { stage: 5, name: '最終末日機械鳥', minLevel: 100 },
    ],
    evolutionLevel: 30,
  },
};

// 寵物物種定義（含價格、稀有度、屬性、能力）
export const PET_SPECIES = [
  // Normal 普通
  { species: 'spirit_dog', name: '靈犬', price: 0, rarity: 'normal', description: '忠誠的靈犬，能感知主人的心意', baseType: '一般', pathA: { types: ['一般', '妖精'], name: '聖光靈犬路線' }, pathB: { types: ['一般', '惡'], name: '闇影獵犬路線' }, baseStats: { hp: 75, attack: 60, defense: 55 }, growthRates: { hp: 3.0, attack: 2.5, defense: 2.2 }, ability: { name: '忠犬直覺', desc: '提示不消耗道具機率15%' } },
  { species: 'chick_bird', name: '雛鳥', price: 80, rarity: 'normal', description: '展翅翱翔的小小鳥兒', baseType: '飛行', pathA: { types: ['飛行', '電'], name: '雷電飛鷹路線' }, pathB: { types: ['飛行', '冰'], name: '極地冰鳳路線' }, baseStats: { hp: 60, attack: 70, defense: 45 }, growthRates: { hp: 2.4, attack: 2.8, defense: 1.8 }, ability: { name: '疾風之翼', desc: '答題時間+10%獎勵' } },
  { species: 'beetle', name: '甲蟲', price: 130, rarity: 'normal', description: '堅硬外殼下藏著無限潛能', baseType: '蟲', pathA: { types: ['蟲', '鋼'], name: '鋼鐵甲蟲路線' }, pathB: { types: ['蟲', '超能力'], name: '幻夢蛾路線' }, baseStats: { hp: 70, attack: 65, defense: 70 }, growthRates: { hp: 2.8, attack: 2.6, defense: 2.8 }, ability: { name: '硬殼防禦', desc: '測驗扣分減少10%' } },
  { species: 'electric_mouse', name: '微電鼠', price: 80, rarity: 'normal', description: '帶電的小小鼠，活力十足', baseType: '電', pathA: { types: ['電', '鋼'], name: '賽博電鼠路線' }, pathB: { types: ['電', '草'], name: '真菌雷神路線' }, baseStats: { hp: 55, attack: 75, defense: 40 }, growthRates: { hp: 2.2, attack: 3.0, defense: 1.6 }, ability: { name: '靜電感應', desc: '連對加成額外+5%' } },
  { species: 'hard_crab', name: '硬殼蟹', price: 150, rarity: 'normal', description: '堅如磐石的小螃蟹', baseType: '岩石', pathA: { types: ['岩石', '火'], name: '熔岩蟹路線' }, pathB: { types: ['岩石', '水'], name: '深海蟹路線' }, baseStats: { hp: 80, attack: 55, defense: 80 }, growthRates: { hp: 3.2, attack: 2.2, defense: 3.2 }, ability: { name: '岩石護盾', desc: '每日首次錯誤不扣分' } },
  { species: 'mimic_lizard', name: '擬態蜥', price: 100, rarity: 'normal', description: '善於偽裝的神秘蜥蜴', baseType: '一般', pathA: { types: ['一般', '超能力'], name: '幻象龍路線' }, pathB: { types: ['一般', '格鬥'], name: '格鬥龍路線' }, baseStats: { hp: 65, attack: 65, defense: 60 }, growthRates: { hp: 2.6, attack: 2.6, defense: 2.4 }, ability: { name: '變色偽裝', desc: '隨機獲得雙倍星星10%' } },
  { species: 'seed_ball', name: '種子球', price: 80, rarity: 'normal', description: '充滿生命力的小種子', baseType: '草', pathA: { types: ['草', '火'], name: '太陽神木路線' }, pathB: { types: ['草', '惡'], name: '腐朽魔花路線' }, baseStats: { hp: 70, attack: 55, defense: 60 }, growthRates: { hp: 2.8, attack: 2.2, defense: 2.4 }, ability: { name: '光合作用', desc: '飽足度自然恢復+20%' } },
  { species: 'dune_bug', name: '沙丘蟲', price: 120, rarity: 'normal', description: '在沙漠中穿行的小蟲', baseType: '地面', pathA: { types: ['地面', '鋼'], name: '鋼鐵沙皇路線' }, pathB: { types: ['地面', '蟲'], name: '沙漠死神路線' }, baseStats: { hp: 75, attack: 60, defense: 65 }, growthRates: { hp: 3.0, attack: 2.4, defense: 2.6 }, ability: { name: '沙漠潛行', desc: '測驗後額外獲得1星星' } },
  { species: 'sonic_bat', name: '音波蝠', price: 100, rarity: 'normal', description: '以超音波探索世界的蝙蝠', baseType: '飛行', pathA: { types: ['飛行', '超能力'], name: '超聲波女皇路線' }, pathB: { types: ['飛行', '毒'], name: '瘟疫夜魔路線' }, baseStats: { hp: 60, attack: 70, defense: 50 }, growthRates: { hp: 2.4, attack: 2.8, defense: 2.0 }, ability: { name: '回聲定位', desc: '選擇題錯誤選項高亮一個5%' } },
  { species: 'mushroom', name: '蘑菇', price: 100, rarity: 'normal', description: '可愛的小蘑菇，別小看它', baseType: '草', pathA: { types: ['草', '格鬥'], name: '森之蘑菇王路線' }, pathB: { types: ['草', '毒'], name: '瘟疫蘑菇皇路線' }, baseStats: { hp: 75, attack: 55, defense: 65 }, growthRates: { hp: 3.0, attack: 2.2, defense: 2.6 }, ability: { name: '孢子散播', desc: '快樂度衰減速度-20%' } },
  // Rare 稀有
  { species: 'young_scale', name: '幼鱗', price: 320, rarity: 'rare', description: '古老水龍的後裔', baseType: '水', pathA: { types: ['水', '龍'], name: '深海滄龍路線' }, pathB: { types: ['毒', '地面'], name: '劇毒沼王路線' }, baseStats: { hp: 80, attack: 70, defense: 65 }, growthRates: { hp: 3.2, attack: 2.8, defense: 2.6 }, ability: { name: '龍鱗庇護', desc: '每次進化額外獲得50星星' } },
  { species: 'jellyfish', name: '漂浮水母', price: 250, rarity: 'rare', description: '透明美麗的深海精靈', baseType: '水', pathA: { types: ['水', '妖精'], name: '治癒海靈路線' }, pathB: { types: ['水', '毒'], name: '深淵毒皇路線' }, baseStats: { hp: 70, attack: 60, defense: 70 }, growthRates: { hp: 2.8, attack: 2.4, defense: 2.8 }, ability: { name: '療癒觸手', desc: '餵食效果+30%' } },
  { species: 'ore_giant', name: '礦石巨人', price: 400, rarity: 'rare', description: '由礦物結晶而成的守護者', baseType: '岩石', pathA: { types: ['岩石', '鋼'], name: '鋼鐵巨神路線' }, pathB: { types: ['岩石', '電'], name: '能量晶核路線' }, baseStats: { hp: 90, attack: 65, defense: 85 }, growthRates: { hp: 3.6, attack: 2.6, defense: 3.4 }, ability: { name: '礦脈感知', desc: '商店物品價格-10%' } },
  { species: 'jungle_cub', name: '叢林幼獸', price: 300, rarity: 'rare', description: '叢林中最敏捷的獵手', baseType: '草', pathA: { types: ['草', '格鬥'], name: '叢林霸主路線' }, pathB: { types: ['草', '幽靈'], name: '森林魅影路線' }, baseStats: { hp: 75, attack: 75, defense: 60 }, growthRates: { hp: 3.0, attack: 3.0, defense: 2.4 }, ability: { name: '叢林本能', desc: '答題速度獎勵+15%' } },
  { species: 'snow_beast', name: '雪原獸', price: 380, rarity: 'rare', description: '冰雪中純白的神秘生物', baseType: '冰', pathA: { types: ['冰', '格鬥'], name: '絕對零度格鬥家路線' }, pathB: { types: ['冰', '妖精'], name: '極光雪女皇路線' }, baseStats: { hp: 80, attack: 65, defense: 75 }, growthRates: { hp: 3.2, attack: 2.6, defense: 3.0 }, ability: { name: '冰霜之息', desc: '連錯不超過2題時保護連對紀錄' } },
  { species: 'circuit_fish', name: '電路魚', price: 320, rarity: 'rare', description: '半生物半機械的奇特魚類', baseType: '水', pathA: { types: ['水', '電'], name: '雪暴海龍王路線' }, pathB: { types: ['水', '鋼'], name: '機械海神鎧路線' }, baseStats: { hp: 70, attack: 75, defense: 65 }, growthRates: { hp: 2.8, attack: 3.0, defense: 2.6 }, ability: { name: '電路超載', desc: '經驗值獲取+10%' } },
  { species: 'clockwork_bird', name: '發條鳥', price: 350, rarity: 'rare', description: '精密齒輪驅動的機械鳥', baseType: '鋼', pathA: { types: ['鋼', '飛行'], name: '時間領主鳶路線' }, pathB: { types: ['鋼', '火'], name: '末日機械鳥路線' }, baseStats: { hp: 70, attack: 70, defense: 75 }, growthRates: { hp: 2.8, attack: 2.8, defense: 3.0 }, ability: { name: '精密計時', desc: '測驗計時器+5秒' } },
  // Legendary 傳說
  { species: 'sky_dragon', name: '天空幼龍', price: 800, rarity: 'legendary', description: '翱翔天際的傳說龍族', baseType: '龍', pathA: { types: ['龍', '火'], name: '末日炎龍路線' }, pathB: { types: ['龍', '飛行'], name: '蒼穹風神路線' }, baseStats: { hp: 90, attack: 85, defense: 70 }, growthRates: { hp: 3.6, attack: 3.4, defense: 2.8 }, ability: { name: '龍威', desc: '滿分測驗星星+30%' } },
  { species: 'crystal_beast', name: '水晶獸', price: 900, rarity: 'legendary', description: '由純淨水晶孕育的神獸', baseType: '岩石', pathA: { types: ['岩石', '妖精'], name: '水晶天馬路線' }, pathB: { types: ['岩石', '幽靈'], name: '黑曜石魔像路線' }, baseStats: { hp: 85, attack: 80, defense: 80 }, growthRates: { hp: 3.4, attack: 3.2, defense: 3.2 }, ability: { name: '水晶共鳴', desc: '所有測驗獎勵+15%' } },
  { species: 'nebula_fish', name: '星雲魚', price: 1000, rarity: 'legendary', description: '來自宇宙深處的神秘魚類', baseType: '水', pathA: { types: ['水', '超能力'], name: '宇宙鯨皇路線' }, pathB: { types: ['水', '惡'], name: '深淵星雲獸路線' }, baseStats: { hp: 85, attack: 85, defense: 75 }, growthRates: { hp: 3.4, attack: 3.4, defense: 3.0 }, ability: { name: '星際感知', desc: '所有經驗值+20%' } },
];

// 計算升級所需經驗值
export const getExpForLevel = (level) => level * 50;

// 計算 RPG 數值
export const calculateRpgStats = (species, level) => {
  const speciesInfo = PET_SPECIES.find(s => s.species === species);
  if (!speciesInfo) return { hp: 100, attack: 50, defense: 50 };
  const { baseStats, growthRates } = speciesInfo;
  return {
    hp: Math.floor(baseStats.hp + level * growthRates.hp),
    attack: Math.floor(baseStats.attack + level * growthRates.attack),
    defense: Math.floor(baseStats.defense + level * growthRates.defense),
  };
};

// 取得寵物目前的屬性列表
export const getPetTypes = (species, evolutionPath, stage) => {
  const speciesInfo = PET_SPECIES.find(s => s.species === species);
  if (!speciesInfo) return ['一般'];
  if (stage < 3 || !evolutionPath) return [speciesInfo.baseType];
  const path = evolutionPath === 'A' ? speciesInfo.pathA : speciesInfo.pathB;
  return path ? path.types : [speciesInfo.baseType];
};

// 取得階段列表（根據進化路線）
export const getStagesForPet = (species, evolutionPath) => {
  const stageData = PET_STAGES[species];
  if (!stageData) return [];
  const shared = stageData.shared || [];
  if (!evolutionPath) return shared;
  const pathStages = evolutionPath === 'A' ? stageData.pathA : stageData.pathB;
  return [...shared, ...(pathStages || [])];
};

// 計算當前等級和階段（分支式）
export const calculatePetStatus = (exp, species = 'spirit_dog', evolutionPath = null) => {
  let level = 1;
  let remainingExp = exp;

  while (remainingExp >= getExpForLevel(level) && level < 100) {
    remainingExp -= getExpForLevel(level);
    level++;
  }

  const stageData = PET_STAGES[species] || PET_STAGES.spirit_dog;
  let stage = 1;

  for (const s of (stageData.shared || [])) {
    if (level >= s.minLevel) stage = s.stage;
  }

  if (evolutionPath && stage >= 2) {
    const pathStages = evolutionPath === 'A' ? stageData.pathA : stageData.pathB;
    for (const s of (pathStages || [])) {
      if (level >= s.minLevel) stage = s.stage;
    }
  }

  const needsEvolutionChoice = !evolutionPath && level >= (stageData.evolutionLevel || 30) && stage <= 2;

  return { level, stage, expToNext: getExpForLevel(level), currentExp: remainingExp, needsEvolutionChoice };
};
