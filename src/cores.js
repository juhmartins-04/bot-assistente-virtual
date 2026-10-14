// Texto branco ou preto conforme o contraste sobre a cor da marca.
export function luminancia(cor) {
  const segura = /^#[0-9a-f]{6}$/i.test(cor || '') ? cor : '#386951';
  const canais = [1, 3, 5].map(i => parseInt(segura.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
}
export function textoSobreCor(cor) {
  return luminancia(cor) > 0.179 ? '#000000' : '#ffffff';
}
