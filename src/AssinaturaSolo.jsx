import React, { useEffect, useState } from 'react';
import { atualizarStatusRemoto, listarRegistrosSolo, salvarRegistroSolo } from './storage';
import { NOMES_PLANOS, PRECOS } from './negocio';

export default function AssinaturaSolo({ cliente, onChange, onPlano, configPendente = false }) {
  const [historico, setHistorico] = useState([]);
  const [referencia, setReferencia] = useState('');
  const [recebido, setRecebido] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [validade, setValidade] = useState(new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const plano = cliente.plano || 'completo';

  useEffect(() => {
    let cancelado = false;
    listarRegistrosSolo('pagamento:').then(lista => {
      if (!cancelado) setHistorico(lista.filter(r => r.clienteId === cliente.id).sort((a,b) => b.recebidoEm.localeCompare(a.recebidoEm)));
    }).catch(() => { if (!cancelado) setAviso('Não foi possível carregar os recebimentos. Tente novamente.'); });
    return () => { cancelado = true; };
  }, [cliente.id, refresh]);

  async function registrar(evento) {
    evento.preventDefault();
    if (configPendente) { setAviso("Salve a configuração antes de registrar ou ativar um período pago."); return; }
    if (validade <= recebido) { setAviso('A validade precisa ser posterior ao recebimento.'); return; }
    if (!window.confirm(`Você conferiu o recebimento de R$ ${PRECOS[plano]} no banco? Este registro não efetua uma cobrança.`)) return;
    setBusy(true); setAviso('');
    let registrado = false;
    const validoAte = `${validade}T23:59:59-03:00`;
    try {
      await salvarRegistroSolo(`pagamento:${cliente.id}:${encodeURIComponent(referencia.trim())}`, {
        clienteId: cliente.id, plano, valorCentavos: PRECOS[plano] * 100,
        referencia: referencia.trim(), recebidoEm: `${recebido}T12:00:00-03:00`, validoAte, origem: 'pix-manual',
      }, { novo: true });
      registrado = true;
      await atualizarStatusRemoto(cliente.id, 'active');
      onChange({ status: 'active', paidUntil: validoAte, legacyAccess: false });
      setReferencia(''); setRefresh(n => n + 1);
      setAviso('Recebimento registrado e acesso ativado. A renovação e a suspensão são conferidas por você.');
    } catch (erro) {
      setAviso(registrado ? 'O recebimento foi salvo, mas o acesso não foi ativado. Use “Ativar acesso já pago”; não registre o pagamento novamente.' : erro.code === '23505' ? 'Esta referência já foi registrada. Confira o histórico antes de repetir.' : 'Não foi possível registrar o recebimento. Tente novamente.');
      if (registrado) setRefresh(n => n + 1);
    } finally { setBusy(false); }
  }


  async function ativar() {
    if (configPendente) { setAviso("Salve a configuração antes de ativar o acesso."); return; }
    if (!window.confirm('Confirma que há um período já pago e vigente no histórico?')) return;
    setBusy(true);
    try { await atualizarStatusRemoto(cliente.id, 'active'); onChange({ status: 'active' }); setAviso('Acesso ativado.'); }
    catch { setAviso('Não foi possível ativar o acesso.'); }
    finally { setBusy(false); }
  }

  return <section className="card p-4 flex flex-col gap-3">
    <h2 className="font-semibold">Plano e Pix recebido</h2>
    <label className="text-xs">Plano contratado<select className="w-full border rounded p-2" value={plano} onChange={e => onPlano(e.target.value)}>{Object.entries(NOMES_PLANOS).map(([k,v]) => <option key={k} value={k}>{v} · R$ {PRECOS[k]}/mês</option>)}</select></label>
    <p className="text-xs">Salve a configuração antes de registrar o pagamento. O Pix é combinado diretamente com você e conferido no banco.</p>
    {cliente.paidUntil && <p className="text-xs font-medium">Próxima renovação: {new Date(cliente.paidUntil).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>}
    {cliente.publicId && <form onSubmit={registrar} className="border rounded p-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2"><label className="text-xs">Recebido em<input required type="date" value={recebido} onChange={e => setRecebido(e.target.value)} className="w-full border rounded p-2"/></label><label className="text-xs">Período até<input required type="date" value={validade} onChange={e => setValidade(e.target.value)} className="w-full border rounded p-2"/></label></div>
      <label className="text-xs">Referência do comprovante<input required maxLength={160} value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ex.: PIX-OUTUBRO-001" className="w-full border rounded p-2"/></label>
      <button disabled={busy || configPendente || !referencia.trim()} className="btn btn-primary text-xs">Registrar R$ {PRECOS[plano]} já recebidos</button>
    </form>}
    {historico.length > 0 && <details><summary className="text-xs cursor-pointer">Histórico de recebimentos</summary>{historico.map(r => <p key={r._key} className="text-xs py-2">{new Date(r.recebidoEm).toLocaleDateString('pt-BR')} · R$ {(r.valorCentavos/100).toFixed(2)} · {r.referencia}</p>)}</details>}
    {historico.some(r => new Date(r.validoAte) > new Date()) && cliente.status !== 'active' && <button disabled={busy || configPendente} className="btn btn-outline text-xs" onClick={ativar}>Ativar acesso já pago</button>}
    <p className="text-[11px]">Nesta edição, confira as renovações semanalmente. Após o prazo combinado e 10 dias de tolerância, suspenda o acesso se o cliente não renovar. Cancelamentos e pedidos de alteração são combinados por WhatsApp.</p>
    {aviso && <p role="status" className="text-xs">{aviso}</p>}
  </section>;
}
