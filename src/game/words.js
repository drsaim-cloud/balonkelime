// Türkçe kelime listeleri — doğru İ/I/Ş/Ğ/Ç/Ö/Ü imlası
// İ = U+0130 (noktalı büyük İ), I = U+0049 (noktasız büyük I)

export const W4 = [
  'KALE','MASA','KAPI','ELMA','GECE','BABA','ANNE','BULUT','TAVAN',
  'DUVAR','KEMAN','ASLAN','ALTIN','EKMEK','KÖPRÜ','SOKAK','BAHÇE',
  'DANS','UÇAK','GEMİ','TREN','YAPRAK','MEYVE','SAHNE','ROMAN',
  'KALEM','SALON','ORMAN','DALGA','BÖREK','MANTI','KÖFTE','KAVUN',
  'ÜZÜM','BALKON','TAVUK','BALIK','MERMER','GÜMÜŞ','DEMİR','TARAK',
  'AYNA','SABUN','HAVLU','ÇORAP','CEKET','ŞAPKA','ARABA','CADDE',
];

export const W5 = [
  'KANAT','ÇİÇEK','ŞARKI','KİTAP','YUNUS','ELMAS','PEYNİR','SOĞAN',
  'LİMON','SEVGİ','TARİH','DENİZ','NEHİR','KARTAL','TAVŞAN','MÜZİK',
  'SANAT','EKRAN','KLAVYE','ŞİİR','BİLET','GİYSİ','DİKİŞ','BİÇİM',
  'KİRPİ','FİKİR','ÇABUK','YAVAŞ','GÜÇLÜ','BÜYÜK','KÜÇÜK','DOĞRU',
  'YILDIZ','GÜNEŞ','RÜZGAR','BAYKUŞ','BALINA','DOKTOR','SESLİ',
  'KELEBEK','SİNCAP','NERGİS','PAPATYA','YAĞMUR','ŞİMŞEK','MEVSİM',
  'GÖZLEME','BAKLAVA','MUTFAK','HASTANE','GAZETE','PENCERE',
];

export const W6 = [
  'MERDİVEN','KARDEŞ','ARKADAŞ','ÖĞRETMEN','TÜRKÇE','ALFABE',
  'ÇİÇEKLER','ORMANLIK','KARAMELA','ÇİKOLATA','MUHALLEBİ',
  'İSTANBUL','MENEKŞE','GELİN','BİSİKLET','TRAMVAY','FOTOĞRAF',
];

export const W7 = [
  'ÖĞRETMEN','ÇİKOLATA','MUHALLEBİ','KARAMELA','BİSİKLET',
  'FOTOĞRAFLAR','MÜZİSYENLER','OKUYUCULAR',
];

export const WORDS_BY_LEN = { 4: W4, 5: W5, 6: W6, 7: W7 };

export const VOWELS_SET = new Set('AEIİOUÜÖ'.split(''));

const usedWords = new Set();

export function resetUsedWords() {
  usedWords.clear();
}

export function pickWord(roundNum) {
  const minLen = Math.min(7, 4 + Math.floor((roundNum - 1) / 5));
  let pool = (WORDS_BY_LEN[minLen] || W4).filter(w => !usedWords.has(w));
  if (!pool.length) {
    usedWords.clear();
    pool = WORDS_BY_LEN[minLen] || W4;
  }
  const w = pool[Math.floor(Math.random() * pool.length)];
  usedWords.add(w);
  return w;
}
