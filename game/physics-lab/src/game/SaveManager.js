// セーブ管理（Phase 5、仕様 §11）。LocalStorage に進行状況を保存する。
// - データバージョンを持ち、検証を通らないデータ（破損・旧版・型違い）は
//   デフォルトに戻して起動を止めない。
// - 保存に失敗してもゲームは継続する（呼び出し側が結果を受け取って通知する）。
// - テスト可能性のため storage を注入できる（既定は localStorage、
//   使えない環境ではメモリ上のダミーに落ちる）。
import { isBetterRank } from './Rank.js';

export const SAVE_KEY = 'physics-lab-save';
export const SAVE_VERSION = 1;

function createMemoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => { entries.set(key, String(value)); },
  };
}

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (error) {
    // アクセス自体が例外になる環境（プライベートモード等）ではメモリに逃がす。
  }
  return createMemoryStorage();
}

export class SaveManager {
  constructor(stageCount, storage = null) {
    this.stageCount = stageCount;
    this.storage = storage ?? defaultStorage();
    this.data = this.load();
  }

  createDefaultData() {
    return { version: SAVE_VERSION, unlockedStageCount: 1, stages: {} };
  }

  // 保存済みデータを検証して読み込む。不正ならデフォルトを返す（例外を投げない）。
  load() {
    let rawText = null;
    try {
      rawText = this.storage.getItem(SAVE_KEY);
    } catch (error) {
      return this.createDefaultData();
    }
    if (!rawText) return this.createDefaultData();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      return this.createDefaultData();
    }
    return this.sanitize(parsed);
  }

  sanitize(parsed) {
    const fallback = this.createDefaultData();
    if (!parsed || typeof parsed !== 'object') return fallback;
    if (parsed.version !== SAVE_VERSION) return fallback;
    const data = this.createDefaultData();
    if (Number.isFinite(parsed.unlockedStageCount)) {
      data.unlockedStageCount = Math.min(
        this.stageCount,
        Math.max(1, Math.floor(parsed.unlockedStageCount)),
      );
    }
    if (parsed.stages && typeof parsed.stages === 'object') {
      for (let index = 0; index < this.stageCount; index += 1) {
        const record = parsed.stages[String(index)];
        if (!record || typeof record !== 'object') continue;
        const clean = {};
        if (Number.isFinite(record.bestTimeSeconds) && record.bestTimeSeconds > 0) {
          clean.bestTimeSeconds = record.bestTimeSeconds;
        }
        if (record.bestRank === 'S' || record.bestRank === 'A' || record.bestRank === 'B') {
          clean.bestRank = record.bestRank;
        }
        if (Number.isFinite(record.bestCrystals) && record.bestCrystals >= 0) {
          clean.bestCrystals = Math.floor(record.bestCrystals);
        }
        if (Object.keys(clean).length > 0) data.stages[String(index)] = clean;
      }
    }
    return data;
  }

  // 保存する。成功したら true、失敗したら false（ゲームは継続する）。
  save() {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch (error) {
      return false;
    }
  }

  isUnlocked(stageIndex) {
    return stageIndex >= 0 && stageIndex < this.data.unlockedStageCount;
  }

  getUnlockedStageCount() {
    return this.data.unlockedStageCount;
  }

  getRecord(stageIndex) {
    return this.data.stages[String(stageIndex)] ?? null;
  }

  // クリアを記録する。ベストタイム/ベストランク/最多クリスタルを更新し、
  // 次ステージを解放する。保存まで行い、結果の要約を返す。
  recordClear(stageIndex, { timeSeconds, crystalsCollected, rank }) {
    const previous = this.getRecord(stageIndex);
    const isNewBestTime = !previous || previous.bestTimeSeconds === undefined
      || timeSeconds < previous.bestTimeSeconds;
    const record = { ...(previous ?? {}) };
    if (isNewBestTime) record.bestTimeSeconds = timeSeconds;
    if (isBetterRank(rank, previous?.bestRank ?? null)) record.bestRank = rank;
    record.bestCrystals = Math.max(previous?.bestCrystals ?? 0, crystalsCollected);
    this.data.stages[String(stageIndex)] = record;

    let unlockedNewStage = false;
    if (stageIndex + 1 < this.stageCount && stageIndex + 1 >= this.data.unlockedStageCount) {
      this.data.unlockedStageCount = stageIndex + 2;
      unlockedNewStage = true;
    }
    const saved = this.save();
    return { record, isNewBestTime, unlockedNewStage, saved };
  }
}
