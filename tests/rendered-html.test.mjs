import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("contains a complete multilingual card index", async () => {
  const data = JSON.parse(await readFile(new URL("app/card-data.json", root), "utf8"));
  assert.equal(data.length, 100);
  assert.equal(data[0].number, "000");
  assert.equal(data[99].number, "099");
  for (const card of data) {
    assert.match(card.number, /^\d{3}$/);
    for (const language of ["zh", "ja", "en"]) {
      assert.ok(card[language].name.length > 0, `${card.number} missing ${language} name`);
      assert.ok(card[language].effect.length > 0, `${card.number} missing ${language} effect`);
    }
  }
});

test("keeps reviewed Chinese OCR corrections", async () => {
  const data = JSON.parse(await readFile(new URL("app/card-data.json", root), "utf8"));
  const expectedNames = {
    "010": "黄金指南",
    "011": "黄金天平",
    "012": "黄金辞典",
    "022": "机老虎",
    "023": "即兴故事书",
    "026": "七个小矮人",
    "037": "初出茅庐的运动员",
    "038": "初出茅庐的艺术家",
    "039": "初出茅庐的政治家",
    "040": "初出茅庐的音乐家",
    "041": "初出茅庐的飞行员",
    "043": "初出茅庐的赌徒",
    "046": "金粉少女",
    "049": "掌心人鱼",
    "053": "白色甲虫王",
    "059": "即时外语学校",
    "060": "久违的交货",
    "061": "投币检查舱",
    "066": "女巫的瘦身药",
    "070": "疯狂科学家的增肌药",
    "071": "疯狂科学家的费洛蒙",
    "072": "疯狂科学家的整形面具",
    "076": "流浪的红宝石",
    "080": "悬浮石",
    "086": "挫折之弓",
    "091": "模型王",
  };

  for (const [number, expectedName] of Object.entries(expectedNames)) {
    const card = data.find((item) => item.number === number);
    assert.equal(card?.zh.name, expectedName, `${number} has an incorrect Chinese name`);
    assert.doesNotMatch(card?.zh.effect ?? "", /^[A-Za-z]/, `${number} has an English Chinese-description`);
  }
  assert.doesNotMatch(data.find((item) => item.number === "066").zh.name, /^66/);
  assert.equal(data.find((item) => item.number === "080").zh.name, "悬浮石");
  for (const number of ["010", "011", "012", "046"]) {
    const text = JSON.stringify(data.find((item) => item.number === number).zh);
    assert.doesNotMatch(text, /黄全|全粉|全光/, `${number} still contains OCR substitutions for 金`);
  }
});

test("contains 100 full images and 100 thumbnails for each language", async () => {
  for (const language of ["zh", "ja", "en"]) {
    const full = await readdir(new URL(`public/cards/${language}/`, root));
    const thumbs = await readdir(new URL(`public/thumbs/${language}/`, root));
    assert.equal(full.length, 100);
    assert.equal(thumbs.length, 100);
    assert.equal(full[0], "000.webp");
    assert.equal(full[99], "099.webp");
  }
});

test("ships the requested binder interactions", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /CARDS_PER_PAGE = 10/);
  assert.match(page, /finishBookSwipe/);
  assert.match(page, /finishCardSwipe/);
  assert.match(page, /jumpToCard/);
  assert.match(page, /searchResults/);
  assert.match(page, /language-switch/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
