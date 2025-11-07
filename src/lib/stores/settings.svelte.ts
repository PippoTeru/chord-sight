/**
 * アプリケーション設定
 */

export type AccidentalNotation = 'sharp' | 'flat';

class Settings {
  accidentalNotation = $state<AccidentalNotation>('sharp');

  constructor() {
    // ローカルストレージから設定を読み込む
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accidentalNotation');
      if (saved === 'sharp' || saved === 'flat') {
        this.accidentalNotation = saved;
      }
    }
  }

  setAccidentalNotation(notation: AccidentalNotation) {
    this.accidentalNotation = notation;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accidentalNotation', notation);
    }
  }
}

export const settings = new Settings();
